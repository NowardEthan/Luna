import type { ComponentType } from 'react'
import type { ChatPersonalityId } from '../../lib/chatPersonality'
import { AddonsSection } from './sections/AddonsSection'
import { ConversationSection } from './sections/ConversationSection'
import { DocumentsSection } from './sections/DocumentsSection'
import { McpServersSection } from './sections/McpServersSection'
import { MemorySection } from './sections/MemorySection'
import { AppearanceSection } from './sections/AppearanceSection'
import { CloudSection } from './sections/CloudSection'
import { LlmRuntimeSection } from './sections/LlmRuntimeSection'
import type { LunaThemeId } from '../../lib/lunaThemes'

export type PreferencesSectionId =
  | 'conversation'
  | 'llm'
  | 'appearance'
  | 'documents'
  | 'memory'
  | 'addons'
  | 'mcp'
  | 'cloud'

export type PreferencesSectionDef = {
  id: PreferencesSectionId
}

export const PREFERENCES_SECTIONS: PreferencesSectionDef[] = [
  { id: 'conversation' },
  { id: 'llm' },
  { id: 'appearance' },
  { id: 'documents' },
  { id: 'memory' },
  { id: 'addons' },
  { id: 'mcp' },
  { id: 'cloud' },
]

export type PreferencesSharedProps = {
  disabled?: boolean
  themeId: LunaThemeId
  onThemeChange: (id: LunaThemeId) => void
  streamingEnabled: boolean
  onStreamingChange: (enabled: boolean) => void
  ragEnabled: boolean
  onRagEnabledChange: (v: boolean) => void
  reasoningEnabled: boolean
  onReasoningChange: (v: boolean) => void
  personalityId: ChatPersonalityId
  onPersonalityChange: (id: ChatPersonalityId) => void
  memoryCrossChatEnabled: boolean
  onMemoryCrossChatToggle: () => void
  memoryConversationSearchEnabled: boolean
  onMemoryConversationSearchToggle: () => void
  onNavigateSection?: (id: PreferencesSectionId) => void
  onOpenMarketplace?: () => void
}

export const PREFERENCES_SECTION_COMPONENTS: Record<
  PreferencesSectionId,
  ComponentType<PreferencesSharedProps>
> = {
  conversation: ConversationSection,
  llm: LlmRuntimeSection,
  appearance: AppearanceSection,
  documents: DocumentsSection,
  memory: MemorySection,
  addons: AddonsSection,
  mcp: McpServersSection,
  cloud: CloudSection,
}
