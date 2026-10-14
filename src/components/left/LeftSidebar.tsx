import { useState } from 'react'
import { EffectLibrary } from './EffectLibrary'
import { PresetList } from './PresetList'

export function LeftSidebar() {
  const [tab, setTab] = useState<'library' | 'presets'>('library')

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex h-12 shrink-0 items-center border-b border-zinc-800 px-1">
        {(['library', 'presets'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 border-b-2 py-1.5 font-mono text-sm uppercase tracking-wide transition-colors ${
              tab === t ? 'border-zinc-100 text-zinc-100' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t === 'library' ? 'Effect Library' : 'Presets'}
          </button>
        ))}
      </div>
      {tab === 'library' ? <EffectLibrary /> : <PresetList />}
    </aside>
  )
}
