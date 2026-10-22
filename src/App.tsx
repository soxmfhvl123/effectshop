import { useRef, useState } from 'react'
import { LeftSidebar } from './components/left/LeftSidebar'
import { RightSidebar } from './components/right/RightSidebar'
import { TopToolbar } from './components/center/TopToolbar'
import { BottomBar } from './components/center/BottomBar'
import { Timeline } from './components/center/Timeline'
import { EffectRenderer, type EffectRendererHandle } from './engine/EffectRenderer'

// Kinda Official's sister sites, linked from the header the same way they
// link to each other.
const HEADER_LINKS = [
  { label: 'kindaofficial', href: 'https://kindaofficial.xyz' },
  { label: 'ref-archive', href: 'https://ref-archive.site' },
]

export default function App() {
  const rendererRef = useRef<EffectRendererHandle>(null)
  const [fps, setFps] = useState(0)

  return (
    <div className="flex h-screen w-screen flex-col bg-paper text-ink">
      {/* the Kinda site header: wordmark left, a quiet line in the middle, sister sites right */}
      <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-hairline px-8 py-5">
        <a href="./" className="wordmark justify-self-start">
          EFFECTSHOP
        </a>
        <p className="k-label hidden text-center md:block">realtime WebGL image effect for Kinda official projects</p>
        <nav className="flex gap-6 justify-self-end">
          {HEADER_LINKS.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="k-link">
              {l.label} ↗
            </a>
          ))}
        </nav>
      </header>

      <div className="flex min-h-0 flex-1">
        <LeftSidebar />

        <main className="relative flex min-w-0 flex-1 flex-col">
          <TopToolbar />
          <div className="min-h-0 flex-1">
            <EffectRenderer ref={rendererRef} onFps={setFps} />
          </div>
          <Timeline />
          <BottomBar rendererRef={rendererRef} fps={fps} />
          <div className="edge-mark absolute right-3.5 bottom-24 z-30">© KINDA OFFICIAL — 2026</div>
        </main>

        <RightSidebar />
      </div>
    </div>
  )
}
