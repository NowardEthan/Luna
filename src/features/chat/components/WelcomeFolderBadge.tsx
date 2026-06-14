import { useLunaBadgeNav } from '../../../context/LunaBadgeNavigation'
import {
  FolderIconView,
  folderColorBorderClass,
} from '../../history/folderVisuals'
import type { WelcomeFolderRef } from '../contextualChatWelcome'

type Props = {
  folder: WelcomeFolderRef
}

export function WelcomeFolderBadge({ folder }: Props) {
  const nav = useLunaBadgeNav()
  const color = folder.color ?? 'default'
  const hint = `Ver pasta «${folder.name}» no histórico`
  const shellClass = `luna-chip inline-flex max-w-[min(100%,14rem)] items-center gap-1 !rounded-full border-l-[3px] !px-2 !py-0.5 align-middle text-[11px] leading-tight ${folderColorBorderClass(color)}`

  const inner = (
    <>
      <span className="flex size-4 shrink-0 items-center justify-center overflow-hidden rounded">
        <FolderIconView folder={folder} size={12} fill={Boolean(folder.customIcon)} />
      </span>
      <span className="truncate">{folder.name}</span>
    </>
  )

  if (nav) {
    return (
      <button
        type="button"
        onClick={() => nav.focusFolder(folder.id)}
        className={`${shellClass} cursor-pointer`}
        title={hint}
        aria-label={hint}
      >
        {inner}
      </button>
    )
  }

  return (
    <span className={shellClass} title={folder.name}>
      {inner}
    </span>
  )
}
