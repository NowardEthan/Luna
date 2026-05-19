import type { ComponentType } from 'react'
import type { ChatPersonalityId } from '../../lib/chatPersonality'
import { AddonsSection } from './sections/AddonsSection'
import { ConversationSection } from './sections/ConversationSection'
import { DocumentsSection } from './sections/DocumentsSection'
import { McpServersSection } from './sections/McpServersSection'
import { MemorySection } from './sections/MemorySection'
import { AppearanceSection } from './sections/AppearanceSection'
import { CloudSection } from './sections/CloudSection'
import type { LunaThemeId } from '../../lib/lunaThemes'

export type PreferencesSectionId =
  | 'conversation'
  | 'appearance'
  | 'documents'
  | 'memory'
  | 'addons'
  | 'mcp'
  | 'cloud'

export type PreferencesSectionDef = {
  id: PreferencesSectionId
  label: string
  description: string
}

export const PREFERENCES_SECTIONS: PreferencesSectionDef[] = [
  {
    id: 'conversation',
    label: 'Conversa',
    description: 'Pensamento, idioma e personalidade',
  },
  {
    id: 'appearance',
    label: 'Aparência',
    description: 'Tema claro ou escuro',
  },
  {
    id: 'documents',
    label: 'Documentos',
    description: 'RAG e ficheiros locais',
  },
  {
    id: 'memory',
    label: 'Memória',
    description: 'Memória entre conversas',
  },
  {
    id: 'addons',
    label: 'Add-ons',
    description: 'Plugins instalados',
  },
  {
    id: 'mcp',
    label: 'Servidores MCP',
    description: 'Ferramentas externas',
  },
  {
    id: 'cloud',
    label: 'Conta Lunar',
    description: 'Sessão, sync e plano na nuvem',
  },
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
  appearance: AppearanceSection,
  documents: DocumentsSection,
  memory: MemorySection,
  addons: AddonsSection,
  mcp: McpServersSection,
  cloud: CloudSection,
}
