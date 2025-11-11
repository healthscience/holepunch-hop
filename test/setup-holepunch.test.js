import { describe, it, expect } from 'vitest'
import HolepunchWorker from '../src/index.js'

describe('holepunch initialization', () => {
  it('should initialize without store name', () => {
    const holepunch = new HolepunchWorker()
    expect(holepunch).toBeDefined()
    expect(holepunch.peerStore).toBe('.hop-storage')
  })

  it('should initialize with store name', () => {
    const storeName = 'hop-storage-test'
    const holepunch = new HolepunchWorker(storeName)
    expect(holepunch).toBeDefined()
    expect(holepunch.peerStore).toBe('.' +storeName)
  })
})