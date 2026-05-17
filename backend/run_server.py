#!/usr/bin/env python3
"""Arranca o servidor Luna (FastAPI). Uso: python backend/run_server.py"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from luna.main import main

if __name__ == "__main__":
    main()
