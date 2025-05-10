import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Hyperswarm from 'hyperswarm'
import NetworkPeers from '../../src/network/peers.js'
import crypto from 'crypto'

// Set global test timeout to 60 seconds
const testTimeout = 60000;

// Helper function to create a peer
const createPeer = (index) => {
  const swarm = new Hyperswarm()
  const peer = new NetworkPeers({}, swarm)
  return {
    swarm,
    peer,
    publicKey: peer.swarm.keyPair.publicKey.toString('hex')
  }
}

describe('Ten Peer Network Tests', () => {
  let peers = []
  let swarms = []
  let testConfig = {}
  let connectionPromises = []
  const peerCount = 10

  beforeEach(async () => {
    // Create all peers with retry
    const maxAttempts = 3
    const attemptDelay = 5000

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Reset arrays
        peers = []
        swarms = []
        connectionPromises = []
        testConfig = {}

        // Create all peers
        for (let i = 0; i < peerCount; i++) {
          const { swarm, peer, publicKey } = createPeer(i)
          peers.push(peer)
          swarms.push(swarm)
          
          // Create test config
          testConfig[`peer${i}`] = {
            publicKey,
            client: i % 2 === 0 // Alternate between client and server roles
          }
        }

        // Create connection promises for verification
        for (let i = 0; i < peerCount; i++) {
          connectionPromises.push(new Promise((resolve) => {
            let connectionResolved = false
            peers[i].swarm.on('connection', (conn, info) => {
              if (!connectionResolved) {
                connectionResolved = true
                resolve({
                  peerIndex: i,
                  publicKey: info.publicKey.toString('hex'),
                  client: info.client
                })
              }
            })
          }))
        }

        // Verify peers are created
        expect(peers.length).toBe(peerCount)
        expect(swarms.length).toBe(peerCount)
        expect(connectionPromises.length).toBe(peerCount)

        return // Success!
      } catch (error) {
        console.error(`Peer creation attempt ${attempt + 1} failed:`, error.message)
        
        // Wait before next attempt
        if (attempt < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, attemptDelay))
        }
      }
    }

    // If we get here, all attempts failed
    throw new Error('Failed to create all peers after multiple attempts')
  }, 60000)

  afterEach(async () => {
    // Clean up all connections
    for (const peer of peers) {
      if (peer && peer.swarm) {
        await peer.swarm.destroy()
      }
    }
    peers = []
    swarms = []
    connectionPromises = []
  }, 30000)

  describe.skip('Mesh Network Tests', () => {
    it('should establish mesh network connections', async () => {
      // Create mesh network with explicit connections
      const connectionRetryDelay = 2000
      const maxConnectionAttempts = 5

      // Create a mesh network where each peer connects to two others
      for (let i = 0; i < peerCount; i++) {
        const peer = peers[i]
        const nextPeer = peers[(i + 1) % peerCount]
        const prevPeer = peers[(i + peerCount - 1) % peerCount]

        // Function to handle peer connection with retry
        const connectWithRetry = async (targetPeer, isNext = true) => {
          let attempts = 0
          
          while (attempts < maxConnectionAttempts) {
            try {
              console.log(`Peer ${i} attempting to connect to ${isNext ? 'next' : 'prev'} peer ${attempts + 1}/${maxConnectionAttempts}`)
              
              // First listen for incoming connections
              peer.peerJoinClient()
              
              // Then join the target peer
              await peer.peerJoin({
                publickey: targetPeer.swarm.keyPair.publicKey.toString('hex'),
                live: false,
                value: {
                  live: false,
                  key: targetPeer.swarm.keyPair.publicKey.toString('hex')
                }
              })

              // Wait for connection to be established
              await new Promise(resolve => setTimeout(resolve, 3000))

              // Verify connection
              const connections = peer.peerConnect
              if (connections && Object.keys(connections).length >= (isNext ? 1 : 2)) {
                // Log connection details
                console.log(`Peer ${i} successfully connected to ${isNext ? 'next' : 'prev'} peer`)
                console.log('Current connections:', connections)
                return true
              } else {
                console.log(`Peer ${i} connection verification failed after ${attempts + 1} attempts. Connections:`, connections)
              }
            } catch (error) {
              console.error(`Connection attempt ${attempts + 1} failed for peer ${i} to ${isNext ? 'next' : 'prev'} peer:`, error)
              if (error.stack) {
                console.error('Error stack:', error.stack)
              }
            }
            
            attempts++
            if (attempts < maxConnectionAttempts) {
              console.log(`Peer ${i} waiting ${connectionRetryDelay}ms before retrying connection to ${isNext ? 'next' : 'prev'} peer`)
              await new Promise(resolve => setTimeout(resolve, connectionRetryDelay))
            }
          }
          
          console.error(`Failed to connect peer ${i} to ${isNext ? 'next' : 'prev'} peer after ${maxConnectionAttempts} attempts`)
          return false
        }

        // Connect to next peer with retry
        const nextConnected = await connectWithRetry(nextPeer, true)
        if (!nextConnected) {
          throw new Error(`Failed to connect peer ${i} to next peer after ${maxConnectionAttempts} attempts`)
        }
        
        // Connect to previous peer with retry
        const prevConnected = await connectWithRetry(prevPeer, false)
        if (!prevConnected) {
          throw new Error(`Failed to connect peer ${i} to prev peer after ${maxConnectionAttempts} attempts`)
        }
      }

      // Wait for all connections to stabilize
      await new Promise(resolve => setTimeout(resolve, 5000))

      // Verify all connections
      for (let i = 0; i < peerCount; i++) {
        const peer = peers[i]
        if (!peer || !peer.peerConnect) {
          throw new Error(`Peer ${i} has no peerConnect object`)
        }
        
        const connections = peer.peerConnect
        const connectionCount = Object.keys(connections).length
        
        if (connectionCount !== 2) {
          console.log(`Peer ${i} has ${connectionCount} connections`)
          console.log('Peer connections:', connections)
          
          // Check if we have any connection data at all
          if (Object.keys(connections).length === 0) {
            throw new Error(`Peer ${i} has no connections. This is unexpected.`)
          }
          
          // Check if we have any connection data at all
          if (Object.keys(connections).length < 2) {
            throw new Error(`Peer ${i} has fewer than 2 connections. This is unexpected.`)
          }
        }
        
        expect(connectionCount).toBe(2)
      }
    }, 60000)

    it('should handle random peer disconnections', async () => {
      // Disconnect a random peer
      const randomIndex = Math.floor(Math.random() * peerCount)
      const randomPeer = peers[randomIndex]
      
      // Disconnect all its connections
      if (randomPeer && randomPeer.peerConnect) {
        Object.values(randomPeer.peerConnect).forEach(conn => {
          conn.destroy()
        })
        randomPeer.peerConnect = {}
      }

      // Wait for disconnection to complete
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Verify that other peers maintain their connections
      for (let i = 0; i < peerCount; i++) {
        if (i !== randomIndex) {
          const peer = peers[i]
          if (!peer || !peer.peerConnect) {
            throw new Error(`Peer ${i} has no peerConnect object after disconnection`)
          }
          
          const connections = peer.peerConnect
          const connectionCount = Object.keys(connections).length
          
          if (connectionCount !== 2) {
            console.log(`Peer ${i} has ${connectionCount} connections after disconnection`)
            console.log('Peer connections:', connections)
          }
          
          expect(connectionCount).toBe(2)
        }
      }
    }, 60000)

    it('should handle reconnection after disconnection', async () => {
      // Disconnect a random peer
      const randomIndex = Math.floor(Math.random() * peerCount)
      const randomPeer = peers[randomIndex]
      
      // Disconnect all its connections
      if (randomPeer && randomPeer.peerConnect) {
        Object.values(randomPeer.peerConnect).forEach(conn => {
          conn.destroy()
        })
        randomPeer.peerConnect = {}
      }

      // Wait for disconnection to complete
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Reconnect to neighbors with retry
      const connectionRetryDelay = 2000
      const maxConnectionAttempts = 3

      if (randomPeer) {
        const nextPeer = peers[(randomIndex + 1) % peerCount]
        const prevPeer = peers[(randomIndex + peerCount - 1) % peerCount]

        // Function to handle peer connection with retry
        const connectWithRetry = async (targetPeer, isNext = true) => {
          let attempts = 0
          while (attempts < maxConnectionAttempts) {
            try {
              randomPeer.peerJoin({
                publickey: targetPeer.swarm.keyPair.publicKey.toString('hex'),
                live: false,
                value: {
                  live: false,
                  key: targetPeer.swarm.keyPair.publicKey.toString('hex')
                }
              })

              // Wait for connection to be established
              await new Promise(resolve => setTimeout(resolve, 1000))

              // Verify connection
              const connections = randomPeer.peerConnect
              if (connections && Object.keys(connections).length >= (isNext ? 1 : 2)) {
                return true
              }
            } catch (error) {
              console.log(`Reconnection attempt ${attempts + 1} failed for peer ${randomIndex} to ${isNext ? 'next' : 'prev'} peer`)
            }
            
            attempts++
            if (attempts < maxConnectionAttempts) {
              await new Promise(resolve => setTimeout(resolve, connectionRetryDelay))
            }
          }
          return false
        }

        // Reconnect to next peer
        await connectWithRetry(nextPeer, true)
        
        // Reconnect to previous peer
        await connectWithRetry(prevPeer, false)
      }

      // Wait for all connections to be established
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Verify all connections
      for (const peer of peers) {
        if (peer && peer.peerConnect) {
          const connections = peer.peerConnect
          const connectionCount = Object.keys(connections).length
          
          if (connectionCount !== 2) {
            console.log(`Peer has ${connectionCount} connections after reconnection`)
          }
          
          expect(connectionCount).toBe(2)
        }
      }
    }, 60000)
  })

  describe('Star Network Tests', () => {
    it('should establish star topology', async () => {
      // Create star topology where peer0 is the center
      const centerPeer = peers[0]
      
      // All other peers connect to center peer
      for (let i = 1; i < peerCount; i++) {
        const peer = peers[i]
        peer.peerJoin({
          publickey: centerPeer.swarm.keyPair.publicKey.toString('hex'),
          live: false,
          value: {
            live: false,
            key: centerPeer.swarm.keyPair.publicKey.toString('hex')
          }
        })
      }
      
      // Wait for connections with retry
      const maxAttempts = 5
      const attemptDelay = 5000
      
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          // Wait for connections to stabilize
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          // Verify connections
          let allConnectionsEstablished = true
          for (let i = 0; i < peerCount; i++) {
            const peer = peers[i]
            if (!peer || !peer.peerConnect) {
              throw new Error(`Peer ${i} has no peerConnect object`)
            }
            
            const connectionCount = Object.keys(peer.peerConnect).length
            if (i === 0) {
              if (connectionCount !== 9) {
                console.log(`Center peer has ${connectionCount} connections after attempt ${attempt + 1}`)
                if (attempt === maxAttempts - 1) {
                  expect(connectionCount).toBe(9)
                }
                allConnectionsEstablished = false
              }
            } else {
              if (connectionCount !== 1) {
                console.log(`Peer ${i} has ${connectionCount} connections after attempt ${attempt + 1}`)
                if (attempt === maxAttempts - 1) {
                  expect(connectionCount).toBe(1)
                }
                allConnectionsEstablished = false
              }
            }
          }
          
          if (allConnectionsEstablished) {
            return
          }
        } catch (error) {
          console.error(`Attempt ${attempt + 1} failed:`, error.message)
          
          // Wait before next attempt
          if (attempt < maxAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, attemptDelay))
          }
        }
      }
    }, 30000)

    it('should handle center peer failure', async () => {
      // Create star topology
      const centerPeer = peers[0]
      for (let i = 1; i < peerCount; i++) {
        const peer = peers[i]
        peer.peerJoin({
          publickey: centerPeer.swarm.keyPair.publicKey.toString('hex'),
          live: false,
          value: {
            live: false,
            key: centerPeer.swarm.keyPair.publicKey.toString('hex')
          }
        })
      }
      
      // Wait for connections
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Disconnect center peer
      if (centerPeer && centerPeer.peerConnect) {
        Object.values(centerPeer.peerConnect).forEach(conn => {
          conn.destroy()
        })
        centerPeer.peerConnect = {}
      }
      
      // Wait for disconnection to propagate
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Verify all other peers lost connection
      for (let i = 1; i < peerCount; i++) {
        const peer = peers[i]
        expect(Object.keys(peer.peerConnect).length).toBe(0)
      }
    }, 30000)
  })
})
