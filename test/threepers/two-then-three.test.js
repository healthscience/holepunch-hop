import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Hyperswarm from 'hyperswarm'
import NetworkPeers from '../../src/peers.js'
import crypto from 'crypto'

describe('Three Peer Connection Tests', () => {
  let peer1
  let peer2
  let peer3
  let swarm1
  let swarm2
  let swarm3
  let testConfig
  let savedPeerNetworkClient = []
  let savedPeerNetworkServer = []
  let topicReconnect = ''
  let topicReconnect13 = ''

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

    const randomString = crypto.randomBytes(32).toString('hex')
    // Convert the random string to a buffer
    const buffer = Buffer.from(randomString, 'hex')
    topicReconnect =  randomString

    const randomString13 = crypto.randomBytes(32).toString('hex')
    // Convert the random string to a buffer
    const buffer13 = Buffer.from(randomString13, 'hex')
    topicReconnect13 =  randomString

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

      // Set up peer1 as the initial listener
      peer1.peerJoinClient()
      peer2.peerJoinClient()
      // peer3.peerJoinClient()

      // Set up peer2 and peer3 with mock peer data
      const mockPeer1 = {
        publickey: peer1.swarm.keyPair.publicKey.toString('hex'),
        live: false,
        value: {
          live: false,
          key: peer1.swarm.keyPair.publicKey.toString('hex')
        }
      }
      peer2.peerJoin(mockPeer1)
      // Create connection promises for each peer
      const connectionPromises = [
        new Promise((resolve) => {
          peer1.swarm.on('connection', (conn, info) => {
            console.log('Peer1 FIRST connection:')
            expect(info.publicKey).toBeDefined()
            expect(info.client).toBe(testConfig.peer1to2.peer1.client) // Peer1 is server
            // Save the peer network data for reconnection
            // Store connection for verification
            const publicKeyHex = info.publicKey.toString('hex')
            console.log(publicKeyHex)
            
              savedPeerNetworkClient.push({
                key: publicKeyHex,
                value: {
                  name: 'peer2',
                  publickey: publicKeyHex,
                  roletaken: true,
                  longterm: true,
                  settopic: true,
                  topic: topicReconnect13,
                  live: false,
                  livePeerkey: ''
                }
              })
            resolve()
          })
        }),

        new Promise((resolve) => {
          peer2.swarm.on('connection', (conn, info) => {
            console.log('Peer2 FIRST connection:')
            expect(info.publicKey).toBeDefined()
            // expect(info.client).toBe(testConfig.peer1to2.peer1.client) // Peer2 is client when connecting to Peer1
            // Peer2's role depends on which peer it's connecting to
            if (info.publicKey === testConfig.peer1to2.peer1.publicKey) {
              expect(info.client).toBe(true) // Peer2 is client to Peer1
            } else if (info.publicKey === testConfig.peer2to3.peer3.publicKey) {
              expect(info.client).toBe(false) // Peer2 is server to Peer3
            }
            // Store connection for verification on reconnect
            const publicKeyHex2 = info.publicKey.toString('hex')
            console.log(publicKeyHex2)
            
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


  /*  reconnection from here */


  describe('reconnection using saved data', () => {
    it('should use saved relationship data for reconnection but peer1 to peer2 first time should go through first time path logic', async () => {
      console.log('reconnection using saved data')
      // keep track count connection to closetest
      let connectionCount = 0
      let peer1Count = 0
      // Set up peer1 as the initial listener
      peer1.peerJoinClient()

      let logicPrepserverStatus = function (holePunch, info, publickey) {
        let topicKeylive = info.topics
        let roleTaken = info.client
        // if now topics info then server, pass by
        let discoveryTopicInfo = {}
        if (topicKeylive.length === 0) {
          // check if joined now?
          discoveryTopicInfo = holePunch.checkDisoveryStatus('server', publickey)
          console.log('discover status=======================')
          console.log(discoveryTopicInfo)
          if (discoveryTopicInfo === undefined) {
            discoveryTopicInfo = { firstTime: false, topic: ''}
          }
        } else {
          discoveryTopicInfo = { firstTime: false, topic: ''}
        }
        return { topicServer: discoveryTopicInfo.firstTime, topic: topicKeylive }
      }

     /* start of listening for reconnect all three peers */

      // Create connection promise to verify reconnection details
      let reconnectionPromise = new Promise(async (resolve) => {

        // Reconnect using saved peer network data
        peer1.setupConnectionBegin(savedPeerNetworkClient)
        // Add 3 second delay before starting serverPeer
        await new Promise(resolve => setTimeout(resolve, 3000));
        peer2.setupConnectionBegin(savedPeerNetworkServer)

        peer1.swarm.on('connection', (conn, info) => {
          console.log('Peer1 RECON connection details:')
          connectionCount++
          peer1Count++
          // Verify reconnection details
          expect(info.publicKey).toBeDefined()
          expect(info.publicKey.toString('hex')).toBeDefined()
          expect(info.client).toBe(false)  // Client sees itself as false
          expect(info.topics.length).toBe(0)
          expect(peer1.topicHolder['']).toBeUndefined()
          
          // Store connection for verification
          const publicKeyHex = info.publicKey.toString('hex')
          console.log('publicKeyHex2222222222222222222222222')
          console.log(publicKeyHex)
          
          // to differenciate between peer 2 and peer3
          if (peer1Count === 1) {
            // check logic
            let logicInfo = logicPrepserverStatus(peer1, info, publicKeyHex)
            expect(logicInfo.topicServer).toBe(false)
            let orCheck = false
            if (logicInfo.topicServer === true || logicInfo.topic.length > 0) {
              orCheck = true
            }
            expect(orCheck).toBe(false)
            console.log('TEST Peer 1 to 2  ')
          } else if (peer1Count === 2) {
            // save info
            savedPeerNetworkClient.push({
                key: publicKeyHex,
                value: {
                  name: 'peer2',
                  publickey: publicKeyHex,
                  roletaken: true,
                  longterm: true,
                  settopic: true,
                  topic: topicReconnect13,
                  live: false,
                  livePeerkey: ''
              }
            })
            // check logic
            let logicInfo = logicPrepserverStatus(peer1, info, publicKeyHex)
            let orCheck = false
            if (logicInfo.topicServer === true || logicInfo.topic.length > 0) {
              orCheck = true
            }
            expect(orCheck).toBe(true)
            console.log('TEST Peer 1 to 3  111')
          } else {
            console.log('no match to peer 2 or 3 XXXXXXXX')
          }
          // Resolve when reconnection is established
          if (connectionCount === 4) {
            resolve()
          }
        })

        peer2.swarm.on('connection', (conn, info) => {
          console.log('Peer2 RECON connection details:')
          connectionCount++
          // Verify server reconnection details
          expect(info.publicKey).toBeDefined()
          expect(info.publicKey.toString('hex')).toBeDefined()
          expect(info.topics.length).toBe(1)
          expect(peer2.topicHolder['']).toBeUndefined()
          // Store connection for verification
          const publicKeyHex = info.publicKey.toString('hex')
          // expect(serverPeer.peerConnect[publicKeyHex]).toBeDefined()
          // Determine the correct client value from testConfig
          const clientValue = testConfig.peer1to2.peer2.client
          expect(info.client).toBe(clientValue)

          // check logic
          let logicInfo = logicPrepserverStatus(peer2, info, publicKeyHex)
          // Verify reconnection logic
          // expect(logicInfo.topic.length).toBeGreaterThan(0)
         // expect(logicInfo.topicServer).toBe(true)
         let orCheck = false
         if (logicInfo.topicServer === true || logicInfo.topic.length > 0) {
           orCheck = true
         }
         expect(orCheck).toBe(true)
         console.log('TEST Peer 1 to 2  ')
          // now peer1 connect to peer3
          console.log('Peer1 and Peer2 Reconnt now -----start peer 3 connect to peer1')
          peer3.peerJoinClient()
          const mockPeer1 = {
            publickey: peer1.swarm.keyPair.publicKey.toString('hex'),
            live: false,
            value: {
              live: false,
              key: peer1.swarm.keyPair.publicKey.toString('hex')
            }
          }
          peer3.peerJoin(mockPeer1)
          if (connectionCount === 4) {
            resolve()
          }
        })

        peer3.swarm.on('connection', (conn, info) => {
          console.log('Peer3 FIRST connection details:')
          connectionCount++
          // Verify server reconnection details
          expect(info.publicKey).toBeDefined()
          expect(info.publicKey.toString('hex')).toBeDefined()
          expect(info.topics.length).toBe(0)
          expect(peer3.topicHolder['']).toBeUndefined()
          
          // Store connection for verification
          const publicKeyHex = info.publicKey.toString('hex')
          console.log('publicKeyHex222222222222   3')
          console.log(publicKeyHex)
          
          // expect(serverPeer.peerConnect[publicKeyHex]).toBeDefined()

          // Determine the correct client value from testConfig
          const clientValue = testConfig.peer2to3.peer3.client
          expect(info.client).toBe(clientValue)

          // check logic
          if (info.publicKey === testConfig.peer1to3.peer1.publicKey) {
            expect(info.client).toBe(true) // Peer3 is client to Peer1
          } else if (info.publicKey === testConfig.peer2to3.peer2.publicKey) {
            expect(info.client).toBe(true) // Peer3 is client to Peer2
          }
          // check logic
          let logicInfo = logicPrepserverStatus(peer3, info, publicKeyHex)
          console.log('lgoic bundle peer3')
          console.log(logicInfo)
          expect(logicInfo.topicServer).toBe(false)
          let orCheck = false
          if (logicInfo.topicServer === true || logicInfo.topic.length > 0) {
            orCheck = true
          }
          expect(orCheck).toBe(false)
          console.log('TEST Peer 1 to 3  333')
          // resolve()
          console.log(connectionCount)
          if (connectionCount === 4) {
            resolve()
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
    }, 30000) // 30 second timeout
  })
})