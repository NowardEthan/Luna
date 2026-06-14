from __future__ import annotations

import json
from typing import Any

from fastapi import FastAPI, File, Form, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from .bootstrap import LunaServices, create_services
from .catalog import list_luna_models
from .config import HOST, PORT, resolve_data_dir
from .log_buffer import append_log, get_recent_logs, get_recent_logs_text
from .auth.deps import (
    is_offline_request,
    lunar_auth_context,
    optional_lunar_account,
    require_lunar_account,
)
from .llm.router import llm_chat, llm_chat_stream, llm_embed, llm_vision_describe
from .marketplace.account import list_user_publications
from .marketplace.publish import inspect_addon_zip, publish_marketplace_addon
from .translation.service import translate_text
from .billing.account_delete import delete_lunar_account
from .billing.asaas import (
    AsaasError,
    asaas_configured,
    create_credit_pack_checkout,
    create_subscription_checkout,
    normalize_cpf_cnpj,
)
from .billing.sync import sync_user_billing_from_asaas
from .billing.trial import sync_trial
from .billing.webhook import handle_asaas_webhook, verify_webhook_request

_services: LunaServices | None = None


def get_services() -> LunaServices:
    global _services
    if _services is None:
        _services = create_services()
    return _services


def create_app() -> FastAPI:
    app = FastAPI(title="Luna Server", version="2.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    async def _startup() -> None:
        svc = get_services()
        append_log("ok", "boot", f"Serviços Luna prontos — dados em {svc.data_dir}")

    @app.get("/health")
    @app.head("/health")
    async def health(request: Request) -> Response:
        if request.method == "HEAD":
            return Response(status_code=200)
        return JSONResponse(
            {
                "ok": True,
                "service": "luna-server-python",
                "dataDir": str(resolve_data_dir()),
            }
        )

    @app.get("/v1/diagnostics/logs")
    async def diagnostics_logs(limit: int = 120) -> dict:
        lim = max(10, min(400, limit))
        entries = get_recent_logs(lim)
        return {"ok": True, "lines": entries, "text": get_recent_logs_text(lim)}

    @app.get("/v1/models")
    async def models(request: Request) -> dict:
        uid = optional_lunar_account(request)
        headers = dict(request.headers)
        offline = is_offline_request(headers, None)
        auth_header = str(headers.get("authorization") or "").lower()
        has_bearer = auth_header.startswith("bearer ") and len(auth_header) > 7
        # Com Bearer (sessão Lunar na UI) lista modelos cloud mesmo se verify falhar em dev.
        lunar_cloud = bool(uid) or (has_bearer and not offline)
        return list_luna_models(lunar_cloud=lunar_cloud)

    @app.post("/v1/llm/chat")
    async def chat(request: Request, body: dict) -> JSONResponse:
        auth = lunar_auth_context(request, body)
        if auth["mode"] == "unauthenticated":
            sel_provider = str(body.get("llm_provider") or "").lower()
            if sel_provider and sel_provider != "ollama":
                return JSONResponse(
                    {"ok": False, "error": "Conta Lunar necessária."},
                    status_code=401,
                )
        result = await llm_chat(body, auth["mode"])
        status = 200 if result.get("ok") else 502
        if not result.get("ok") and "Conta Lunar" in str(result.get("error", "")):
            status = 401
        return JSONResponse(result, status_code=status)

    @app.post("/v1/llm/chat/stream")
    async def chat_stream(request: Request, body: dict) -> StreamingResponse:
        import asyncio

        auth = lunar_auth_context(request, body)

        async def generate():
            queue: asyncio.Queue[str | None] = asyncio.Queue()

            def emit(msg: dict) -> None:
                queue.put_nowait(f"data: {json.dumps(msg, ensure_ascii=False)}\n\n")

            async def run_llm():
                try:
                    result = await llm_chat_stream(body, emit, auth["mode"])
                    queue.put_nowait(f"data: {json.dumps({'type': 'done', 'result': result}, ensure_ascii=False)}\n\n")
                except Exception as exc:
                    queue.put_nowait(f"data: {json.dumps({'type': 'error', 'error': str(exc)}, ensure_ascii=False)}\n\n")
                finally:
                    queue.put_nowait(None)  # sentinel

            task = asyncio.create_task(run_llm())

            while True:
                item = await queue.get()
                if item is None:
                    break
                yield item

            await task  # propagate exceptions

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache, no-transform",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    @app.post("/v1/llm/vision")
    async def vision(request: Request, body: dict) -> JSONResponse:
        auth = lunar_auth_context(request, body)
        if auth["mode"] != "cloud":
            return JSONResponse(
                {"ok": False, "error": "Conta Lunar necessária."},
                status_code=401,
            )
        result = await llm_vision_describe(body, auth["mode"])
        return JSONResponse(result, status_code=200 if result.get("ok") else 502)

    @app.post("/v1/translate")
    async def translate(body: dict) -> JSONResponse:
        result = await translate_text(
            str(body.get("text") or ""),
            to=str(body.get("to") or "pt"),
            from_lang=body.get("from") if body.get("from") else None,
        )
        return JSONResponse(result, status_code=200 if result.get("ok") else 502)

    @app.get("/v1/rag/status")
    async def rag_status() -> dict:
        return get_services().rag.get_status()

    @app.delete("/v1/rag")
    async def rag_clear() -> dict:
        return get_services().rag.clear_index()

    @app.post("/v1/rag/index/folder")
    async def rag_index_folder(body: dict) -> JSONResponse:
        folder = str(body.get("folderPath") or body.get("path") or "")
        result = await get_services().rag.index_folder(folder)
        return JSONResponse(result, status_code=200 if result.get("ok") else 400)

    @app.post("/v1/rag/index/files")
    async def rag_index_files(body: dict) -> JSONResponse:
        paths = body.get("filePaths") or []
        if not isinstance(paths, list):
            paths = []
        result = await get_services().rag.index_file_paths(
            [str(p) for p in paths if isinstance(p, str)]
        )
        return JSONResponse(result, status_code=200 if result.get("ok") else 400)

    @app.post("/v1/rag/retrieve")
    async def rag_retrieve(body: dict) -> JSONResponse:
        result = await get_services().rag.retrieve(str(body.get("query") or ""))
        return JSONResponse(result, status_code=200 if result.get("ok") else 400)

    @app.post("/v1/memory/sync")
    async def memory_sync(body: dict) -> dict:
        return await get_services().memory.sync_from_payload(body)

    @app.post("/v1/memory/retrieve")
    async def memory_retrieve(body: dict) -> dict:
        return await get_services().memory.retrieve(str(body.get("query") or ""))

    @app.get("/v1/memory/status")
    async def memory_status() -> dict:
        return get_services().memory.get_status()

    @app.delete("/v1/memory")
    async def memory_clear() -> dict:
        return get_services().memory.clear_index()

    @app.post("/v1/tools/invoke")
    async def tools_invoke(body: dict) -> JSONResponse:
        from .tools.router import invoke_tool

        name = str(body.get("name") or body.get("tool") or "")
        result = invoke_tool(get_services().agent_tools, name, body)
        status = 200 if result.get("ok", True) is not False else 400
        return JSONResponse(result, status_code=status)

    @app.post("/v1/tools/list-directory")
    async def tool_list_dir(body: dict) -> dict:
        return get_services().agent_tools.list_directory(str(body.get("path") or ""))

    @app.post("/v1/tools/read-file")
    async def tool_read(body: dict) -> dict:
        return get_services().agent_tools.read_file(
            str(body.get("path") or ""),
            body.get("max_chars"),
        )

    @app.post("/v1/tools/web-search")
    async def tool_web(request: Request, body: dict) -> dict:
        require_lunar_account(request, body)
        return await get_services().agent_tools.web_search(str(body.get("query") or ""))

    @app.post("/v1/tools/set-workspace-root")
    async def tool_workspace(body: dict) -> dict:
        path = body.get("path")
        get_services().agent_tools.set_workspace_root(
            str(path) if path else None
        )
        return {"ok": True}

    @app.post("/v1/tools/set-workspace-roots")
    async def tool_workspaces(body: dict) -> dict:
        raw = body.get("paths")
        paths = [str(p) for p in raw] if isinstance(raw, list) else []
        get_services().agent_tools.set_workspace_roots(paths)
        return {"ok": True, "paths": paths}

    @app.post("/v1/tools/write-file")
    async def tool_write(body: dict) -> dict:
        return get_services().agent_tools.write_file(
            str(body.get("path") or ""),
            str(body.get("content") or ""),
        )

    @app.post("/v1/tools/grep")
    async def tool_grep(body: dict) -> dict:
        return get_services().agent_tools.grep(
            str(body.get("pattern") or body.get("query") or ""),
            str(body["path"]) if body.get("path") else None,
            case_sensitive=body.get("case_sensitive") is True,
        )

    @app.post("/v1/tools/glob")
    async def tool_glob(body: dict) -> dict:
        return get_services().agent_tools.glob(
            str(body.get("pattern") or ""),
            str(body["path"]) if body.get("path") else None,
        )

    @app.post("/v1/tools/run-command")
    async def tool_run(body: dict) -> dict:
        return get_services().agent_tools.run_command(
            str(body.get("command") or ""),
            str(body["cwd"]) if body.get("cwd") else None,
            gui=body.get("gui") is True,
        )

    @app.post("/v1/tools/git-status")
    async def tool_git_status(body: dict) -> dict:
        return get_services().agent_tools.git_status(
            str(body["path"]) if body.get("path") else None
        )

    @app.post("/v1/tools/git-diff")
    async def tool_git_diff(body: dict) -> dict:
        return get_services().agent_tools.git_diff(
            str(body["path"]) if body.get("path") else None,
            staged=body.get("staged") is True,
        )

    @app.post("/v1/tools/git-commit")
    async def tool_git_commit(body: dict) -> dict:
        return get_services().agent_tools.git_commit(
            str(body["path"]) if body.get("path") else None,
            str(body.get("message") or ""),
        )

    @app.post("/v1/marketplace/inspect")
    async def marketplace_inspect(
        request: Request,
        package: UploadFile = File(...),
    ) -> dict:
        uid = require_lunar_account(request)
        _ = uid
        data = await package.read()
        return inspect_addon_zip(data)

    @app.post("/v1/marketplace/publish")
    async def marketplace_publish(
        request: Request,
        package: UploadFile = File(...),
        listing: str = Form(...),
        profile: str | None = Form(None),
        banner: UploadFile | None = File(None),
        screenshot_0: UploadFile | None = File(None),
        screenshot_1: UploadFile | None = File(None),
        screenshot_2: UploadFile | None = File(None),
    ) -> dict:
        uid = require_lunar_account(request)
        zip_bytes = await package.read()

        banner_bytes = None
        banner_ct = None
        if banner and banner.filename:
            banner_bytes = await banner.read()
            banner_ct = banner.content_type

        screenshot_files: list[tuple[bytes, str | None, str | None]] = []
        for shot in (screenshot_0, screenshot_1, screenshot_2):
            if shot and shot.filename:
                screenshot_files.append(
                    (await shot.read(), shot.content_type, shot.filename)
                )

        return await publish_marketplace_addon(
            uid,
            zip_bytes=zip_bytes,
            listing_json=listing,
            profile_json=profile,
            banner_bytes=banner_bytes,
            banner_content_type=banner_ct,
            screenshot_files=screenshot_files,
        )

    @app.get("/v1/marketplace/my-publications")
    async def marketplace_my_publications(request: Request) -> dict:
        uid = require_lunar_account(request)
        items = list_user_publications(uid)
        return {"ok": True, "uid": uid, "items": items}

    @app.post("/v1/billing/webhook/asaas")
    async def billing_webhook_asaas(request: Request) -> dict:
        verify_webhook_request(request)
        try:
            body = await request.json()
        except Exception:
            body = {}
        if not isinstance(body, dict):
            body = {}
        return await handle_asaas_webhook(body)

    @app.post("/v1/billing/checkout")
    async def billing_checkout(request: Request, body: dict) -> dict:
        uid = require_lunar_account(request)
        plan_id = str(body.get("planId") or body.get("plan_id") or "").strip()
        period = str(body.get("period") or "monthly").strip().lower()
        if period not in ("monthly", "annual"):
            period = "monthly"
        if plan_id not in ("plus", "pro", "byok"):
            return {"ok": False, "error": "Plano inválido para checkout."}
        if not asaas_configured():
            return {"ok": False, "error": "Asaas não configurado no servidor."}

        from .auth.firebase import _ensure_app

        if not _ensure_app():
            return {"ok": False, "error": "Firebase Admin indisponível."}
        try:
            from firebase_admin import auth

            user = auth.get_user(uid)
        except Exception as exc:
            return {"ok": False, "error": f"Utilizador não encontrado: {exc}"}
        email = str(user.email or "").strip()
        if not email:
            return {"ok": False, "error": "Conta sem email — necessário para pagamento."}

        cpf_cnpj = normalize_cpf_cnpj(
            str(body.get("cpfCnpj") or body.get("cpf_cnpj") or "")
        )
        if not cpf_cnpj:
            return {
                "ok": False,
                "error": "Informe CPF ou CNPJ para criar a cobrança.",
            }

        try:
            result = await create_subscription_checkout(
                uid=uid,
                email=email,
                name=user.display_name,
                plan_id=plan_id,
                period=period,
                cpf_cnpj=cpf_cnpj,
            )
        except AsaasError as exc:
            return {"ok": False, "error": str(exc)}

        url = result.get("invoiceUrl")
        if not url:
            return {
                "ok": False,
                "error": "Assinatura criada mas sem link de pagamento — verifica o painel Asaas.",
                "subscriptionId": result.get("subscriptionId"),
            }
        return {
            "ok": True,
            "url": url,
            "subscriptionId": result.get("subscriptionId"),
            "externalReference": result.get("externalReference"),
        }

    @app.post("/v1/billing/sync")
    async def billing_sync(request: Request) -> dict:
        """Reconcilia plano no Firestore com cobranças pagas no Asaas (webhook perdido)."""
        uid = require_lunar_account(request)
        if not asaas_configured():
            return {"ok": False, "error": "Asaas não configurado no servidor."}
        from .auth.firebase import _ensure_app

        if not _ensure_app():
            return {"ok": False, "error": "Firebase Admin indisponível."}
        try:
            from firebase_admin import auth

            user = auth.get_user(uid)
        except Exception as exc:
            return {"ok": False, "error": f"Utilizador não encontrado: {exc}"}
        email = str(user.email or "").strip()
        if not email:
            return {"ok": False, "error": "Conta sem email."}
        try:
            return await sync_user_billing_from_asaas(uid=uid, email=email)
        except AsaasError as exc:
            return {"ok": False, "error": str(exc)}

    @app.post("/v1/billing/trial/sync")
    async def billing_trial_sync(request: Request) -> dict:
        uid = require_lunar_account(request)
        from .auth.firebase import _ensure_app

        if not _ensure_app():
            return {"ok": False, "error": "Firebase Admin indisponível."}
        try:
            return sync_trial(uid)
        except Exception as exc:
            return {"ok": False, "error": str(exc)}

    @app.post("/v1/billing/credit-pack")
    async def billing_credit_pack(request: Request, body: dict) -> dict:
        uid = require_lunar_account(request)
        if not asaas_configured():
            return {"ok": False, "error": "Asaas não configurado no servidor."}
        from .auth.firebase import _ensure_app

        if not _ensure_app():
            return {"ok": False, "error": "Firebase Admin indisponível."}
        try:
            from firebase_admin import auth

            user = auth.get_user(uid)
        except Exception as exc:
            return {"ok": False, "error": f"Utilizador não encontrado: {exc}"}
        email = str(user.email or "").strip()
        if not email:
            return {"ok": False, "error": "Conta sem email — necessário para pagamento."}
        cpf_cnpj = normalize_cpf_cnpj(
            str(body.get("cpfCnpj") or body.get("cpf_cnpj") or "")
        )
        if not cpf_cnpj:
            return {"ok": False, "error": "Informe CPF ou CNPJ para criar a cobrança."}
        try:
            result = await create_credit_pack_checkout(
                uid=uid,
                email=email,
                name=user.display_name,
                cpf_cnpj=cpf_cnpj,
            )
        except AsaasError as exc:
            return {"ok": False, "error": str(exc)}
        url = result.get("invoiceUrl")
        if not url:
            return {
                "ok": False,
                "error": "Cobrança criada mas sem link de pagamento — verifica o painel Asaas.",
                "paymentId": result.get("paymentId"),
            }
        return {
            "ok": True,
            "url": url,
            "paymentId": result.get("paymentId"),
            "externalReference": result.get("externalReference"),
        }

    @app.post("/v1/account/delete")
    async def account_delete(request: Request, body: dict) -> dict:
        uid = require_lunar_account(request)
        if not body.get("confirm"):
            return {"ok": False, "error": "Confirmação obrigatória."}
        from .auth.firebase import _ensure_app

        if not _ensure_app():
            return {"ok": False, "error": "Firebase Admin indisponível."}
        try:
            return delete_lunar_account(uid)
        except Exception as exc:
            return {"ok": False, "error": str(exc)}

    return app
