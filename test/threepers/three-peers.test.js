import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Hyperswarm from 'hyperswarm'
import NetworkPeers from '../../src/network/peers.js'
import crypto from 'crypto'

describe('Three Peer Connection Tests', () => {
  let peer1
  let peer2
  let peer3
  let swarm1
  let swarm2
  let swarm3
  let testConfig
  const topic = crypto.randomBytes(32).toString('hex')

  beforeEach(async () => {
    // Create swarms for each peer
    swarm1 = new Hyperswarm()
    swarm2 = new Hyperswarm()
    swarm3 = new Hyperswarm()

    // Create peer instances
    peer1 = new NetworkPeers({}, swarm1)
    peer2 = new NetworkPeers({}, swarm2)
    peer3 = new NetworkPeers({}, swarm3)

    testConfig = {
      peer1to2: {
        peer1: {
          publicKey: peer1.swarm.keyPair.publicKey.toString('hex'),
          client: false
        },
        peer2: {
          publicKey: peer2.swarm.keyPair.publicKey.toString('hex'),
          client: true
        },
      },
      peer1to3: {
        peer1: {
          publicKey: peer1.swarm.keyPair.publicKey.toString('hex'),
          client: false
        },
        peer3: {
          publicKey: peer3.swarm.keyPair.publicKey.toString('hex'),
          client: true
        }
      },
      peer2to3: {
        peer2: {
          publicKey: peer2.swarm.keyPair.publicKey.toString('hex'),
          client: false
        },
        peer3: {
          publicKey: peer3.swarm.keyPair.publicKey.toString('hex'),
          client: true
        }
      }
    }

    // Set up peer1 as the initial listener
    peer1.peerJoinClient()
    peer2.peerJoinClient()
    peer3.peerJoinClient()

    // Set up peer2 and peer3 with mock peer data
    const mockPeer1 = {
      publickey: peer1.swarm.keyPair.publicKey.toString('hex'),
      live: false,
      value: {
        live: false,
        key: peer1.swarm.keyPair.publicKey.toString('hex')
      }
    }
    const mockPeer2  = {
      publickey: peer2.swarm.keyPair.publicKey.toString('hex'),
      live: false,
      value: {
        live: false,
        key: peer2.swarm.keyPair.publicKey.toString('hex')
      }
    }
    peer2.peerJoin(mockPeer1)
    peer3.peerJoin(mockPeer1)
    peer3.peerJoin(mockPeer2)
  }, 20000)

  afterEach(async () => {
    console.log('Cleaning up test environment')
    await Promise.all([
      swarm1.destroy(),
      swarm2.destroy(),
      swarm3.destroy()
    ])
    peer1 = null
    peer2 = null
    peer3 = null
  }, 10000)

  describe('Basic Connection', () => {
    it('should establish star topology connections', async () => {
      // Create connection promises for each peer
      const connectionPromises = [
        new Promise((resolve) => {
          peer1.swarm.on('connection', (conn, info) => {
            // console.log('Peer1 connection:', info)
            expect(info.publicKey).toBeDefined()
            expect(info.client).toBe(testConfig.peer1to2.peer1.client) // Peer1 is server
            resolve()
          })
        }),
        new Promise((resolve) => {
          peer2.swarm.on('connection', (conn, info) => {
            // console.log('Peer2 connection:', info)
            expect(info.publicKey).toBeDefined()
            // expect(info.client).toBe(testConfig.peer1to2.peer1.client) // Peer2 is client when connecting to Peer1
            // Peer2's role depends on which peer it's connecting to
            if (info.publicKey === testConfig.peer1to2.peer1.publicKey) {
              expect(info.client).toBe(true) // Peer2 is client to Peer1
            } else if (info.publicKey === testConfig.peer2to3.peer3.publicKey) {
              expect(info.client).toBe(false) // Peer2 is server to Peer3
            } 
            resolve()
          })
        }),
        new Promise((resolve) => {
          peer3.swarm.on('connection', (conn, info) => {
            // console.log('Peer3 connection:', info)
            expect(info.publicKey).toBeDefined()
            // expect(info.client).toBe(testConfig.peer1to3.peer1.client) // Peer3 is client when connecting to Peer1
            // Peer3's role depends on which peer it's connecting to
            if (info.publicKey === testConfig.peer1to3.peer1.publicKey) {
              expect(info.client).toBe(true) // Peer3 is client to Peer1
            } else if (info.publicKey === testConfig.peer2to3.peer2.publicKey) {
              expect(info.client).toBe(true) // Peer3 is client to Peer2
            }
            resolve()
          })
        })
      ]

      // Wait for all connections to be established
      await Promise.all(connectionPromises)

      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        throw new Error('Connection did not establish within timeout period')
      }, 30000)

      // Clear timeout if connection was successful
      clearTimeout(timeout)
    }, 50000) // 50 second timeout
  })

  // TODO: Add more test cases
  // 1. Verify peer relationships
  // 2. Test message passing
  // 3. Test peer disconnection
  // 4. Test reconnection
})