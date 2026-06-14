import i18n from '../../../i18n'

export function getStarterIdeasChat(): string[] {
  return [0, 1, 2].map((i) => i18n.t(`starters.chat_${i}`))
}

export function getStarterIdeasIde(): string[] {
  return [0, 1, 2].map((i) => i18n.t(`starters.ide_${i}`))
}

export function getStarterIdeasFinances(): string[] {
  return [0, 1, 2].map((i) => i18n.t(`starters.finances_${i}`))
}
