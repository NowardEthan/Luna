import {
  CHAT_PERSONALITIES,
  CHAT_PERSONALITY_ORDER,
  isChatPersonalityId,
  type ChatPersonalityId,
} from '../lib/chatPersonality'
import { Select } from './ui/Select'

type Props = {
  value: ChatPersonalityId
  onChange: (id: ChatPersonalityId) => void
  disabled?: boolean
  variant?: 'default' | 'toolbar'
}

export function PersonalityControls({
  value,
  onChange,
  disabled,
  variant = 'default',
}: Props) {
  const options = CHAT_PERSONALITY_ORDER.map((id) => ({
    value: id,
    label: CHAT_PERSONALITIES[id].label,
  }))

  const handleChange = (v: string) => {
    if (isChatPersonalityId(v)) onChange(v)
  }

  if (variant === 'toolbar') {
    return (
      <Select
        id="luna-personality"
        value={value}
        onChange={handleChange}
        options={options}
        disabled={disabled}
        variant="toolbar"
        size="md"
        className="max-w-[8.5rem]"
        align="end"
        aria-label="Perfil de conversa da Luna"
        title={CHAT_PERSONALITIES[value].hint}
      />
    )
  }

  return (
    <div className="flex min-w-0 shrink-0 flex-col items-stretch gap-1 sm:items-end">
      <span className="text-[10px] font-medium uppercase tracking-wide text-fg-muted">
        Perfil
      </span>
      <Select
        id="luna-personality"
        value={value}
        onChange={handleChange}
        options={options}
        disabled={disabled}
        variant="default"
        size="md"
        className="w-full min-w-[8rem] max-w-[11rem] sm:w-auto"
        align="end"
        aria-label="Perfil de conversa da Luna"
        title={CHAT_PERSONALITIES[value].hint}
      />
    </div>
  )
}
