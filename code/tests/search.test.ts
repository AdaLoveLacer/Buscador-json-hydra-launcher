import { describe, it, expect } from 'vitest'
import { filterResults } from '../lib/search'

const baseDownloads = [
  { title: 'Skyrim Special Edition', source: 'GOG', uploadDate: '2020-01-01', fileSize: '1 GB', uris: [] },
  { title: "No Man’s Sky", source: 'GOG', uploadDate: '2020-01-02', fileSize: '1 GB', uris: [] },
  { title: 'Star Wars', source: 'GOG', uploadDate: '2020-01-03', fileSize: '1 GB', uris: [] },
  { title: 'Sea of Stars', source: 'GOG', uploadDate: '2020-01-04', fileSize: '1 GB', uris: [] },
]

describe('filterResults', () => {
  it('finds skyrim (exact/substring)', () => {
    const res = filterResults(baseDownloads as any, 'skyrim', 'any')
    expect(res.some((r: any) => r.title.toLowerCase().includes('skyrim'))).toBe(true)
  })

  it('finds sky (partial) including Skyrim and No Man\'s Sky', () => {
    const res = filterResults(baseDownloads as any, 'sky', 'any')
    const titles = res.map((r: any) => r.title)
    expect(titles).toEqual(expect.arrayContaining(['Skyrim Special Edition', "No Man’s Sky"]))
  })

  it('short terms (2 chars) require exact match and return empty when none', () => {
    const res = filterResults(baseDownloads as any, 'st', 'any')
    expect(res.length).toBe(0)
  })

  it('orders by relevance (exact before prefix/contains)', () => {
    const res = filterResults(baseDownloads as any, 'star', 'any')
    expect(res[0].title).toContain('Star Wars')
  })
})
