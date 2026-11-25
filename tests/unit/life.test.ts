import { describe, expect, it } from 'vitest'
import { lifeStep, RULES } from '../../src/scenes/generative/gameOfLife'

const grid = (w: number, h: number, live: [number, number][]) => {
  const g = new Uint8Array(w * h)
  for (const [x, y] of live) g[y * w + x] = 1
  return g
}
const liveCells = (g: Uint8Array, w: number) => [...g].flatMap((v, i) => (v ? [[i % w, Math.floor(i / w)]] : []))

describe("Conway's Game of Life (B3/S23)", () => {
  it('a blinker oscillates with period 2', () => {
    const w = 5
    const a = grid(w, 5, [[1, 2], [2, 2], [3, 2]])
    const b = new Uint8Array(25)
    lifeStep(a, b, w, 5, RULES.conway)
    expect(liveCells(b, w)).toEqual([[2, 1], [2, 2], [2, 3]])
    const c = new Uint8Array(25)
    lifeStep(b, c, w, 5, RULES.conway)
    expect([...c]).toEqual([...a])
  })
  it('a block is a still life', () => {
    const a = grid(4, 4, [[1, 1], [2, 1], [1, 2], [2, 2]])
    const b = new Uint8Array(16)
    expect(lifeStep(a, b, 4, 4, RULES.conway)).toBe(4)
    expect([...b]).toEqual([...a])
  })
  it('a glider moves one cell diagonally every 4 generations, wrapping around the edges', () => {
    const w = 8
    let a = grid(w, w, [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]])
    let b = new Uint8Array(w * w)
    for (let i = 0; i < 4; i++) {
      lifeStep(a, b, w, w, RULES.conway)
      ;[a, b] = [b, a]
    }
    expect(liveCells(a, w)).toEqual([[2, 1], [3, 2], [1, 3], [2, 3], [3, 3]])
    for (let i = 0; i < 4 * 8; i++) {
      lifeStep(a, b, w, w, RULES.conway)
      ;[a, b] = [b, a]
    }
    expect(liveCells(a, w)).toEqual([[2, 1], [3, 2], [1, 3], [2, 3], [3, 3]]) // back after a full lap of the torus
  })
  it('a lone cell dies, three neighbours give birth', () => {
    const a = grid(5, 5, [[2, 2]])
    const b = new Uint8Array(25)
    expect(lifeStep(a, b, 5, 5, RULES.conway)).toBe(0)
  })
  it('HighLife also gives birth on 6 neighbours', () => {
    const a = grid(5, 5, [[1, 1], [2, 1], [3, 1], [1, 3], [2, 3], [3, 3]])
    const b = new Uint8Array(25)
    lifeStep(a, b, 5, 5, RULES.highlife)
    expect(b[2 * 5 + 2]).toBe(1)
    lifeStep(a, b, 5, 5, RULES.conway)
    expect(b[2 * 5 + 2]).toBe(0)
  })
})
