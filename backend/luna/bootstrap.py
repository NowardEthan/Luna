from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from .config import resolve_data_dir
from .memory.service import ConversationMemoryService
from .rag.service import RagService
from .tools.agent import AgentTools


@dataclass
class LunaServices:
    data_dir: Path
    rag: RagService
    memory: ConversationMemoryService
    agent_tools: AgentTools


def create_services() -> LunaServices:
    data_dir = resolve_data_dir()
    project_root = Path(__file__).resolve().parents[2]
    docs = Path(os.path.expanduser("~/Documents"))

    rag = RagService(data_dir)
    rag.init()
    memory = ConversationMemoryService(data_dir)
    memory.init()
    tools = AgentTools(project_root, documents_dir=docs if docs.is_dir() else None)

    return LunaServices(
        data_dir=data_dir,
        rag=rag,
        memory=memory,
        agent_tools=tools,
    )
