/*import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import NetworkPeers from '../../src/peers.js'
import crypto from 'crypto'

describe('Server Peer First Time Connection', () => {
  let serverPeer
  let mockSwarm
  let mockStore
  const mockPublicKey = crypto.randomBytes(32).toString('hex')
  const mockPeerKey = crypto.randomBytes(32).toString('hex')
  const mockTopic = crypto.randomBytes(32)

  beforeEach(() => {
    // Mock store with replicate method
    mockStore = {
      get: () => ({})
    }
    mockStore.replicate = vi.fn()

    // Mock swarm with all needed methods
    mockSwarm = {
      join: vi.fn(),
      leave: vi.fn(),
      connect: vi.fn(),
      destroy: vi.fn(),
      on: vi.fn((event, callback) => {
        if (event === 'connection') {
          callback({
            remotePublicKey: mockPeerKey,
            on: vi.fn(),
            write: vi.fn()
          }, {
            publicKey: Buffer.from(mockPublicKey, 'hex'),
            topics: [mockTopic],
            client: false
          })
        }
      })
    }

    // Create server peer instance
    serverPeer = new NetworkPeers(mockStore, mockSwarm)
  })

  afterEach(() => {
    serverPeer = null
    mockSwarm = null
    mockStore = null
    vi.clearAllMocks()
  })

  it('should handle incoming peer connection', async () => {
    // Manually trigger the connection event
    mockSwarm.on.mock.calls[0][1]('connection', {
      remotePublicKey: mockPeerKey,
      on: vi.fn(),
      write: vi.fn()
    }, {
      publicKey: Buffer.from(mockPublicKey, 'hex'),
      topics: [mockTopic],
      client: false
    })

    // Listen for connection
    await new Promise((resolve) => {
      serverPeer.on('connect-warm-first', (data) => {
        expect(data.publickey).toBe(mockPublicKey)
        expect(data.roletaken).toBe('server')
        resolve()
      })
    })

    // Verify peer network was updated
    expect(serverPeer.peerNetwork.length).toBe(1)
    expect(serverPeer.peerNetwork[0].key).toBe(mockPublicKey)
    expect(serverPeer.peerNetwork[0].value.live).toBe(true)
  })

  it('should handle peer connection with invalid data', async () => {
    // Mock incoming connection with invalid data
    const mockConnection = {
      remotePublicKey: mockPeerKey,
      on: (event, callback) => {
        if (event === 'data') {
          // Send invalid JSON
          callback(Buffer.from('invalid json data'))
        }
      },
      write: () => {} // Mock write
    }

    mockSwarm.join = (topic, options, callback) => {
      callback(null, mockConnection)
    }

    // Listen for connection failure
    await new Promise((resolve) => {
      serverPeer.on('peer-share-fail', (key) => {
        expect(key).toBe(mockPeerKey)
        resolve()
      })

      // Simulate network join
      serverPeer.listenNetwork(mockPublicKey)
    })

    // Verify peer network was not updated
    expect(serverPeer.peerNetwork.length).toBe(0)
  })

  it('should handle multiple incoming connections', async () => {
    // Mock multiple incoming connections
    const mockConnections = [
      {
        remotePublicKey: 'mock-peer-key-101',
        on: () => {},
        write: () => {}
      },
      {
        remotePublicKey: 'mock-peer-key-102',
        on: () => {},
        write: () => {}
      }
    ]

    let connectionCount = 0
    mockSwarm.on = (event, callback) => {
      if (event === 'connection') {
        callback(mockConnections[connectionCount])
        connectionCount++
      }
    }

    // Listen for multiple connections
    await new Promise((resolve) => {
      let resolveCount = 0
      const resolveFn = () => {
        resolveCount++
        if (resolveCount === 2) resolve()
      }

      serverPeer.on('connect-warm-first', (data) => {
        expect(data.roletaken).toBe('server')
        resolveFn()
      })

      // Simulate network join twice
      serverPeer.listenNetwork(mockPublicKey)
      serverPeer.listenNetwork(mockPublicKey)
    })

    // Verify peer network has both connections
    expect(serverPeer.peerNetwork.length).toBe(2)
    expect(serverPeer.peerNetwork[0].value.live).toBe(true)
    expect(serverPeer.peerNetwork[1].value.live).toBe(true)
  })
})

*/