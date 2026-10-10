export type TileKind = 'arcs' | 'triangles' | 'discs' | 'diagonals'
export type ColourMode = 'single' | 'level' | 'random'

export interface Options {
  kind: TileKind
  cols: number
  rows: number
  cell: number
  seed: number
  /** Allowed rotations: 2 gives the classic two-state tiling, 4 all rotations. */
  rotations: 2 | 4
  /** Probability that a cell is split into four smaller cells. */
  split: number
  maxDepth: number
  /** Stroke width as fraction of the cell (arcs/diagonals). */
  lineWidth: number
  colourMode: ColourMode
  bg: string
  fg: string
  palette: string[]
}

export interface Cell {
  x: number
  y: number
  s: number
  rot: number
  level: number
  /** Random value in [0,1) used for colour choice. */
  r: number
}

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function layout(o: Options): Cell[] {
  const rand = mulberry32(o.seed)
  const cells: Cell[] = []
  const place = (x: number, y: number, s: number, level: number) => {
    if (level < o.maxDepth && rand() < o.split) {
      const h = s / 2
      place(x, y, h, level + 1)
      place(x + h, y, h, level + 1)
      place(x, y + h, h, level + 1)
      place(x + h, y + h, h, level + 1)
      return
    }
    cells.push({ x, y, s, rot: Math.floor(rand() * o.rotations), level, r: rand() })
  }
  for (let j = 0; j < o.rows; j++) for (let i = 0; i < o.cols; i++) place(i * o.cell, j * o.cell, o.cell, 0)
  return cells
}

export type P = [number, number]

/** Rotate a point in the unit square by k quarter turns about its centre. */
const rotP = (p: P, k: number): P => {
  let [x, y] = p
  for (let i = 0; i < k; i++) [x, y] = [1 - y, x]
  return [x, y]
}

/** The two arcs of a Smith tile as (centre corner, start midpoint, end midpoint) in the unit square. */
export function arcEnds(rot: number): { c: P; a: P; b: P }[] {
  const base: { c: P; a: P; b: P }[] = [
    { c: [0, 0], a: [0.5, 0], b: [0, 0.5] },
    { c: [1, 1], a: [0.5, 1], b: [1, 0.5] },
  ]
  return base.map(({ c, a, b }) => ({ c: rotP(c, rot), a: rotP(a, rot), b: rotP(b, rot) }))
}

const f = (x: number) => +x.toFixed(3)

function cellPath(o: Options, c: Cell): string {
  const { x, y, s, rot } = c
  const T = (p: P) => `${f(x + p[0] * s)} ${f(y + p[1] * s)}`
  switch (o.kind) {
    case 'triangles': {
      const tri: P[] = [[0, 0], [1, 0], [0, 1]].map((p) => rotP(p as P, rot))
      return `M${T(tri[0])}L${T(tri[1])}L${T(tri[2])}Z`
    }
    case 'diagonals': {
      const [a, b] = rot % 2 === 0 ? [[0, 0], [1, 1]] : [[1, 0], [0, 1]]
      return `M${T(a as P)}L${T(b as P)}`
    }
    case 'arcs':
      return arcEnds(rot)
        .map(({ a, b }) => {
          // quarter circle of radius s/2 around the corner; sweep chosen so the arc bulges away from the corner's far side
          const cross = (a[0] - 0.5) * (b[1] - 0.5) - (a[1] - 0.5) * (b[0] - 0.5)
          return `M${T(a)}A${f(s / 2)} ${f(s / 2)} 0 0 ${cross > 0 ? 0 : 1} ${T(b)}`
        })
        .join('')
    case 'discs':
      return arcEnds(rot)
        .map(({ c: k, a, b }) => {
          const cross = (a[0] - k[0]) * (b[1] - k[1]) - (a[1] - k[1]) * (b[0] - k[0])
          return `M${T(k)}L${T(a)}A${f(s / 2)} ${f(s / 2)} 0 0 ${cross > 0 ? 1 : 0} ${T(b)}Z`
        })
        .join('')
  }
}

function colourOf(o: Options, c: Cell): string {
  if (o.colourMode === 'level') return o.palette[c.level % o.palette.length]
  if (o.colourMode === 'random') return o.palette[Math.floor(c.r * o.palette.length) % o.palette.length]
  return o.fg
}

export function toSvg(o: Options, cells = layout(o)): string {
  const W = o.cols * o.cell
  const H = o.rows * o.cell
  const stroke = o.kind === 'arcs' || o.kind === 'diagonals'
  const groups = new Map<string, string[]>()
  for (const c of cells) {
    const k = colourOf(o, c) + '|' + (stroke ? f(c.s * o.lineWidth) : '')
    const arr = groups.get(k) ?? []
    arr.push(cellPath(o, c))
    groups.set(k, arr)
  }
  const body = [...groups.entries()].map(([k, d]) => {
    const [col, w] = k.split('|')
    return stroke
      ? `<path d="${d.join('')}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="${o.kind === 'diagonals' ? 'square' : 'butt'}"/>`
      : `<path d="${d.join('')}" fill="${col}"/>`
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${o.bg}"/>
<g>
${body.join('\n')}
</g>
</svg>
`
}
