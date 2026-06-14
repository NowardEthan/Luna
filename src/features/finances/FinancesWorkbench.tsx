import type { ReactNode } from 'react'
import { ResizableSplit } from '../../components/ui/ResizableSplit'
import { FinancesMainPanel } from './FinancesMainPanel'

type Props = {
  chatPanel: ReactNode
}

/** Layout estilo IDE: dados financeiros à esquerda, chat Luna à direita. */
export function FinancesWorkbench({ chatPanel }: Props) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-canvas">
      <ResizableSplit
        className="min-h-0 flex-1"
        storageKey="finances-chat"
        defaultLeadingSize={520}
        defaultLeadingRatio={0.58}
        minLeading={320}
        minTrailing={300}
        leading={<FinancesMainPanel />}
        trailing={
          <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-l border-line-subtle bg-canvas">
            {chatPanel}
          </div>
        }
      />
    </div>
  )
}
