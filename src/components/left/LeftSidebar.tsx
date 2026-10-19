import { useState } from 'react'
import { EffectLibrary } from './EffectLibrary'
import { SandboxList } from './SandboxList'
import { PresetList } from './PresetList'

const TABS = [
  { id: 'library', label: 'Effects' },
  { id: 'sandbox', label: 'Sandbox' },
  { id: 'presets', label: 'Presets' },
] as const

export function LeftSidebar() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('library')

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex h-12 shrink-0 items-center border-b border-zinc-800 px-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 border-b-2 py-1.5 font-mono text-sm uppercase tracking-wide transition-colors ${
              tab === t.id ? 'border-zinc-100 text-zinc-100' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'library' && <EffectLibrary />}
      {tab === 'sandbox' && <SandboxList />}
      {tab === 'presets' && <PresetList />}
    </aside>
  )
}
