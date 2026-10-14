import { useRef, useState } from 'react'
import { LeftSidebar } from './components/left/LeftSidebar'
import { RightSidebar } from './components/right/RightSidebar'
import { TopToolbar } from './components/center/TopToolbar'
import { BottomBar } from './components/center/BottomBar'
import { Timeline } from './components/center/Timeline'
import { EffectRenderer, type EffectRendererHandle } from './engine/EffectRenderer'

export default function App() {
  const rendererRef = useRef<EffectRendererHandle>(null)
  const [fps, setFps] = useState(0)

  return (
    <div className="flex h-screen w-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="flex h-11 shrink-0 items-center border-b border-zinc-800 px-3">
        <span className="font-mono text-sm font-semibold uppercase tracking-[0.2em] text-zinc-200">
          effectshop
        </span>
        <span className="ml-2 font-mono text-xs text-zinc-600">real-time WebGL image effect studio</span>
      </header>

      <div className="flex min-h-0 flex-1">
        <LeftSidebar />

        <main className="flex min-w-0 flex-1 flex-col">
          <TopToolbar />
          <div className="min-h-0 flex-1">
            <EffectRenderer ref={rendererRef} onFps={setFps} />
          </div>
          <Timeline />
          <BottomBar rendererRef={rendererRef} fps={fps} />
        </main>

        <RightSidebar />
      </div>
    </div>
  )
}
