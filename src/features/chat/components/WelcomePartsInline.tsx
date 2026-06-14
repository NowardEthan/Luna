import type { WelcomeTextPart } from '../contextualChatWelcome'
import { WelcomeFinanceBadge } from './WelcomeFinanceBadge'
import { WelcomeFolderBadge } from './WelcomeFolderBadge'

type Props = {
  parts: WelcomeTextPart[]
  badgeSize?: 'sm' | 'md'
  className?: string
}

export function WelcomePartsInline({ parts, badgeSize = 'md', className }: Props) {
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.type === 'folder') {
          return <WelcomeFolderBadge key={`folder-${part.folder.id}`} folder={part.folder} />
        }
        if (part.type === 'finance') {
          return (
            <WelcomeFinanceBadge
              key={`finance-${i}-${part.kind}-${part.label}`}
              kind={part.kind}
              label={part.label}
              size={badgeSize}
            />
          )
        }
        return <span key={`text-${i}`}>{part.value}</span>
      })}
    </span>
  )
}
