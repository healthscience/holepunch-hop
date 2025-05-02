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
    it('should establish start connections peer one to peer two', async () => {
      let countConnect = 0
      // Set up peer1 as the initial listener
      peer1.peerJoinClient()
      peer2.peerJoinClient()

      let logicPrepserverStatus = function (holePunch, info, publicKey) {
        return holePunch.prepareConnectionInfo(info, publicKey)
      }

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
        /* PEER 1 FIRST */
        new Promise((resolve) => {
          peer1.swarm.on('connection', (conn, info) => {
            console.log('Peer1 FIRST connection:')
            countConnect++
            expect(info.publicKey).toBeDefined()
            expect(info.client).toBe(testConfig.peer1to2.peer1.client)

            const publicKeyPeer1 = info.publicKey.toString('hex')
            let logicInfo = logicPrepserverStatus(peer1, info, publicKeyPeer1)
            console.log('logicInfo11')
            console.log(logicInfo)

            // Determine which path to take
            /*if (connectionInfo.discoveryTopicInfo.firstTime === false) {
              this.handleReconnection(conn, info, connectionInfo);
            } else {
              this.handleFirstTimeConnection(conn, info, connectionInfo);
            }*/






            if (info.client === testConfig.peer1to2.peer1.client) { // peer1 is server
              console.log('peer1 is server lgoic')
              expect(logicInfo.serverStatus).toBe(true)
              expect(logicInfo.topicKeylive.length).toBe(0)
              expect(logicInfo.discoveryTopicInfo.firstTime).toBe(true)
            } else {
              // Either serverStatus is true or there's a topic set
              expect(logicInfo.serverStatus || logicInfo.topicKeylive.length > 0).toBe(true)
            }


            // Save the peer network data for reconnection
            // Store connection for verification
            const publicKeyHex = info.publicKey.toString('hex')      
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
              console.log(countConnect)
            if (countConnect === 2) {
              console.log('now resolve')
              resolve()
            }
          })
        }),
        /* PEER 2 FIRST */
        new Promise((resolve) => {
          peer2.swarm.on('connection', (conn, info) => {
            console.log('Peer2 FIRST connection:')
            countConnect++
            expect(info.publicKey).toBeDefined()
            // Peer2's role depends on which peer it's connecting to
            if (info.publicKey === testConfig.peer1to2.peer1.publicKey) {
              expect(info.client).toBe(testConfig.peer1to2.peer2.client) // Peer2 is client to Peer1
            }
            // Store connection for verification on reconnect
            const publicKeyHex2 = info.publicKey.toString('hex')
            console.log(publicKeyHex2)

            let logicInfo = logicPrepserverStatus(peer1, info, publicKeyHex2)
            console.log('logicInfo22aa')
            console.log(logicInfo)
            if (info.client === testConfig.peer1to2.peer2.client) { // peer2 is client
              console.log('peer2 is server lgoic')
              expect(logicInfo.serverStatus).toBe(false)
              expect(logicInfo.topicKeylive.length).toBe(0)
              expect(logicInfo.discoveryTopicInfo.firstTime).toBe(true)
            } else {
              // Either serverStatus is true or there's a topic set
              expect(logicInfo.serverStatus || logicInfo.topicKeylive.length > 0).toBe(true)
            }

            
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
            console.log(countConnect)
            if (countConnect === 1) {
              console.log('resolve two')
              resolve()
            }
          })
        })
      ]

      // Wait for all connections to be established
      await Promise.all(connectionPromises)

      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        throw new Error('Connection did not establish within timeout period')
      }, 2000)

      // Clear timeout if connection was successful
      clearTimeout(timeout)
    }, 10000) // 50 second timeout
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

      let logicPrepserverStatus = function (holePunch, info, publicKey) {
        return holePunch.prepareConnectionInfo(info, publicKey)
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
          expect(info.client).toBe(testConfig.peer1to2.peer1.client)
          expect(info.topics.length).toBe(0)
          expect(peer1.topicHolder['']).toBeUndefined()
          // Store connection for verification
          const publicKeyHex = info.publicKey.toString('hex')
          // to differenciate between peer 2 and peer3
          if (peer1Count === 1) {
            console.log('peer one reconn batch assert 111111')
            // check logic
            let logicInfo = logicPrepserverStatus(peer1, info, publicKeyHex)
            console.log('logicInfo11')
            console.log(logicInfo)
            if (info.client === testConfig.peer1to2.peer1.client) { // peer1 is server
              expect(logicInfo.serverStatus).toBe(true)
              expect(logicInfo.topicKeylive.length).toBe(0)
              expect(logicInfo.discoveryTopicInfo.firstTime).toBe(false)
            } else {
              // Either serverStatus is true or there's a topic set
              expect(logicInfo.serverStatus || logicInfo.topicKeylive.length > 0).toBe(true)
            }
          } else if (peer1Count === 2) {
            console.log('peer one reconn batch assert 222222')

            // save info
            /*savedPeerNetworkClient.push({
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
            })*/
            // check logic
            let logicInfo = logicPrepserverStatus(peer1, info, publicKeyHex)
            console.log('logicInfo22')
            console.log(logicInfo)
            // For peer1 (server) - first-time connection
            if (info.client === false) { // peer1 is server
              console.log('server asserts peer1 to peer3   first time but with peer2 already connected')
              expect(logicInfo.serverStatus).toBe(true)
              expect(logicInfo.topicKeylive.length).toBe(0)
              expect(logicInfo.discoveryTopicInfo.firstTime).toBe(true)
            }
            else {
              // Either serverStatus is true or there's a topic set
              expect(logicInfo.serverStatus || logicInfo.topicKeylive.length > 0).toBe(true)
            }
          } else {
            console.log('no match to peer 2 or 3 XXXXXXXX')
          }
          // Resolve when reconnection is established
          if (connectionCount === 4) {
            resolve()
          }
        })

        peer2.swarm.on('connection', async (conn, info) => {
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
          console.log('logicInfo33')
          console.log(logicInfo)
          // Verify reconnection logic
        // For peer1 (server) - first-time connection
          if (info.client === clientValue) { // peer1 is server
            expect(logicInfo.serverStatus).toBe(false)
            expect(logicInfo.topicKeylive.length).toBe(1)
            expect(logicInfo.discoveryTopicInfo.firstTime).toBe(false)
          } else {
            // Either serverStatus is true or there's a topic set
            expect(logicInfo.serverStatus || logicInfo.topicKeylive.length > 0).toBe(true)
          }
          // Ensure peer1 and peer2 are connected before peer3 connects
          console.log('Peer1 and Peer2 Reconnt now -----start peer 3 connect to peer1')
          
          // Wait until both peer1 and peer2 connections are established
          // Wait until both peer1 and peer2 connections are established
          console.log('connectionCount')
          console.log(connectionCount)
          // Create function to handle peer3 connection
          const connectPeer3 = async () => {
            console.log('Connecting peer3 now that peer1 and peer2 are connected')
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
          }

          // Call connectPeer3 when connectionCount reaches 2
          if (connectionCount === 2) {
            console.log('wait 1111')
            await connectPeer3()
          } else {
            // Set up a listener for when connectionCount reaches 2
            const checkConnectionCount = setInterval(async () => {
              console.log('wait 2222')
              // put a time delay in here too
              if (connectionCount === 2) {
                clearInterval(checkConnectionCount)
                console.log('Waiting 3 seconds before connecting peer3...')
                await new Promise(resolve => setTimeout(resolve, 10000))
                connectPeer3()
              }
            }, 100)
          }

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
          // expect(serverPeer.peerConnect[publicKeyHex]).toBeDefined()
          // check logic
          if (info.publicKey === testConfig.peer1to3.peer1.publicKey) {
            expect(info.client).toBe(testConfig.peer1to3.peer3.client) // Peer3 is client to Peer1
          } else if (info.publicKey === testConfig.peer2to3.peer2.publicKey) {
            expect(info.client).toBe(testConfig.peer2to3.peer3.client) // Peer3 is client to Peer2
          }
          // check logic
          let logicInfo = logicPrepserverStatus(peer3, info, publicKeyHex)
          console.log('logicInf444o')
          console.log(logicInfo)
          if (info.client === testConfig.peer2to3.peer3.client) { // peer1 is server
            expect(logicInfo.serverStatus).toBe(false)
            expect(logicInfo.topicKeylive.length).toBe(0)
            expect(logicInfo.discoveryTopicInfo.firstTime).toBe(true)
          }
          else {
            // Either serverStatus is true or there's a topic set
            expect(logicInfo.serverStatus || logicInfo.topicKeylive.length > 0).toBe(true)
          }
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
    }, 20000) // 30 second timeout
  })
})