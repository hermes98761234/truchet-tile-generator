import { useMemo, useState } from 'react'
import { UK } from './i18n'
import { layout, toSvg, type ColourMode, type Options, type TileKind } from './lib/truchet'
import { NumField, SelectField, Shell, download, shareLink, svgToPng, usePersisted, useUi } from './shell'

const REPO = 'truchet-tile-generator'

const PALETTES: Record<string, string[]> = {
  Sunset: ['#f94144', '#f3722c', '#f8961e', '#f9c74f', '#90be6d', '#43aa8b'],
  Ocean: ['#03045e', '#0077b6', '#00b4d8', '#90e0ef', '#caf0f8', '#023e8a'],
  Berry: ['#590d22', '#a4133c', '#c9184a', '#ff4d6d', '#ff758f', '#ffb3c1'],
  Mono: ['#111827', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#4b5563'],
}

const DEFAULTS = {
  kind: 'arcs' as TileKind,
  cols: 16,
  rows: 10,
  cell: 48,
  seed: 2024,
  rotations: 4 as 2 | 4,
  split: 0.25,
  maxDepth: 2,
  lineWidth: 0.16,
  colourMode: 'level' as ColourMode,
  bg: '#fff8ea',
  fg: '#1f2937',
  palette: 'Sunset',
}

export default function App() {
  const ui = useUi(REPO, UK)
  const { t } = ui
  const [s, set] = usePersisted(REPO, DEFAULTS)
  const [copied, setCopied] = useState(false)
  const opts: Options = useMemo(
    () => ({ ...s, cols: Math.max(1, Math.round(s.cols)), rows: Math.max(1, Math.round(s.rows)), maxDepth: Math.round(s.maxDepth), palette: PALETTES[s.palette] ?? PALETTES.Sunset }),
    [s],
  )
  const cells = useMemo(() => layout(opts), [opts])
  const svg = useMemo(() => toSvg(opts, cells), [opts, cells])
  const name = `truchet-${s.kind}-${s.seed}`
  return (
    <Shell title={t('Truchet Tile Generator')} tagline={t('Truchet, Smith arc and diagonal patterns with seeds and export.')} ui={ui} repo={REPO}
      side={
        <>
          <div className="section">
            <SelectField label={t('Tile')} value={s.kind} options={[{ value: 'arcs', label: t('Smith arcs') }, { value: 'triangles', label: t('Classic triangles') }, { value: 'discs', label: t('Quarter discs') }, { value: 'diagonals', label: t('Diagonals') }]} onChange={(kind) => set({ kind })} />
            <div className="grid3">
              <NumField label={t('Columns')} value={s.cols} min={1} max={80} step={1} onChange={(cols) => set({ cols })} />
              <NumField label={t('Rows')} value={s.rows} min={1} max={80} step={1} onChange={(rows) => set({ rows })} />
              <NumField label={t('Cell size (px)')} value={s.cell} min={8} max={200} onChange={(cell) => set({ cell })} />
            </div>
            <div className="grid2">
              <NumField label={t('Seed')} value={s.seed} min={0} max={4294967295} step={1} onChange={(seed) => set({ seed })} />
              <div className="field"><label>&nbsp;</label><button onClick={() => set({ seed: Math.floor(Math.random() * 1e6) })}>{t('Randomise')}</button></div>
            </div>
            <SelectField label={t('Rotations')} value={s.rotations} options={[{ value: 2, label: t('2 (classic)') }, { value: 4, label: t('4 (all)') }]} onChange={(rotations) => set({ rotations })} />
          </div>
          <div className="section">
            <h3>{t('Multi-scale')}</h3>
            <div className="field">
              <label>{t('Split probability')}: {Math.round(s.split * 100)}%</label>
              <input type="range" min={0} max={0.9} step={0.05} value={s.split} onChange={(e) => set({ split: +e.target.value })} />
            </div>
            <NumField label={t('Maximum depth')} value={s.maxDepth} min={0} max={4} step={1} onChange={(maxDepth) => set({ maxDepth })} />
          </div>
          <div className="section">
            <h3>{t('Colours')}</h3>
            {(s.kind === 'arcs' || s.kind === 'diagonals') && <NumField label={t('Line width')} value={s.lineWidth} min={0.02} max={0.5} onChange={(lineWidth) => set({ lineWidth })} />}
            <SelectField label={t('Colour mode')} value={s.colourMode} options={[{ value: 'single', label: t('Single') }, { value: 'level', label: t('By scale') }, { value: 'random', label: t('Random') }]} onChange={(colourMode) => set({ colourMode })} />
            {s.colourMode !== 'single' && <SelectField label={t('Palette')} value={s.palette} options={Object.keys(PALETTES).map((k) => ({ value: k, label: k }))} onChange={(palette) => set({ palette })} />}
            <div className="grid2">
              <div className="field"><label>{t('Background')}</label><input type="color" value={s.bg} onChange={(e) => set({ bg: e.target.value })} /></div>
              <div className="field"><label>{t('Foreground')}</label><input type="color" value={s.fg} onChange={(e) => set({ fg: e.target.value })} /></div>
            </div>
          </div>
          <div className="btnrow noprint">
            <button className="primary" onClick={() => download(`${name}.svg`, svg, 'image/svg+xml')}>{t('Download SVG')}</button>
            <button onClick={() => void svgToPng(svg, opts.cols * opts.cell, opts.rows * opts.cell, 2).then((b) => download(`${name}.png`, b))}>{t('Download PNG')}</button>
            <button onClick={() => { void navigator.clipboard?.writeText(shareLink(s)); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>{copied ? t('Link copied') : t('Copy share link')}</button>
            <button onClick={() => set(DEFAULTS)}>{t('Reset')}</button>
          </div>
        </>
      }
    >
      <div className="box">
        <h3>{t('Preview')}</h3>
        <div className="canvas-box">
          <div className="fit" style={{ width: '100%', lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
        <p className="hint">{t('Tiles: {0}', cells.length)}</p>
      </div>
    </Shell>
  )
}
