"""Ponto de entrada: python -m luna.main"""

from __future__ import annotations

import uvicorn

from .app import create_app
from .config import HOST, PORT
from .log_buffer import append_log

app = create_app()


def main() -> None:
    append_log("info", "boot", f"A iniciar Luna server Python em http://{HOST}:{PORT}")
    uvicorn.run(app, host=HOST, port=PORT, reload=False, log_level="info")


if __name__ == "__main__":
    main()
