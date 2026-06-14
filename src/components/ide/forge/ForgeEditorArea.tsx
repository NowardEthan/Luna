import { useForgeLayout } from '../../../context/ForgeLayoutContext'
import { ResizableSplit } from '../../ui/ResizableSplit'
import { EditorPanel } from '../EditorPanel'
import { ForgeEditorChrome } from './ForgeEditorChrome'
import { ForgeInlineEditBar } from './ForgeInlineEditBar'

export function ForgeEditorArea() {
  const forge = useForgeLayout()

  const editors = forge.editorSplit ? (
    <ResizableSplit
      className="min-h-0 flex-1"
      storageKey="forge-editor-split"
      defaultLeadingSize={480}
      defaultLeadingRatio={0.5}
      minLeading={240}
      minTrailing={240}
      leading={<EditorPanel pane="primary" />}
      trailing={<EditorPanel pane="secondary" />}
    />
  ) : (
    <EditorPanel pane="primary" />
  )

  return (
    <div className="forge-workbench-editor flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <ForgeInlineEditBar />
      <ForgeEditorChrome>{editors}</ForgeEditorChrome>
    </div>
  )
}
