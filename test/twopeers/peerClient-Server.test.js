import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Hyperswarm from 'hyperswarm'
import NetworkPeers from '../../src/network/peers.js'
import crypto from 'crypto'

describe('Direct Peer Connection Tests', () => {
  let clientPeer
  let serverPeer
  let clientSwarm
  let serverSwarm
  let clientSwarm2
  let clientPeer2
  const mockPublicKey = crypto.randomBytes(32).toString('hex')
  const mockPeerKey = crypto.randomBytes(32).toString('hex')
  let testConfig

  beforeEach(async () => {
    // Create real swarms
    clientSwarm = new Hyperswarm()
    serverSwarm = new Hyperswarm()
    clientSwarm2 = new Hyperswarm()

    // Create client and server peers
    clientPeer = new NetworkPeers({}, clientSwarm) 
    serverPeer = new NetworkPeers({}, serverSwarm)
    clientPeer2 = new NetworkPeers({}, clientSwarm2)

    testConfig = {
      peer1to2: {
        peer1: {
          publicKey: clientPeer.swarm.keyPair.publicKey.toString('hex'),
          client: true
        },
        peer2: {
          publicKey: serverPeer.swarm.keyPair.publicKey.toString('hex'),
          client: false
        },
        peer3: {
          publicKey: clientPeer2.swarm.keyPair.publicKey.toString('hex'),
          client: true
        },
      }
    }

    // make client listen
    clientPeer.peerJoinClient()
    serverPeer.peerJoinClient()
    clientPeer2.peerJoinClient()

    // Server listens for connections
    // console.log(clientPeer.swarm.keyPair)
    let mockServerPeer = {
      publickey: serverPeer.swarm.keyPair.publicKey.toString('hex'),
      live: false,
      value: {
        live: false,
        key: serverPeer.swarm.keyPair.publicKey.toString('hex')
      }
    }
    clientPeer.peerJoin(mockServerPeer)
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
  // call decision path info
  let logicPrepserverStatus = async function (holePunch, info, publicKey) {
    return await holePunch.prepareConnectionInfo(info, publicKey)
  }

  // Listen for connection events on both peers
  let connectionPromise = new Promise(async (resolve) => {
    let connectionCount = 0
    clientPeer.swarm.on('connection', async (conn, info) => {
      console.log('TT Client connection')
      connectionCount++ 
      const publicKeyPeer1 = info.publicKey.toString('hex')
      // Verify info object properties
      expect(info.publicKey).toBeDefined()
      expect(info.publicKey.toString('hex')).toBeDefined()
      expect(info.client).toBeDefined()
      expect(info.topics).toBeDefined()
      expect(info.client).toBe(true)
      

      let logicInfo = await logicPrepserverStatus(clientPeer, info, publicKeyPeer1)
      console.log('TT logic info')
      console.log(logicInfo)
      if (info.client === testConfig.peer1to2.peer1.client) { // peer1 is server
        console.log('TT peer1 logic assertions')
        expect(logicInfo.discoveryTopicInfo.role).toBe('client')
        expect(logicInfo.discoveryTopicInfo.firstTime).toBe(true)
      } else {
        // Either serverStatus is true or there's a topic set
      }
      
      // Resolve when client connection is established
      if (connectionCount === 2) {
        resolve()
      }
    })

    serverPeer.swarm.on('connection', async (conn, info) => {
      console.log('TT Sever connection')
      connectionCount++
      const publicKeyPeer2 = info.publicKey.toString('hex')
      let logicInfo = await logicPrepserverStatus(serverPeer, info, publicKeyPeer2)
      console.log('TT logic info')
      console.log(logicInfo)
      // Verify info object properties
      expect(info.publicKey).toBeDefined()
      expect(info.publicKey.toString('hex')).toBeDefined()
      expect(info.client).toBeDefined()
      expect(info.topics).toBeDefined()
      expect(info.client).toBe(false)
      
      if (info.client === testConfig.peer1to2.peer2.client) { // peer1 is server
        console.log('TT peer1 logic assertions')
        expect(logicInfo.discoveryTopicInfo.role).toBe('server')
        expect(logicInfo.discoveryTopicInfo.firstTime).toBe(true)
      } else {
        // Either serverStatus is true or there's a topic set
      }
      
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



  it('mock already one existing peer and then two new peers connect first time', async () => {
    // Listen for connection events on both peers

    let logicPrepserverStatus = async function (holePunch, info, publicKey) {
      // moock existing peer on server
      let savedPeerNetworkClient = []
      savedPeerNetworkClient.push({
        key: '123456789',
        value: {
          name: 'peerProto',
          publickey: '123456789',
          roletaken: true,
          longterm: true,
          settopic: true,
          topic: '1235811',
          live: false,
          livePeerkey: ''
        }
      })
      holePunch.peerNetwork = savedPeerNetworkClient
      return await holePunch.prepareConnectionInfo(info, publicKey)
    }
      
    // Listen for connection events on both peers
    let connectionPromise = new Promise(async (resolve) => {
      let connectionCount = 0
      clientPeer.swarm.on('connection', async (conn, info) => {
        console.log('TT Client connection')
        connectionCount++ 
        const publicKeyPeer1 = info.publicKey.toString('hex')
        // Verify info object properties
        expect(info.publicKey).toBeDefined()
        expect(info.publicKey.toString('hex')).toBeDefined()
        expect(info.client).toBeDefined()
        expect(info.topics).toBeDefined()
        expect(info.client).toBe(true)
        

        let logicInfo = await logicPrepserverStatus(clientPeer, info, publicKeyPeer1)
        console.log('TT logic info')
        console.log(logicInfo)
        if (info.client === testConfig.peer1to2.peer1.client) { // peer1 is server
          console.log('TT peer1 logic assertions')
          expect(logicInfo.discoveryTopicInfo.role).toBe('client')
          expect(logicInfo.discoveryTopicInfo.firstTime).toBe(true)
        } else {
          // Either serverStatus is true or there's a topic set
        }
        
        // Resolve when client connection is established
        if (connectionCount === 2) {
          resolve()
        }
      })

      serverPeer.swarm.on('connection', async (conn, info) => {
        console.log('TT Sever connection')
        connectionCount++
        const publicKeyPeer2 = info.publicKey.toString('hex')
        let logicInfo = await logicPrepserverStatus(serverPeer, info, publicKeyPeer2)
        console.log('TT logic info')
        console.log(logicInfo)
        // Verify info object properties
        expect(info.publicKey).toBeDefined()
        expect(info.publicKey.toString('hex')).toBeDefined()
        expect(info.client).toBeDefined()
        expect(info.topics).toBeDefined()
        expect(info.client).toBe(false)
        console.log(info.client)
        console.log(testConfig.peer1to2.peer2.client)
        if (info.client === testConfig.peer1to2.peer2.client) { // peer1 is server
          console.log('TT peer1 logic assertions')
          expect(logicInfo.discoveryTopicInfo.role).toBe('server')
          expect(logicInfo.discoveryTopicInfo.firstTime).toBe(true)
        } else {
          // Either serverStatus is true or there's a topic set
        }
        
        if (connectionCount === 2) {
          resolve()
        }
      })
    })

    // Wait for connection to be established
    await connectionPromise


  }, 20000) // 20 second timeout */
})