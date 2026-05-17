import {
  CHAT_PERSONALITIES,
  personalitySystemPrefix,
  type ChatPersonalityId,
} from '../lib/chatPersonality'
import { MODEL_SYSTEM_PROMPT } from '../lib/lunaModelSystemPrompt'
import { LUNA_MANIFESTO_SUPPLEMENT } from '../lib/lunaManifesto'
import { MEMORY_TOOL_SYSTEM_SUPPLEMENT } from '../lib/lunaMemoryTools'
import {
  AGENT_CROSS_CHAT_DIGEST_MAX_CHARS,
  AGENT_MEMORY_NOTES_MAX_CHARS,
  buildFullSystemPrompt,
} from '../lib/lunaMemory'
import type { Conversation } from '../types/chat'
import type { UserMemoryState } from '../types/memory'
import { buildLunaTemporalSystemBlock } from '../lib/lunaTemporalContext'
import { CHAT_WORKBENCH_SUPPLEMENT } from './chatWorkbenchSupplement'
import { IDE_SYSTEM_SUPPLEMENT } from './ideSystemSupplement'
import { AGENT_SYSTEM_SUPPLEMENT } from './agentSystemSupplement'
import type { LunaWorkbenchMode } from '../lib/workbenchMode'
export function buildSystemCore(
  personalityId: ChatPersonalityId,
  workbenchMode: LunaWorkbenchMode = 'chat',
  ideContextBlock?: string,
): string {
  let s =
    MODEL_SYSTEM_PROMPT +
    LUNA_MANIFESTO_SUPPLEMENT +
    personalitySystemPrefix(personalityId) +
    buildLunaTemporalSystemBlock() +
    AGENT_SYSTEM_SUPPLEMENT +
    MEMORY_TOOL_SYSTEM_SUPPLEMENT
  if (workbenchMode === 'chat') {
    s += CHAT_WORKBENCH_SUPPLEMENT
  }
  if (workbenchMode === 'ide') {
    s += IDE_SYSTEM_SUPPLEMENT
    if (ideContextBlock?.trim()) {
      s += '\n\n---\n\n' + ideContextBlock.trim()
    }
  }
  return s
}

/** System completo para o turno (sem RAG/recall automático — o agente usa tools). */
export function buildAgentFinalSystem(
  systemCore: string,
  userMemory: UserMemoryState,
  conversations: Conversation[],
  convId: string,
  rollingSummary: string,
): string {
  return buildFullSystemPrompt(
    systemCore,
    userMemory,
    conversations,
    convId,
    rollingSummary,
    '',
    '',
    {
      memoryNotesMaxChars: AGENT_MEMORY_NOTES_MAX_CHARS,
      crossChatMaxChars: AGENT_CROSS_CHAT_DIGEST_MAX_CHARS,
    },
  )
}

export function agentTemperature(personalityId: ChatPersonalityId): number {
  return CHAT_PERSONALITIES[personalityId].temperature
}
