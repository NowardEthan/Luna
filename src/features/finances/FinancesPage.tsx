import type { ReactNode } from 'react'
import { FinancesWorkbench } from './FinancesWorkbench'

type Props = {
  chatPanel: ReactNode
}

/** Vista Finanças com chat integrado (padrão IDE). */
export function FinancesPage({ chatPanel }: Props) {
  return <FinancesWorkbench chatPanel={chatPanel} />
}
