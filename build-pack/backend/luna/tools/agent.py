from __future__ import annotations

import fnmatch
import os
import re
import subprocess
from pathlib import Path

SKIP_DIRS = frozenset(
    {"node_modules", ".git", "dist", "build", ".next", "coverage", "__pycache__"}
)
MAX_READ = 48_000
MAX_GREP_FILES = 4000
MAX_GREP_MATCHES = 150
MAX_GLOB = 300
MAX_CMD_OUT = 32_000
CMD_TIMEOUT = 120
DENY_CMD = re.compile(
    r"\b(rm\s+-rf|del\s+/|format\s+|mkfs|shutdown|reboot|:(){ :|:|>\s*/dev/sd)\b",
    re.I,
)


class AgentTools:
    def __init__(self, project_root: Path, documents_dir: Path | None = None) -> None:
        self.project_root = project_root.resolve()
        self.documents_dir = documents_dir
        self.workspace_root: str | None = None
        self._indexed_folder: str | None = None

    def set_indexed_folder(self, folder: str | None) -> None:
        self._indexed_folder = folder

    def set_workspace_root(self, path: str | None) -> None:
        self.workspace_root = path.strip() if path and path.strip() else None

    def set_workspace_roots(self, paths: list[str] | None) -> None:
        if not paths:
            self.workspace_root = None
            return
        primary = str(paths[0]).strip() if paths[0] else ""
        self.workspace_root = primary or None

    def _allow_roots(self) -> list[Path]:
        roots: list[Path] = []
        if self.workspace_root:
            roots.append(Path(self.workspace_root).resolve())
        roots.append(self.project_root)
        if self.documents_dir:
            roots.append(self.documents_dir.resolve())
        if self._indexed_folder:
            roots.append(Path(self._indexed_folder).resolve())
        uniq: list[Path] = []
        seen: set[str] = set()
        for r in roots:
            s = str(r)
            if s not in seen:
                seen.add(s)
                uniq.append(r)
        return uniq

    def _safe_path(self, requested: str) -> Path | None:
        if not requested or not isinstance(requested, str):
            return None
        req = requested.strip()
        if ".." in req:
            return None

        def _check(candidate: Path) -> Path | None:
            try:
                normalized = candidate.resolve()
            except OSError:
                return None
            low = str(normalized).lower()
            if "\\windows\\" in low or "/etc/" in low or "system32" in low:
                return None
            for root in self._allow_roots():
                try:
                    normalized.relative_to(root)
                    return normalized
                except ValueError:
                    if normalized == root:
                        return normalized
            return None

        direct = _check(Path(req))
        if direct:
            return direct

        ws = self.workspace_root
        if not ws:
            return None
        try:
            ws_path = Path(ws).resolve()
        except OSError:
            return None
        rel = req.lstrip("/\\")
        if not rel:
            return None
        return _check(ws_path / rel)

    def list_directory(self, path: str) -> dict:
        safe = self._safe_path(path) if path.strip() else self._allow_roots()[0]
        if not safe:
            return {"ok": False, "error": "Caminho não permitido."}
        if not safe.is_dir():
            return {"ok": False, "error": "Não é uma pasta."}
        entries = []
        try:
            for ent in sorted(safe.iterdir(), key=lambda p: p.name.lower())[:200]:
                entries.append(
                    {
                        "name": ent.name,
                        "path": str(ent.resolve()),
                        "type": "directory" if ent.is_dir() else "file",
                    }
                )
        except OSError as e:
            return {"ok": False, "error": str(e)}
        return {"ok": True, "path": str(safe), "entries": entries}

    def read_file(self, path: str, max_chars: int | None = None) -> dict:
        safe = self._safe_path(path)
        if not safe or not safe.is_file():
            return {"ok": False, "error": "Ficheiro não permitido ou inexistente."}
        limit = min(int(max_chars or MAX_READ), MAX_READ)
        try:
            text = safe.read_text(encoding="utf-8", errors="replace")[:limit]
        except OSError as e:
            return {"ok": False, "error": str(e)}
        return {"ok": True, "path": str(safe), "content": text}

    def write_file(self, path: str, content: str) -> dict:
        safe = self._safe_path(path)
        if not safe:
            return {"ok": False, "error": "Caminho não permitido."}
        try:
            safe.parent.mkdir(parents=True, exist_ok=True)
            safe.write_text(content, encoding="utf-8")
        except OSError as e:
            return {"ok": False, "error": str(e)}
        return {"ok": True, "path": str(safe)}

    def grep(self, pattern: str, search_path: str | None = None, case_sensitive: bool = False) -> dict:
        root = self._safe_path(search_path) if search_path else self._allow_roots()[0]
        if not root:
            return {"ok": False, "error": "Raiz inválida."}
        flags = 0 if case_sensitive else re.IGNORECASE
        try:
            rx = re.compile(pattern, flags)
        except re.error as e:
            return {"ok": False, "error": f"Padrão inválido: {e}"}
        matches: list[dict] = []
        files = 0
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for name in filenames:
                if files >= MAX_GREP_FILES:
                    break
                fp = Path(dirpath) / name
                files += 1
                try:
                    text = fp.read_text(encoding="utf-8", errors="replace")
                except OSError:
                    continue
                for i, line in enumerate(text.splitlines(), 1):
                    if rx.search(line):
                        matches.append({"path": str(fp), "line": i, "text": line[:500]})
                        if len(matches) >= MAX_GREP_MATCHES:
                            break
            if len(matches) >= MAX_GREP_MATCHES:
                break
        return {"ok": True, "pattern": pattern, "matches": matches, "matchCount": len(matches)}

    def glob(self, pattern: str, search_path: str | None = None) -> dict:
        root = self._safe_path(search_path) if search_path else self._allow_roots()[0]
        if not root:
            return {"ok": False, "error": "Raiz inválida."}
        paths: list[str] = []
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for name in filenames:
                rel = str((Path(dirpath) / name).relative_to(root))
                if fnmatch.fnmatch(rel.replace("\\", "/"), pattern.replace("\\", "/")):
                    paths.append(str(Path(dirpath) / name))
                    if len(paths) >= MAX_GLOB:
                        return {"ok": True, "paths": paths, "matchCount": len(paths), "truncated": True}
        return {"ok": True, "paths": paths, "matchCount": len(paths)}

    def run_command(self, command: str, cwd: str | None = None, gui: bool = False) -> dict:
        if DENY_CMD.search(command):
            return {"ok": False, "error": "Comando bloqueado por segurança."}
        work = self._safe_path(cwd) if cwd else self._allow_roots()[0]
        if not work:
            return {"ok": False, "error": "Diretório inválido."}
        try:
            proc = subprocess.run(
                command,
                shell=True,
                cwd=str(work),
                capture_output=not gui,
                text=True,
                timeout=CMD_TIMEOUT,
            )
        except subprocess.TimeoutExpired:
            return {"ok": False, "error": "Comando expirou (timeout)."}
        except OSError as e:
            return {"ok": False, "error": str(e)}
        if gui:
            return {"ok": True, "exitCode": proc.returncode, "gui": True}
        stdout = (proc.stdout or "")[:MAX_CMD_OUT]
        stderr = (proc.stderr or "")[:MAX_CMD_OUT]
        return {
            "ok": True,
            "exitCode": proc.returncode,
            "stdout": stdout,
            "stderr": stderr,
        }

    def _git(self, args: list[str], repo: str | None) -> dict:
        root = self._safe_path(repo) if repo else self._allow_roots()[0]
        if not root:
            return {"ok": False, "error": "Repositório inválido."}
        try:
            proc = subprocess.run(
                ["git", *args],
                cwd=str(root),
                capture_output=True,
                text=True,
                timeout=60,
            )
        except OSError as e:
            return {"ok": False, "error": str(e)}
        out = (proc.stdout or "") + (proc.stderr or "")
        if proc.returncode != 0 and not out.strip():
            return {"ok": False, "error": f"git {' '.join(args)} falhou."}
        return {"ok": True, "output": out[:MAX_CMD_OUT], "exitCode": proc.returncode}

    def git_status(self, repo: str | None = None) -> dict:
        return self._git(["status", "--short"], repo)

    def git_diff(self, repo: str | None = None, staged: bool = False) -> dict:
        args = ["diff", "--staged"] if staged else ["diff"]
        return self._git(args, repo)

    def git_commit(self, repo: str | None, message: str) -> dict:
        if not message.strip():
            return {"ok": False, "error": "Mensagem de commit vazia."}
        return self._git(["commit", "-m", message], repo)

    async def web_search(self, query: str) -> dict:
        return {"ok": False, "error": "Pesquisa web não implementada no servidor Python (ainda)."}
