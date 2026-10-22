import { useState } from 'react'
import { EFFECT_REGISTRY } from '../../effects/registry'
import { SANDBOX_TOOLS } from '../../effects/sandbox'
import { PRESETS } from '../../presets/presets'
import { EffectLibrary } from './EffectLibrary'
import { SandboxList } from './SandboxList'
import { PresetList } from './PresetList'

const EFFECT_COUNT = EFFECT_REGISTRY.filter((e) => !e.sandbox).length

const TABS = [
  { id: 'library', label: 'EFFECTS', count: EFFECT_COUNT },
  { id: 'sandbox', label: 'SANDBOX', count: SANDBOX_TOOLS.length },
  { id: 'presets', label: 'PRESETS', count: PRESETS.length },
] as const

export function LeftSidebar() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('library')

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-hairline bg-paper">
      {/* the Kinda section nav: upper-case links, each with its count */}
      <nav className="flex shrink-0 gap-7 border-b border-hairline px-5 pt-4 pb-3">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`k-nav ${tab === t.id ? 'is-active' : ''}`}>
            {t.label}
            <sup>{t.count}</sup>
          </button>
        ))}
      </nav>
      {tab === 'library' && <EffectLibrary />}
      {tab === 'sandbox' && <SandboxList />}
      {tab === 'presets' && <PresetList />}
    </aside>
  )
}
