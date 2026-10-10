import { describe, expect, it } from 'vitest'
import { arcEnds, layout, mulberry32, toSvg, type Options } from './truchet'

const base: Options = { kind: 'arcs', cols: 6, rows: 4, cell: 40, seed: 1, rotations: 4, split: 0, maxDepth: 0, lineWidth: 0.2, colourMode: 'single', bg: '#fff', fg: '#000', palette: ['#f00', '#0f0', '#00f'] }

describe('layout', () => {
  it('is deterministic for a seed and changes with another', () => {
    expect(layout(base)).toEqual(layout(base))
    expect(layout({ ...base, seed: 2 })).not.toEqual(layout(base))
  })
  it('fills the grid without subdivision', () => {
    const c = layout(base)
    expect(c).toHaveLength(24)
    expect(c.every((x) => x.s === 40 && x.level === 0)).toBe(true)
  })
  it('multi-scale cells tile the area exactly', () => {
    const c = layout({ ...base, split: 0.6, maxDepth: 3 })
    expect(c.reduce((a, x) => a + x.s * x.s, 0)).toBeCloseTo(6 * 4 * 40 * 40, 6)
    expect(Math.max(...c.map((x) => x.level))).toBeGreaterThan(0)
    expect(Math.min(...c.map((x) => x.s))).toBeGreaterThanOrEqual(5)
  })
  it('rotation count is respected', () => {
    expect(new Set(layout({ ...base, rotations: 2, cols: 20, rows: 20 }).map((x) => x.rot))).toEqual(new Set([0, 1]))
  })
  it('prng is in [0,1)', () => {
    const r = mulberry32(5)
    for (let i = 0; i < 100; i++) expect(r()).toBeLessThan(1)
  })
})

describe('smith arcs', () => {
  it.each([0, 1, 2, 3])('rotation %i uses every side midpoint exactly once', (rot) => {
    const pts = arcEnds(rot).flatMap((a) => [a.a, a.b]).map((p) => p.join(','))
    expect(new Set(pts)).toEqual(new Set(['0.5,0', '1,0.5', '0.5,1', '0,0.5']))
    expect(pts).toHaveLength(4)
  })
  it('rotations 0 and 2 give the same tile, as do 1 and 3', () => {
    const key = (r: number) => arcEnds(r).map((a) => [a.c.join(','), [a.a.join(','), a.b.join(',')].sort().join('/')].join(':')).sort().join(';')
    expect(key(0)).toBe(key(2))
    expect(key(1)).toBe(key(3))
    expect(key(0)).not.toBe(key(1))
  })
})

describe('svg', () => {
  it.each(['arcs', 'triangles', 'discs', 'diagonals'] as const)('%s renders', (kind) => {
    const s = toSvg({ ...base, kind })
    expect(s).toContain('width="240" height="160"')
    expect(s).toContain('<path')
  })
  it('colour by level groups colours', () => {
    const s = toSvg({ ...base, kind: 'triangles', split: 0.5, maxDepth: 2, colourMode: 'level' })
    expect(s).toContain('fill="#f00"')
    expect(s).toContain('fill="#0f0"')
  })
})
