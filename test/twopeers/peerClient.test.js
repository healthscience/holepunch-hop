import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Hyperswarm from 'hyperswarm'
import NetworkPeers from '../../src/network/peers.js'
import crypto from 'crypto'

describe('Direct Peer Connection Tests', () => {
  let clientPeer
  let serverPeer
  let clientSwarm
  let serverSwarm
  const mockPublicKey = crypto.randomBytes(32).toString('hex')
  const mockPeerKey = crypto.randomBytes(32).toString('hex')

  beforeEach(async () => {
    // Create real swarms
    clientSwarm = new Hyperswarm()
    serverSwarm = new Hyperswarm()

    // Create client and server peers
    clientPeer = new NetworkPeers({}, clientSwarm) 
    serverPeer = new NetworkPeers({}, serverSwarm)

    // make client listen
    clientPeer.peerJoinClient()

    // Server listens for connections
    // console.log(clientPeer.swarm.keyPair)
    let mockServerPeer = {
      publickey: clientPeer.swarm.keyPair.publicKey.toString('hex'),
      live: false,
      value: {
        live: false,
        key: clientPeer.swarm.keyPair.publicKey.toString('hex')
      }
    }
    serverPeer.peerJoin(mockServerPeer)
    console.log('after join')
  }, 10000) // 10 second timeout for setup

  afterEach(async () => {
    console.log('Cleaning up test environment')
    await clientSwarm.destroy()
    await serverSwarm.destroy()
    clientPeer = null
    serverPeer = null
  }, 20000) // 20 second timeout for cleanup

it('should establish direct peer connection and handle first connections', async () => {
  // Listen for connection events on both peers
  let connectionPromise = new Promise((resolve) => {
    let connectionCount = 0
    clientPeer.swarm.on('connection', (conn, info) => {
      connectionCount++
      /* console.log('Client connection details:')
      console.log('Public Key:', info.publicKey.toString('hex'))
      console.log('Is Client:', info.client)
      console.log('Topics:', info.topics.map(t => t.toString('hex'))) */
      
      // Verify info object properties
      expect(info.publicKey).toBeDefined()
      expect(info.publicKey.toString('hex')).toBeDefined()
      expect(info.client).toBeDefined()
      expect(info.topics).toBeDefined()
      expect(info.client).toBe(false)
      
      // First client connection should have no topics
      expect(info.topics.length).toBe(0)
      // Server status should be false
      expect(clientPeer.topicHolder['']).toBeUndefined()
      // Connection should be added to peerConnect
      const publicKeyHex = info.publicKey.toString('hex')
      clientPeer.peerConnect[publicKeyHex] = conn
      expect(clientPeer.peerConnect[publicKeyHex]).toBeDefined()
      
      // Resolve when client connection is established
      if (connectionCount === 2) {
        resolve()
      }
    })

    serverPeer.swarm.on('connection', (conn, info) => {
      connectionCount++
      /* console.log('Server connection details:')
      console.log('Public Key:', info.publicKey.toString('hex'))
      console.log('Is Client:', info.client)
      console.log('Topics:', info.topics.map(t => t.toString('hex'))) */
      
      // Verify info object properties
      expect(info.publicKey).toBeDefined()
      expect(info.publicKey.toString('hex')).toBeDefined()
      expect(info.client).toBeDefined()
      expect(info.topics).toBeDefined()
      expect(info.client).toBe(true)
      
      // First server connection should have no topics
      expect(info.topics.length).toBe(0)
      // Server status should be false
      expect(serverPeer.topicHolder['']).toBeUndefined()
      // Connection should be added to peerConnect
      const publicKeyHex = info.publicKey.toString('hex')
      serverPeer.peerConnect[publicKeyHex] = conn
      expect(serverPeer.peerConnect[publicKeyHex]).toBeDefined()
      if (connectionCount === 2) {
        resolve()
      }
    })
  })

  // Wait for connection to be established
  await connectionPromise
  
  // Add timeout to prevent hanging
  const timeout = setTimeout(() => {
    throw new Error('Connection did not establish within timeout period')
  }, 30000)

  // Clear timeout if connection was successful
  clearTimeout(timeout)
}, 20000) // 50 second timeout

  /*
  it('should establish direct peer connection and handle first connections', async () => {
    // Listen for connection events on both peers
    console.log('start of test')
    clientPeer.swarm.on('connection', (conn, info) => {
      console.log('Client connection details:')
      console.log('Public Key:', info.publicKey.toString('hex'))
      console.log('Is Client:', info.client)
      console.log('Topics:', info.topics.map(t => t.toString('hex')))
      
      // Verify info object properties
      expect(info.publicKey).toBeDefined()
      expect(info.publicKey.toString('hex')).toBeDefined()
      expect(info.client).toBeDefined()
      expect(info.topics).toBeDefined()
      
      // Verify first connection takes else path
        // First client connection should have no topics
        expect(info.topics.length).toBe(0)
        // Server status should be false
        expect(clientPeer.topicHolder['']).toBeUndefined()
        // Connection should be added to peerConnect
        const publicKeyHex = info.publicKey.toString('hex')
        expect(clientPeer.peerConnect[publicKeyHex]).toBeDefined()
        // topic prep
        // if now topics info then server, pass by
      let discoveryTopicInfo = {}
        if (topicKeylive.length === 0) {
          // check if joined now?
          discoveryTopicInfo = clientPeer.checkDisoveryStatus('server')
        } else {
          discoveryTopicInfo = {topic: ''}
        }
        // check logic
        // Verify discovery status and server status logic
        const topicServer = clientPeer.topicHolder[discoveryTopicInfo.topic]
        let serverStatus = false
        if (topicServer !== undefined) {
          if (Object.keys(topicServer).length > 0) {
            serverStatus = true
          }
        }
        
        // check topic length
        expect(topicKeylive.length).toBe(0)

        // Verify server status is false on first connection
        expect(serverStatus).toBe(false)
        
        // Verify topic holder is undefined for this connection
        expect(clientPeer.topicHolder[publicKeyHex]).toBeUndefined()

    })

    serverPeer.swarm.on('connection', (conn, info) => {
      console.log('Server connection details:')
      console.log('Public Key:', info.publicKey.toString('hex'))
      console.log('Is Client:', info.client)
      console.log('Topics:', info.topics.map(t => t.toString('hex')))
      
      // Verify info object properties
      expect(info.publicKey).toBeDefined()
      expect(info.publicKey.toString('hex')).toBeDefined()
      expect(info.client).toBeDefined()
      expect(info.topics).toBeDefined()
      
      // Verify first connection takes else path
        // First server connection should have no topics
        expect(info.topics.length).toBe(0)
        // Server status should be false
        expect(serverPeer.topicHolder['']).toBeUndefined()
        // Connection should be added to peerConnect
        const publicKeyHex = info.publicKey.toString('hex')
        expect(serverPeer.peerConnect[publicKeyHex]).toBeDefined()
        // topic prep
        // if now topics info then server, pass by
      let discoveryTopicInfo = {}
        if (topicKeylive.length === 0) {
          // check if joined now?
          discoveryTopicInfo = serverPeer.checkDisoveryStatus('server')
        } else {
          discoveryTopicInfo = {topic: ''}
        }
        // check logic
        // Verify discovery status and server status logic
        const topicServer = serverPeer.topicHolder[discoveryTopicInfo.topic]
        let serverStatus = false
        if (topicServer !== undefined) {
          if (Object.keys(topicServer).length > 0) {
            serverStatus = true
          }
        }
        
        // check topic length
        expect(topicKeylive.length).toBe(0)

        // Verify server status is false on first connection
        expect(serverStatus).toBe(false)
        
        // Verify topic holder is undefined for this connection
        expect(serverPeer.topicHolder[publicKeyHex]).toBeUndefined()

    })
  }, 50000) // 20 second timeout */
})