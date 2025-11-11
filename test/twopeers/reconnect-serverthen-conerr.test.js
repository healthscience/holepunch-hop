import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawn } from 'child_process'
import path from 'path'
import crypto from 'crypto'
import Hyperswarm from 'hyperswarm'
import NetworkPeers from '../../src/network/peers.js'

// Set global test timeout to 10 seconds
const testTimeout = 10000;

describe('peer reconnection', () => {
  let hopProcess
  let clientPeer
  let serverPeer
  let clientSwarm
  let serverSwarm
  let clientPublicKey
  let serverPublicKey
  let savedPeerNetworkClient = []
  let savedPeerNetworkServer = []
  let topicReconnect = ''
  let testConfig
  let peerNetworkMock = []

  beforeEach(async () => {
    // Start HOP server
    const baseHOPStepsUp = path.join(__dirname, '../..')
    // hopProcess = spawn('npm', ['run', 'start'], { stdio: 'inherit', cwd: baseHOPStepsUp })
    // await new Promise((resolve) => setTimeout(resolve, 3000))

    // Initialize peers
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
        },
      }
    }

    const randomString = crypto.randomBytes(32).toString('hex')
    // Convert the random string to a buffer
    const buffer = Buffer.from(randomString, 'hex')
    topicReconnect =  randomString

  }, 10000) // 10 second timeout for setup

  afterEach(async () => {
    console.log('Cleaning up test environment')
    await clientSwarm.destroy()
    await serverSwarm.destroy()
    clientPeer = null
    serverPeer = null
  }, 20000) // 20 second timeout for cleanup

  describe('initial connection and relationship storage', () => {
    it('should save relationship data for reconnection', async () => {
      // make initial connection
      console.log('FIRT TIME CONNECT start')
      let connectionCount = 0
      let mockServerPeer = {
        publickey: clientPeer.swarm.keyPair.publicKey.toString('hex'),
        live: false,
        value: {
          live: false,
          key: clientPeer.swarm.keyPair.publicKey.toString('hex')
        }
      }
      // make client listen
      clientPeer.peerJoinClient()
      // serverPeer.peerJoinClient()
      console.log('start NETWORK plumbing client peer1 and server peer2')
      serverPeer.peerJoin(mockServerPeer)
      // Create connection promise to verify connection details
      let connectionPromise = new Promise((resolve) => {
        clientPeer.swarm.on('connection', (conn, info) => {
          connectionCount++
          // Verify client connection details
          console.log('Client FIRST connection details:')
          expect(info.publicKey).toBeDefined()
          expect(info.publicKey.toString('hex')).toBeDefined()
          expect(info.client).toBe(false)  // Client sees itself as false
          expect(info.topics.length).toBe(0)
          expect(clientPeer.topicHolder['']).toBeUndefined()
          
          // Store connection for verification
          const publicKeyHex = info.publicKey.toString('hex')
          // expect(clientPeer.peerConnect[publicKeyHex]).toBeDefined()
          
          // Save the peer network data for reconnection
          savedPeerNetworkClient.push({
            key: publicKeyHex,
            value: {
              name: 'peer2',
              publickey: publicKeyHex,
              roletaken: true,
              longterm: true,
              settopic: true,
              topic: topicReconnect,
              live: false,
              livePeerkey: ''
            }
          })
          // Resolve when client connection is established
          if (connectionCount === 2) {
            console.log('resolve peer two')
            resolve()
          }
        })

        serverPeer.swarm.on('connection', (conn, info) => {
          console.log('Server FIRST connection details:')
          connectionCount++
          const publicKeyHex2 = info.publicKey.toString('hex')
          // Verify server connection details
          expect(info.publicKey).toBeDefined()
          expect(info.publicKey.toString('hex')).toBeDefined()
          expect(info.client).toBe(true)  // Server sees itself as true
          expect(info.topics.length).toBe(0)
          expect(serverPeer.topicHolder['']).toBeUndefined()

          // Store connection for verification on reconnect
          savedPeerNetworkServer.push({
            key: publicKeyHex2,
            value: {
              name: 'peer1',
              publickey: publicKeyHex2,
              roletaken: false,
              longterm: true,
              settopic: false,
              topic: topicReconnect,
              live: false,
              livePeerkey: ''
            }
          })
          
          // Resolve when server connection is established
          if (connectionCount === 2) {
            console.log('resolve peer two')
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
    }, 50000) // 50 second timeout
  })
  
  describe('reconnection using saved data', async() => {
    it('should use saved relationship data for reconnection', async () => {
      let connectionCount = 0
      console.log('reconnection using saved data')
      let logicPrepserverStatus = async function (holePunch, info, publicKey) {
        return await holePunch.prepareConnectionInfo(info, publicKey)
      }

      // Reconnect using saved peer network data
      clientPeer.setupConnectionBegin(savedPeerNetworkClient)
      
      // Add 3 second delay before starting serverPeer
      await new Promise(resolve => setTimeout(resolve, 3000));
      serverPeer.setupConnectionBegin(savedPeerNetworkServer)

      // Create connection promise to verify reconnection details
      let reconnectionPromise = new Promise(async (resolve) => {
        clientPeer.swarm.on('connection', async (conn, info) => {
          console.log('Client2 RECON connection details:')
          connectionCount++
          // Verify reconnection details
          expect(info.publicKey).toBeDefined()
          expect(info.publicKey.toString('hex')).toBeDefined()
          expect(info.client).toBe(false)  // Client sees itself as false
          expect(info.topics.length).toBe(0)
          expect(clientPeer.topicHolder['']).toBeUndefined()
          


          // Store connection for verification
          const publicKeyHex = info.publicKey.toString('hex')     
          // check logic
          let logicInfo = await logicPrepserverStatus(clientPeer, info)
          // Verify reconnection logic
          if (info.client === testConfig.peer1to2.peer1.client) {
            expect(logicInfo.discoveryTopicInfo.firstTime).toBe(false)
          } else {
            // Either serverStatus is true or there's a topic set
          }


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


          let disconnectCount = 0
          // listen for error
          conn.on('error', data => {
            console.log('error incoming, which peer?')
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
                  resolve()
                }
              }
            }
          })

        })

        serverPeer.swarm.on('connection', async (conn, info) => {
          console.log('Server2 RECON connection details:')
          connectionCount++
          // Verify server reconnection details
          expect(info.publicKey).toBeDefined()
          expect(info.publicKey.toString('hex')).toBeDefined()
          expect(info.client).toBe(true)  // Server sees itself as true
          expect(info.topics.length).toBe(1)
          expect(serverPeer.topicHolder['']).toBeUndefined()
          
          // Store connection for verification
          const publicKeyHex = info.publicKey.toString('hex')
          // expect(serverPeer.peerConnect[publicKeyHex]).toBeDefined()

          // Store connection for later disconnection
          serverPeer.peerConnect = {}
          serverPeer.peerConnect[testConfig.peer1to2.peer1.publicKey] = conn

          // check logic
          let logicInfo = await logicPrepserverStatus(serverPeer, info)
          // Verify reconnection logic
          if (info.client === testConfig.peer1to2.peer2.client) {
            expect(logicInfo.discoveryTopicInfo.firstTime).toBe(false)
          } else {
            // Either serverStatus is true or there's a topic set
          }

          await new Promise(resolve => setTimeout(resolve, 3000))
          if (connectionCount === 2) {
            console.log('resolve peer two server shutdown')
            serverSwarm.destroy()
            serverPeer = null
          }

        })
      })

      // Wait for connection to be established
      await reconnectionPromise
      
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        throw new Error('Connection did not establish within timeout period')
      }, 30000)

      // Clear timeout if connection was successful
      clearTimeout(timeout)
    }, 40000) // 50 second timeout
  })
})