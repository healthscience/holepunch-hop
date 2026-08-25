'use strict'

import EventEmitter from 'events'
import { PeerProtocol } from './osmosis/protocol.js'
import { TopicTracker } from './osmosis/topics.js'

export class NetworkPeers extends EventEmitter {
  constructor(store, swarm) {
    super()
    this.store = store
    this.swarm = swarm
    this.topics = new TopicTracker()
    
    this.peerNetwork = []
    this.peerConnect = new Map()  // pubKey -> connection
    this.peerChannels = new Map() // pubKey -> PeerProtocol
    this.peerHolder = new Map()
    this.localPublicLibrary = null
  }

  setLocalPublicLibrary(manifest) {
    this.localPublicLibrary = manifest
  }

  networkKeys() {
    const publicKey = this.swarm.keyPair.publicKey.toString('hex')
    this.emit('peer-network', {
      type: 'account',
      action: 'network-keys',
      data: { publickey: publicKey }
    })
    this.listenNetwork()
    this.swarm.listen()
  }

  setupConnectionBegin(peerNetwork) {
    this.peerNetwork = peerNetwork
    for (const sPeer of this.peerNetwork) {
      const hexKey = sPeer.key.toString('hex')
      const topic = sPeer.value?.concept?.topic
      if (sPeer.value?.concept?.settopic) {
        this.topicConnect(hexKey, topic)
      } else if (topic) {
        this.topicListen(topic, hexKey)
      }
    }
  }

listenNetwork() {
    this.swarm.on('connection', (conn, info) => {
      const publicKey = info.publicKey.toString('hex')
      this.peerConnect.set(publicKey, conn)

      const protocol = new PeerProtocol(conn, {
        publicKey,
        localManifest: this.localPublicLibrary,
        onMessage: (peerKey, data) => this.assessData(peerKey, data),
        // Direct routing for high-speed thermodynamic syncs
        onOsmosis: (peerKey, data) => {
          const baseKey = this.peerMatchbase(peerKey)
          this.emit('osmosis-sync', { publickey: baseKey, ...data })
        }
      })

      this.peerChannels.set(publicKey, protocol)

      // Store replication
      if (this.store && typeof this.store.replicate === 'function') {
        this.store.replicate(conn)
      }

      this._handleConnectionLifecycle(conn, info, publicKey)

      conn.on('close', () => {
        this.peerConnect.delete(publicKey)
        this.peerChannels.delete(publicKey)
      })

      conn.on('error', () => {
        this.emit('peer-disconnect', { publickey: publicKey })
      })
    })
  }

  _handleConnectionLifecycle(conn, info, publicKey) {
    const topics = info.topics || []
    const isClient = info.client

    if (topics.length > 0) {
      const topicHex = topics[0].toString('hex')
      const originalKey = this.topics.findOriginalKey(topicHex, this.peerNetwork)
      
      this.updatePeerStatus(topicHex, publicKey)
      if (originalKey) {
        this.writeToPeer(publicKey, {
          type: 'topic-reconnect-id',
          data: { topic: topicHex, peerKey: originalKey }
        })
      }
    } else {
      const roleType = isClient ? 'client' : 'server'
      this.emit('connect-warm-first', { publickey: publicKey, roletaken: roleType })
    }
  }

  assessData(peerKey, data) {
    let payload = data
    if (Buffer.isBuffer(data)) {
      try { payload = JSON.parse(data.toString()) } catch (e) { return }
    }

    const baseKey = this.peerMatchbase(peerKey)

    switch (payload.type) {
      case 'public-library':
        this.emit('publiclibrarynotification', { publickey: baseKey, data: payload })
        break
      case 'private-cue-space':
        this.emit('cuespace-notification', { publickey: baseKey, data: payload })
        break
      case 'private-chart':
        this.emit('beebee-data', { publickey: baseKey, data: payload })
        break
      case 'hop-osmosis':
        this.emit('osmosis-sync', { publickey: baseKey, data: payload })
        break
      case 'peer-codename-inform':
        this.emit('peer-codename-match', payload)
        break
      case 'topic-reconnect':
        this.emit('peer-reconnect-topic', payload)
        break
      case 'topic-reconnect-id':
        this.emit('peer-reconnect-topic-id', peerKey, payload.data)
        break
    }
  }

  writeToPeer(pubKey, payload) {
    const channel = this.peerChannels.get(pubKey)
    if (channel) channel.send(payload)
  }

  updatePeerStatus(topicHex, livePeerKey) {
    this.peerNetwork = this.peerNetwork.map(savePeer => {
      if (savePeer.value?.concept?.topic === topicHex) {
        return {
          ...savePeer,
          value: { ...savePeer.value, live: true, livePeerkey: livePeerKey }
        }
      }
      return savePeer
    })
    this.emit('peer-live-network', topicHex)
  }

  peerMatchbase(currPubKey) {
    for (const savePeer of this.peerNetwork) {
      if (savePeer.value?.livePeerkey === currPubKey) {
        return savePeer.key?.toString('hex') || savePeer.key
      }
    }
    return currPubKey
  }

  async topicConnect(peerID, topic) {
    const noisePublicKey = Buffer.from(topic, 'hex')
    if (noisePublicKey.length === 32) {
      this.topics.addTopic(topic, { role: 'server', topic, key: topic.toString('hex') })
      const discovery = this.swarm.join(noisePublicKey, { server: true, client: false })
      await discovery.flushed()
    }
  }

  async topicListen(topic, peerID) {
    const noisePublicKey = Buffer.from(topic, 'hex')
    if (noisePublicKey.length === 32) {
      const discovery = this.swarm.join(noisePublicKey, { server: false, client: true })
      await discovery.flushed()
    }
  }
}