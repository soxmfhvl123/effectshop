import { ActivePipeline } from './ActivePipeline'
import { ParameterInspector } from './ParameterInspector'

export function RightSidebar() {
  return (
    <aside className="flex h-full w-96 shrink-0 flex-col border-l border-zinc-800 bg-zinc-950">
      <ActivePipeline />
      <ParameterInspector />
    </aside>
  )
}
