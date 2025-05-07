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


  const randomString = crypto.randomBytes(32).toString('hex')
  topicReconnect =  randomString
  console.log(topicReconnect)



  const randomString13 = crypto.randomBytes(32).toString('hex')
  topicReconnect13 =  randomString13
  console.log(topicReconnect13)

  beforeEach(async () => {
    // Create swarms for each peer
    swarm1 = new Hyperswarm()
    swarm2 = new Hyperswarm()
    swarm3 = new Hyperswarm()

    // Create peer instances
    peer1 = new NetworkPeers({}, swarm1)
    peer2 = new NetworkPeers({}, swarm2)
    peer3 = new NetworkPeers({}, swarm3)

    console.log('TTpppppppppppppppppppp---PUBKEY owner---pppppppp')
    console.log(peer1.swarm.keyPair.publicKey.toString('hex'))
    console.log(peer2.swarm.keyPair.publicKey.toString('hex'))
    console.log(peer3.swarm.keyPair.publicKey.toString('hex'))

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


  }, 20000)

  afterEach(async () => {
    console.log('TTCleaning up test environment')
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

      let logicPrepserverStatus = async function (holePunch, info, publicKey) {
        return await holePunch.prepareConnectionInfo(info, publicKey)
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
            console.log('TTPeer1 FIRST connection:')
            // console.log(conn)
            // console.log(info.topics)
            // console.log(info.publicKey.toString('hex'))
            // console.log(peer1.swarm.peers)
            countConnect++
            //expect(info.publicKey).toBeDefined()
            //expect(info.client).toBe(testConfig.peer1to2.peer1.client)

            const publicKeyPeer1 = info.publicKey.toString('hex')
            let logicInfo = logicPrepserverStatus(peer1, info, publicKeyPeer1)

            if (info.client === testConfig.peer1to2.peer1.client) { // peer1 is server
              console.log('TT peer1 logic assertions')
              // expect(logicInfo.serverStatus).toBe(true)
              // expect(logicInfo.topicKeylive.length).toBe(0)
              // expect(logicInfo.discoveryTopicInfo.firstTime).toBe(true)
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
                  topic: topicReconnect,
                  live: false,
                  livePeerkey: ''
                }
              })
            // process network message
            conn.on('data', data =>
              // assess data
              peer1.assessData(publicKeyHex, data)
            )
            if (countConnect === 2) {
              console.log('TTnow resolve')
              resolve()
            }
          })
        }),
        /* PEER 2 FIRST */
        new Promise((resolve) => {
          peer2.swarm.on('connection', (conn, info) => {
            console.log('TT Peer2 FIRST connection:')
            // console.log(conn)
            // console.log(info.topics)
            // console.log(peer2.swarm.peers)
            countConnect++
            // expect(info.publicKey).toBeDefined()
            // Peer2's role depends on which peer it's connecting to
            if (info.publicKey === testConfig.peer1to2.peer1.publicKey) {
              // expect(info.client).toBe(testConfig.peer1to2.peer2.client) // Peer2 is client to Peer1
            }
            // Store connection for verification on reconnect
            const publicKeyHex2 = info.publicKey.toString('hex')
            let logicInfo = logicPrepserverStatus(peer1, info, publicKeyHex2)
            if (info.client === testConfig.peer1to2.peer2.client) { // peer2 is client
              console.log('TTpeer2 assertion logic')
              // expect(logicInfo.serverStatus).toBe(false)
              // xpect(logicInfo.topicKeylive.length).toBe(0)
              // expect(logicInfo.discoveryTopicInfo.firstTime).toBe(true)
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
            // process network message
            conn.on('data', data =>
              // assess data
              peer2.assessData(publicKeyHex2, data)
            )
            if (countConnect === 1) {
              console.log('TTresolve two')
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
    }, 20000) // 50 second timeout
  })




  /*  reconnection TEST from here */
  describe('reconnection using saved data', () => {
    it('should use saved relationship data for reconnection but peer1 to peer2 first time should go through first time path logic', async () => {
      console.log('TTreconnection using saved data')      
      // keep track count connection to closetest
      let connectionCount = 0
      let peer1Count = 0
      // Set up peer1 as the initial listener
      peer1.peerJoinClient()
      peer2.peerJoinClient()

      let logicPrepserverStatus = async function (holePunch, info, publicKey) {
        return await holePunch.prepareConnectionInfo(info, publicKey)
      }

      // Create connection promise to verify reconnection details
      let reconnectionPromise = new Promise(async (resolve) => {

        // Reconnect using saved peer network data
        peer1.setupConnectionBegin(savedPeerNetworkClient)
        // Add 3 second delay before starting serverPeer
        await new Promise(resolve => setTimeout(resolve, 3000));
        peer2.setupConnectionBegin(savedPeerNetworkServer)

        peer1.swarm.on('connection', async (conn, info) => {
          console.log('TT Peer1 RECON connection details:')
          // console.log(peer1.swarm.status(topicReconnect))
          connectionCount++
          peer1Count++
          let test2complete = false
          // Store connection for verification
          const publicKeyHex = info.publicKey.toString('hex')
          // to differenciate between peer 2 and peer3
          if (peer1Count === 1) {
            console.log('TT peer one RECON batch assert 111111')
            // check logic
            let logicInfo = await logicPrepserverStatus(peer1, info, publicKeyHex)
            if (info.client === testConfig.peer1to2.peer1.client) { // peer1 is server
              expect(logicInfo.discoveryTopicInfo.firstTime).toBe('wait-topic-confirm')
            } else {
              // Either serverStatus is true or there's a topic set
             
            }
          } else if (peer1Count === 2) {
            console.log('TT peer one RECON batch assert 222222')
            // check logic
            let logicInfo = await logicPrepserverStatus(peer1, info, publicKeyHex)
            // For peer1 (server) - first-time connection
            if (info.client === false) { // peer1 is server
              console.log('TT server asserts peer1 to peer3   first time but with peer2 already connected')
              expect(logicInfo.discoveryTopicInfo.firstTime).toBe('wait-topic-confirm')
              test2complete = true
              console.log('test2222 over')
              // resolve()
            }
            else {
              // Either serverStatus is true or there's a topic set
              
            }
          } else {
            console.log('no match to peer 2 or 3 XXXXXXXX')
          }

          // process network message
          conn.on('data', data =>
            // assess data
            peer1.assessData(publicKeyHex, data)
          )
          // Resolve when reconnection is established
          if (connectionCount === 4 && test2complete === true) {
            console.log('TT resolve peerone')
            resolve()
          }
        })

        peer2.swarm.on('connection', async (conn, info) => {
          console.log('TT Peer2 RECON connection details:')
          // console.log(peer2.swarm.status(topicReconnect))
          connectionCount++
          // Store connection for verification
          const publicKeyHex = info.publicKey.toString('hex')
          // Determine the correct client value from testConfig
          const clientValue = testConfig.peer1to2.peer2.client
          // check logic
          let logicInfo = await logicPrepserverStatus(peer2, info, publicKeyHex)
          // Verify reconnection logic
          if (info.client === clientValue) { // peer1 is server
            // expect(logicInfo.serverStatus).toBe(false)
            // expect(logicInfo.topicKeylive.length).toBe(1)
            expect(logicInfo.discoveryTopicInfo.firstTime).toBe(false)
          } else {
            // Either serverStatus is true or there's a topic set
            expect(logicInfo.serverStatus || logicInfo.topicKeylive.length > 0).toBe(true)
          }
          // Ensure peer1 and peer2 are connected before peer3 connects
          console.log('TT Peer1 and Peer2 Reconnt now -- code location')
          // Wait until both peer1 and peer2 connections are established
          // keep tabs on invites generated
          peer1.setRole({ pubkey: peer1.swarm.keyPair.publicKey.toString('hex'), codename: '12345677654321', name: 'primepeer' })
          // Create function to handle peer3 connection
          const connectPeer3 = async () => {
            console.log('TT Connecting peer3 now that peer1 and peer2 are connected')
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
            console.log('TT wait 1111')
            await connectPeer3()
          } else {
            // Set up a listener for when connectionCount reaches 2
            const checkConnectionCount = setInterval(async () => {
              console.log('TT wait 2222')
              // put a time delay in here too
              if (connectionCount === 2) {
                clearInterval(checkConnectionCount)
                console.log('TT Waiting 3 seconds before connecting peer3...')
                await new Promise(resolve => setTimeout(resolve, 10000))
                connectPeer3()
              }
            }, 100)
          }

          // process network message
          conn.on('data', data =>
            // assess data
            peer2.assessData(publicKeyHex, data)
          )
          if (connectionCount === 4) {
            console.log('resolve peer two')
            resolve()
          }
        })

        peer3.swarm.on('connection', async (conn, info) => {
          console.log('TT Peer3 FIRST connection details:')
          connectionCount++
          // Verify server reconnection details
          // expect(info.publicKey).toBeDefined()
          // expect(info.publicKey.toString('hex')).toBeDefined()
          // expect(info.topics.length).toBe(0)
          // expect(peer3.topicHolder['']).toBeUndefined()
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
          let logicInfo = await logicPrepserverStatus(peer3, info, publicKeyHex)
          if (info.client === testConfig.peer2to3.peer3.client) { // peer1 is server
            // expect(logicInfo.serverStatus).toBe(false)
            // expect(logicInfo.topicKeylive.length).toBe(0)
            expect(logicInfo.discoveryTopicInfo.firstTime).toBe(true)
          }
          else {
            // Either serverStatus is true or there's a topic set
            expect(logicInfo.serverStatus || logicInfo.topicKeylive.length > 0).toBe(true)
          }
          // process network message
          conn.on('data', data =>
            // assess data
            peer3.assessData(publicKeyHex, data)
          )
          if (connectionCount === 4) {
            console.log('resolve peer three')
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
    }, 40000) // 30 second timeout
  }) 
})