import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Hyperswarm from 'hyperswarm'
import NetworkPeers from '../../src/network/peers.js'
import crypto from 'crypto'

// Set global test timeout to 10 seconds
const testTimeout = 10000;

describe('Peer Disconnection Tests', () => {
  let clientPeer
  let serverPeer
  let clientSwarm
  let serverSwarm
  let testConfig
  let peerNetworkMock = []

  beforeEach(async () => {
    // Create real swarms
    clientSwarm = new Hyperswarm()
    serverSwarm = new Hyperswarm()

    // Create client and server peers
    clientPeer = new NetworkPeers({}, clientSwarm)
    serverPeer = new NetworkPeers({}, serverSwarm)

    testConfig = {
      peer1to2: {
        peer1: {
          publicKey: clientPeer.swarm.keyPair.publicKey.toString('hex'),
          client: true
        },
        peer2: {
          publicKey: serverPeer.swarm.keyPair.publicKey.toString('hex'),
          client: false
        }
      }
    }

  
    // Set up initial connection
    clientPeer.peerJoinClient()
    serverPeer.peerJoinClient()

    // Create mock server peer for client to connect to
    const mockServerPeer = {
      publickey: serverPeer.swarm.keyPair.publicKey.toString('hex'),
      live: false,
      value: {
        live: false,
        key: serverPeer.swarm.keyPair.publicKey.toString('hex')
      }
    }
    clientPeer.peerJoin(mockServerPeer)

    // Wait for initial setup
    await new Promise(resolve => setTimeout(resolve, 1000))
  }, 10000)

  afterEach(async () => {
    console.log('Cleaning up test environment')
    await Promise.all([
      clientSwarm.destroy(),
      serverSwarm.destroy()
    ])
    clientPeer = null
    serverPeer = null
  }, 10000)

  describe('First-time connection and disconnection', () => {
    it('should handle first-time connection and proper disconnection', async () => {
      let connectionCount = 0
      let disconnectCount = 0

      // Track connection
      const connectionPromise = new Promise((resolve) => {
        clientPeer.swarm.on('connection', (conn, info) => {
          connectionCount++
          console.log('Client connection:')
          expect(info.publicKey).toBeDefined()
          expect(info.client).toBe(true)
          expect(info.topics.length).toBe(0)
          
          // Store connection for later disconnection
          clientPeer.connection = conn
          


          clientPeer.peerConnect = {}
          clientPeer.peerConnect[testConfig.peer1to2.peer2.publicKey] = conn

          peerNetworkMock.push({
            key: testConfig.peer1to2.peer2.publicKey,
            value: {
              name: 'peer2',
              publickey: testConfig.peer1to2.peer2.publicKey,
              roletaken: true,
              longterm: true,
              settopic: true,
              topic: 'letitbe',
              live: false,
              livePeerkey: testConfig.peer1to2.peer2.publicKey
            }
          })

          // listen for error
          conn.on('error', data => {
            let disconnectCount = 0
            console.log('error incoming client, which peer?')
            disconnectCount++
            expect(info).toBeDefined()
            expect(info.publicKey).toBeDefined()
            expect(info.publicKey.toString('hex')).toBe(testConfig.peer1to2.peer2.publicKey)
            // match to peer info. and inform beebee ui
            let connectLivekeys = Object.keys(clientPeer.peerConnect)
            for (let peer of peerNetworkMock) {
              for (let pconn of connectLivekeys) {
                if (peer.value.livePeerkey === pconn) {
                  // check if connect is close?
                  // let keysNoise = Object.keys(serverPeer.peerConnect[pconn]['noiseStream']['_writableState']['stream']['_writableState']['stream']['_writableState']['stream']['_writableState']['stream']['rawStream']['_closed'])
                  // console.log(this.peerConnect[pconn]['noiseStream']['_writableState']['stream']['_writableState']['stream']['_writableState']['stream']['_writableState']['stream']['rawStream']['_closed'])
                  let closeStatus = clientPeer.peerConnect[pconn]['noiseStream']['_writableState']['stream']['_writableState']['stream']['_writableState']['stream']['_writableState']['stream']['rawStream']['_closed']
                  expect(closeStatus).toBe(true)
                }
              }
            }
            
            // Verify disconnection info
            if (disconnectCount === 1) {
              console.log('resolve finish')
              resolve()
            }
          })

        })
      })

      // Track server connection
      const serverConnectionPromise = new Promise((resolve) => {
        serverPeer.swarm.on('connection', (conn, info) => {
          connectionCount++
          console.log('Server connection:')
          expect(info.publicKey).toBeDefined()
          expect(info.publicKey).toBeDefined()
          // Server sees itself as false
          expect(info.client).toBe(false)
          expect(info.topics.length).toBe(0)
          
          // Store connection for later disconnection
          serverPeer.peerConnect = {}
          serverPeer.peerConnect[testConfig.peer1to2.peer1.publicKey] = conn

          if (connectionCount === 2) {
            console.log('server count disconnecting')
            serverSwarm.destroy()
            serverPeer = null
            resolve()
          }

        })
      })

      // Wait for both connections to be established
      await Promise.all([connectionPromise, serverConnectionPromise])

    }, 50000)
  }) 
})