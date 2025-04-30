import { describe, it, expect } from 'vitest'
import HolepunchWorker from '../src/index.js'

class MockWebSocket {
  constructor() {
    this.sentMessages = []
  }
  
  send(data) {
    this.sentMessages.push(data)
  }
  
  close() {}
}

describe('holepunch initialization', () => {
  it('should initialize without store name', async () => {
    const holepunch = new HolepunchWorker()
    expect(holepunch).toBeDefined()
    expect(holepunch.peerStore).toBe('.hop-storage')
  })

  it('should initialize with store name', async () => {
    // setup mock websocket
    const mockWs = new MockWebSocket()
    // setup store
    const storeName = 'hop-storage-test'
    const holepunch = new HolepunchWorker(storeName)
    // Add timeout to prevent hanging
    console.log('start stores')
    // Wait for 3 seconds before proceeding
    await new Promise(resolve => setTimeout(resolve, 3000))
    console.log('end stores')
    expect(holepunch).toBeDefined()
    holepunch.setWebsocket(mockWs)
    expect(holepunch.peerStore).toBe('.' + storeName)
    await holepunch.startStores()
    holepunch.on('hcores-active', () => {
      // count number of bee stores
      console.log('bees')
      console.log(holepunch.BeeData.activeBees) 
    })

  })
})