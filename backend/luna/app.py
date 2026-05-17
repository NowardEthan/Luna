from __future__ import annotations

import json
from typing import Any

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from .bootstrap import LunaServices, create_services
from .catalog import list_luna_models
from .config import HOST, PORT, resolve_data_dir
from .log_buffer import append_log, get_recent_logs, get_recent_logs_text
from .llm.router import llm_chat, llm_chat_stream, llm_vision_describe
from .translation.service import translate_text

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
    async def models() -> dict:
        return list_luna_models()

    @app.post("/v1/llm/chat")
    async def chat(body: dict) -> JSONResponse:
        result = await llm_chat(body)
        status = 200 if result.get("ok") else 502
        return JSONResponse(result, status_code=status)

    @app.post("/v1/llm/chat/stream")
    async def chat_stream(body: dict) -> StreamingResponse:
        async def generate():
            events: list[dict] = []

            def emit(msg: dict) -> None:
                events.append(msg)

            result = await llm_chat_stream(body, emit)
            for evt in events:
                yield f"data: {json.dumps(evt, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'result': result}, ensure_ascii=False)}\n\n"

        return StreamingResponse(generate(), media_type="text/event-stream")

    @app.post("/v1/llm/vision")
    async def vision(body: dict) -> JSONResponse:
        result = await llm_vision_describe(body)
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
    async def tool_web(body: dict) -> dict:
        return await get_services().agent_tools.web_search(str(body.get("query") or ""))

    @app.post("/v1/tools/set-workspace-root")
    async def tool_workspace(body: dict) -> dict:
        path = body.get("path")
        get_services().agent_tools.set_workspace_root(
            str(path) if path else None
        )
        return {"ok": True}

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

    return app
