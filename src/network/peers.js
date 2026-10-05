'use strict'

import EventEmitter from 'events'
import crypto from 'crypto'
import b4a from 'b4a'

import { PeerProtocol } from './osmosis/protocol.js'

class NetworkPeers extends EventEmitter {
  constructor (store, swarm, options) {
    super()
    this.hello = 'hyperpeers'
    this.store = store
    this.swarm = swarm
    this.peerManifests = new Map()
    this.protocols = new Map()
    this.drive = {}
    this.peerPrime = ''
    this.peerNetwork = []
    this.peerEstContext = {}
    this.peerHolder = {}
    this.peerConnect = {}
    this.topicHolder = {}
    this.sendTopicHolder = []
    this.peersRole = []
    this.discoveryList = []
    this.peerSwitchLiveID = []
    this.getPublicManifest = options.getPublicManifest
    this._setupSwarm()
  }

  _setupSwarm () {
    this.swarm.on('connection', (conn, info) => {
      const peerHex = b4a.toString(info.publicKey, 'hex')
      this.peerConnect[peerHex] = conn

      // Single Protomux channel multiplexing via PeerProtocol
      const protocol = new PeerProtocol(conn, {
        publicKey: peerHex,
        localManifest: this.getPublicManifest(),
        onMessage: (peerKey, payload) => this.handlePeerControl(peerKey, payload),
        onOsmosis: (peerKey, frame) => this.handlePeerOsmosis(peerKey, frame)
      })

      this.protocols.set(peerHex, protocol)

      // Connection lifecycle & discovery assessment
      const connectionInfo = this.prepareConnectionInfo(info, peerHex)
      if (connectionInfo.discoveryTopicInfo.firstTime === false) {
        this.handleReconnection(conn, info, connectionInfo)
      } else if (connectionInfo.discoveryTopicInfo.firstTime === true) {
        this.handleFirstTimeConnection(conn, info, connectionInfo)
      } else {
        this.peerSwitchLiveID.push({ publicKey: peerHex, discoveryTopicInfo: connectionInfo })
      }

      // Replicate core store across swarm stream
      if (this.store && typeof this.store.replicate === 'function') {
        this.store.replicate(conn)
      }

      conn.on('close', () => {
        this.protocols.delete(peerHex)
        delete this.peerConnect[peerHex]

        for (const peer of this.peerNetwork) {
          if (peer.value?.livePeerkey === peerHex) {
            this.emit('peer-disconnect', { peercontract: peer })
          } else if (peer.key === peerHex) {
            this.emit('peer-disconnect', { publickey: peer.key })
          }
        }

        this.emit('peer-disconnected', peerHex)
      })

      conn.on('error', () => {})
      this.emit('peer-connected', peerHex)
    })
  }

  handlePeerControl (peerKey, payload) {
    if (payload?.type === 'public-library' && this.hyperbee) {
      this.hyperbee.saveRepliatePubLibary(payload.data)
    }
    
    // Pass raw control payloads to assessment pipeline
    this.assessData(peerKey, payload)
    this.emit('control', { peerKey, payload })
  }

  handlePeerOsmosis (peerKey, frame) {
    // Route thermodynamic frame to hop-osmosis membrane
    if (this.hyperbee?.osmosis?.receiveOsmosisFrame) {
      this.hyperbee.osmosis.receiveOsmosisFrame(peerKey, frame)
    }

    // Emit into safeflow-ecs
    if (this.hyperbee?.emitSafeflowQuery) {
      this.hyperbee.emitSafeflowQuery({
        peerKey,
        action: frame.action,
        heliAngle: frame.heliAngle,
        entropy: frame.entropy,
        ecsVector: frame.ecsVector
      })
    }

    this.emit('osmosis-frame', { peerKey, frame })
  }

  broadcastOsmosis (heliAngle, entropy, ecsVectorBuffer, action = 0) {
    for (const protocol of this.protocols.values()) {
      protocol.sendOsmosis(heliAngle, entropy, ecsVectorBuffer, action)
    }
  }

  sendPeerControl (peerHex, payload) {
    const protocol = this.protocols.get(peerHex)
    if (protocol) {
      protocol.sendControl(payload)
    }
  }

  getChannel (publickey) {
    const protocol = this.protocols.get(publickey)
    if (protocol) return protocol

    const matchedKey = this.peerMatchbase(publickey)
    return this.protocols.get(matchedKey) || null
  }

  writeTonetwork (data) {
    const targetKey = typeof data === 'string' ? data : data?.publickey
    const channel = this.getChannel(targetKey)
    if (channel) channel.sendControl(data)
  }

  writeTonetworkData (publickey, dataShare) {
    const channel = this.getChannel(publickey)
    if (channel) channel.sendControl(dataShare)
  }

  writeToPublicLibrary (publickey, data) {
    const dataShare = { data, type: 'public-library' }
    const channel = this.getChannel(publickey)
    if (channel) channel.sendControl(dataShare)
  }

  writeToCueSpace (publickey, data) {
    const channel = this.getChannel(publickey)
    if (channel) channel.sendControl(data)
  }

  completePeerRelationship (liveKey, topicContext) {
    this.emit('peer-topic-set', topicContext)
    const channel = this.getChannel(liveKey)
    if (channel) channel.sendControl(topicContext)
  }

  writeTopicReconnect (publickey, topicInfo) {
    const topicReconnectMessage = {
      type: 'topic-reconnect-id',
      data: { topic: topicInfo.topic, peerKey: topicInfo.peerKey }
    }
    const channel = this.getChannel(topicInfo.currentPubkey)
    if (channel) channel.sendControl(topicReconnectMessage)
  }

  networkKeys () {
    const peerNxKeys = {
      publickey: this.swarm.keyPair.publicKey.toString('hex')
    }
    const networkMessage = {
      type: 'account',
      action: 'network-keys',
      data: peerNxKeys
    }
    this.emit('peer-network', networkMessage)
    this.listenNetwork()
    this.peerJoinClient()
  }

  listenNetwork () {
    // Swarm listeners are unified inside _setupSwarm()
  }

  setRole (peerData) {
    const setRole = { send: 'prime', invite: peerData }
    this.peersRole.push(setRole)
  }

  setupConnectionBegin (peerNetwork) {
    this.peerNetwork = peerNetwork
    for (const sPeer of this.peerNetwork) {
      const hexKey = sPeer.key.toString('hex')
      if (sPeer.value?.concept?.settopic === true) {
        this.topicConnect(hexKey, sPeer.value.concept.topic)
      } else if (sPeer.value?.concept?.topic) {
        this.topicListen(sPeer.value.concept.topic, hexKey)
      }
    }
  }

  latestPeerNetwork (peerNetwork) {
    this.peerNetwork = [...this.peerNetwork, ...peerNetwork]
  }

  setRestablished (pubKey, established) {
    this.peerEstContext[pubKey] = established
  }

  prepareConnectionInfo (info, publicKey) {
    const topicKeylive = info.topics || []
    const roleTaken = info.client
    let discoveryTopicInfo = {}

    if (topicKeylive.length === 0) {
      const role = roleTaken === false ? 'server' : 'client'
      discoveryTopicInfo = this.checkDisoveryStatus(role, publicKey, topicKeylive)
      if (discoveryTopicInfo === undefined) {
        discoveryTopicInfo = { firstTime: false, topic: '' }
      }
    } else {
      discoveryTopicInfo = { firstTime: false, topic: '' }
    }

    return {
      topicKeylive,
      roleTaken,
      discoveryTopicInfo
    }
  }

  handleFirstTimeConnection (conn, info, connectionInfo) {
    const publicKeylive = info.publicKey.toString('hex')
    const roleTaken = info.client

    if (this.topicHolder[publicKeylive] === undefined) {
      const roleType = roleTaken === false ? 'server' : 'client'
      const roleContext = {
        publickey: publicKeylive,
        roletaken: roleType
      }
      this.dataFlowCheck(publicKeylive, 'first')
      this.emit('connect-warm-first', roleContext)
    }
  }

  handleReconnection (conn, info, connectionInfo) {
    const { publicKey } = info
    const { topicKeylive } = connectionInfo

    let topic = ''
    if (topicKeylive.length > 0) {
      topic = topicKeylive[0].toString('hex')
    }

    let originalKey = ''
    for (const savePeer of this.peerNetwork) {
      if (savePeer.value?.concept?.topic === topic) {
        originalKey = savePeer.value.publickey
        break
      }
    }

    if (topic.length > 0) {
      const topicMatch = this.topicHolder[topic]
      if (topicMatch && Object.keys(topicMatch).length > 0) {
        topicMatch.currentPubkey = publicKey.toString('hex')
        this.topicHolder[topic] = topicMatch
        this.dataFlowCheck(topic, 'client')
        this.updatePeerStatus(topic, publicKey.toString('hex'))
        this.writeTopicReconnect(originalKey, topicMatch)
      }
      this.dataFlowCheck(publicKey.toString('hex'), 'server')
    }
  }

  updatePeerStatus (topic, publicKey) {
    let originalKey = ''
    for (const savePeer of this.peerNetwork) {
      if (savePeer.value?.concept?.topic === topic) {
        originalKey = savePeer.key.toString('hex')
        break
      }
    }

    this.peerNetwork = this.peerNetwork.map(savePeer => {
      if (savePeer.key.toString('hex') === originalKey) {
        return {
          ...savePeer,
          value: {
            ...savePeer.value,
            live: true,
            livePeerkey: publicKey
          }
        }
      }
      return savePeer
    })
    this.emit('peer-live-network', originalKey)
  }

  assessData (peer, data) {
    let dataShareIn = data
    if (Buffer.isBuffer(data)) {
      try {
        dataShareIn = JSON.parse(data.toString())
      } catch (e) {
        return
      }
    }

    console.log('assess data ===================================')
    console.log(dataShareIn)
    try {
      const peerMatch = this.peerMatchbase(peer)
      if (dataShareIn.type === 'private-chart') {
        this.emit('beebee-data', { publickey: peerMatch, data: dataShareIn })
      } else if (dataShareIn.type === 'private-cue-space') {
        this.emit('cuespace-notification', { publickey: peerMatch, data: dataShareIn })
      } else if (dataShareIn.type === 'public-library') {
         if (dataShareIn.action === 'auto-announce') {
          // set the maps
          this.peerManifests.set(peerMatch, dataShareIn.data)
          this.emit('publiclibrary-notification-manifest', peerMatch)
         }
      } else if (dataShareIn.type === 'peer-codename-inform') {
        this.emit('peer-codename-match', dataShareIn)
      } else if (dataShareIn.type === 'topic-reconnect') {
        const topicMatch = this.topicHolder[dataShareIn.topic]
        if (topicMatch !== undefined) {
          if (topicMatch.currentPubkey !== dataShareIn.publickey) {
            this.emit('peer-reconnect-topic', dataShareIn)
          }
        } else {
          dataShareIn.settopic = false
          this.emit('peer-reconnect-topic', dataShareIn)
        }
      } else if (dataShareIn.type === 'topic-reconnect-id') {
        this.emit('peer-reconnect-topic-id', peer, dataShareIn.data)
      }
    } catch (e) {
      console.error('Data assessment error:', e)
    }
  }

  checkConnectivityStatus (message, warmPeers, decodePath) {
    const ptopStatus = {}
    let savedPtoP = false
    let livePtoP = false
    let savedpeerInfo = {}

    if (decodePath === 'invite-gen') {
      const parts = this.inviteDecoded(message.data)
      if (typeof message.data === 'string' || message.data?.invite) {
        message.data = { publickey: parts[1], codename: parts[2] }
      } else {
        message.data.publickey = parts[1]
        message.data.codename = parts[2]
      }
    }

    const targetKey = message.data.publickey

    for (const exPeer of this.peerNetwork) {
      if (exPeer.key === targetKey) {
        savedPtoP = true
        savedpeerInfo = exPeer
      }
    }

    let peerLiveStatus = false
    for (const sPeer of this.peerNetwork) {
      if (sPeer.key === targetKey) {
        peerLiveStatus = sPeer.value?.live || false
      }
    }

    if (peerLiveStatus === true) {
      livePtoP = true
    } else {
      for (const wpeer of warmPeers) {
        const openConn = this.peerConnect[targetKey]
        if (openConn !== undefined) {
          livePtoP = true
        }
      }
    }

    ptopStatus.peer = savedpeerInfo
    ptopStatus.existing = savedPtoP
    ptopStatus.live = livePtoP
    ptopStatus.role = this.peersRole[targetKey]
    ptopStatus.data = message.data
    ptopStatus.action = message.action
    ptopStatus.task = message.task
    return ptopStatus
  }

  matchInviteFirst (data) {
    let roleMatch = false
    for (const peerRole of this.peersRole) {
      if (peerRole.invite?.codename === data.data?.inviteCode) {
        roleMatch = true
        break
      }
    }
  }

  matchCodename (data) {
    let inviteIn = {}
    for (const roleP of this.peersRole) {
      if (roleP.invite?.pubkey === data) {
        inviteIn = roleP
      }
    }
    const codeNameInvite = {
      codename: inviteIn.invite?.codename,
      invitePubkey: data,
      name: inviteIn.invite?.name
    }
    return {
      publickey: data,
      role: inviteIn,
      codename: codeNameInvite.codename,
      name: codeNameInvite.name
    }
  }

  matchPeersCodename (data) {
    let inviteIn = {}
    for (const roleP of this.peersRole) {
      if (roleP.invite?.codename === data.data?.inviteCode) {
        inviteIn = roleP
      }
    }
    return {
      publickey: data,
      role: inviteIn,
      codename: inviteIn.invite?.codename,
      name: inviteIn.invite?.name
    }
  }

  peerMatchTopic (pubKey) {
    let peerSettings = {}
    for (const savePeer of this.peerNetwork) {
      if (savePeer.key?.toString('hex') === pubKey) {
        peerSettings = savePeer
      }
    }
    return peerSettings
  }

  discoveryMatch (pubKey) {
    return true
  }

  topicPublicKeyMatch (topic) {
    let topicSettings = {}
    for (const livePeer of this.peerSwitchLiveID) {
      if (livePeer.connectionInfo?.topic === topic) {
        topicSettings = livePeer.publicKey
      }
    }
    return topicSettings
  }

  peerMatchbase (currPubKey) {
    let originalKey = ''
    for (const savePeer of this.peerNetwork) {
      if (savePeer.value?.livePeerkey === currPubKey) {
        originalKey = savePeer.key
      }
    }
    return originalKey.length === 0 ? currPubKey : originalKey
  }

  matchPeerTopic (topic) {
    let peerSettings = {}
    for (const savePeer of this.peerNetwork) {
      if (savePeer.value?.concept?.topic === topic) {
        peerSettings = savePeer
      }
    }
    return peerSettings
  }

  inviteDecoded (invite) {
    const raw = typeof invite === 'string'
      ? invite
      : (invite?.invite || invite?.publickey || '')

    const splitInvite = []

    if (typeof raw === 'string' && raw.includes(':')) {
      const [prefix, hexString] = raw.split(':')
      if (prefix === 'hop' && hexString) {
        const next32Bytes = hexString.slice(0, 64)
        const remainder = hexString.slice(64)
        splitInvite.push('hop', next32Bytes, remainder)
        return splitInvite
      }
    }

    splitInvite.push('hop', invite?.publickey || raw, invite?.codename || '')
    return splitInvite
  }

  dataFlowCheck (topicIn, role) {
    let peerTopeerState = {}
    let matchPeer = {}

    if (role === 'client') {
      matchPeer = this.topicHolder[topicIn] || {}
      const peerActionData = this.peerHolder[matchPeer.peerKey]
      if (peerActionData !== undefined) {
        peerTopeerState = peerActionData.data || {}
      }
    } else if (role === 'server') {
      matchPeer.currentPubkey = topicIn
      const checkDiscoveryTopic = {}
      for (const topicH of this.sendTopicHolder) {
        const noisePublicKey = Buffer.from(topicH.topic, 'hex')
        const discovery = this.swarm.status(noisePublicKey)
        if (discovery && discovery.topic?.toString('hex') === topicH.topic) {
          discovery.swarm.connections.forEach((value) => {
            checkDiscoveryTopic.server = value.publicKey.toString('hex')
            checkDiscoveryTopic.client = value.remotePublicKey.toString('hex')
            checkDiscoveryTopic.topic = topicH.topic
          })
        }
      }

      let peerMTopic = {}
      for (const peerh of this.peerNetwork) {
        if (peerh.value?.topic === checkDiscoveryTopic.topic) {
          peerMTopic = peerh
        }
      }

      if (Object.keys(peerMTopic).length === 0) {
        peerMTopic.key = topicIn
      }

      const peerActionData = this.peerHolder[peerMTopic.key]
      peerTopeerState = peerActionData?.data || {}
    } else if (role === 'first') {
      const peerActionData = this.peerHolder[topicIn]
      peerTopeerState = peerActionData?.data || {}
    }

    const checkDataShare = Object.keys(peerTopeerState).length
    if (checkDataShare > 0) {
      if (peerTopeerState.type === 'private-chart') {
        this.writeTonetworkData(matchPeer.currentPubkey, peerTopeerState)
      }
    }
  }

  checkDisoveryStatus (nodeRole, publicKey, topic) {
    let topicList = []
    if (nodeRole === 'server') {
      topicList = this.sendTopicHolder
    } else if (nodeRole === 'client') {
      topicList = this.topicHolder
    }

    let peerContractKey = ''
    if (topicList.length > 0) {
      peerContractKey = topicList[0].peerKey
    }

    let firstTime = false
    const emptyHolder = false

    if (this.peerNetwork.length === 0) {
      firstTime = true
    } else {
      let keyMatchTopic = false
      if (topicList.length > 0) {
        for (const topicE of topicList) {
          if (topicE.livePubkey === peerContractKey) {
            keyMatchTopic = true
          }
        }
      }

      if (keyMatchTopic === false) {
        if (nodeRole === 'client') {
          if (!topic || topic.length === 0) {
            firstTime = true
          }
        } else if (nodeRole === 'server') {
          if (topicList.length === 0) {
            firstTime = true
          } else {
            let existingPeerCheck = false
            for (const peer of this.peerNetwork) {
              if (peer.key?.toString('hex') === peerContractKey) {
                existingPeerCheck = true
              }
            }
            if (existingPeerCheck === false) {
              firstTime = 'wait-topic-confirm'
            } else {
              firstTime = false
            }
          }
        }
      }
    }

    return {
      firstTime,
      emptyHolder,
      role: nodeRole,
      server: '',
      client: '',
      topic: ''
    }
  }

  checkTopicModes (matchTopic) {
    const sendLogic = this.sendTopicHolder.filter(s => s.topic === matchTopic)
    const holderLogic = Object.keys(this.topicHolder).filter(t => this.topicHolder[t].topic === matchTopic)
    return { firstTime: sendLogic.length === 0 && holderLogic.length === 0 }
  }

  routeDataPath (livePubkey, peerTopeerState) {
    const checkDataShare = Object.keys(peerTopeerState || {}).length
    if (checkDataShare > 0) {
      if (peerTopeerState.type === 'private-chart') {
        this.writeTonetworkData(livePubkey, peerTopeerState)
      } else if (peerTopeerState.type === 'public-n1-experiment') {
        this.writeToPublicLibrary(livePubkey, peerTopeerState)
      } else if (peerTopeerState.type === 'private-cue-space') {
        this.writeToCueSpace(livePubkey, peerTopeerState)
      } else if (peerTopeerState.type === 'peer-write') {
        this.writeTonetwork(peerTopeerState)
      } else if (peerTopeerState.type === 'public-library') {
        this.writeToPublicLibrary(livePubkey, peerTopeerState)
      }
    }
  }

  writeTonetworkTopic (peerContract, codeName) {
    const randomString = crypto.randomBytes(32).toString('hex')
    const topicGeneration = randomString

    const topicShare = {
      type: 'topic-reconnect',
      peercontract: peerContract,
      publickey: this.swarm.keyPair.publicKey.toString('hex'),
      peerkey: this.swarm.keyPair.publicKey.toString('hex'),
      prime: true,
      topic: topicGeneration,
      codename: codeName,
      data: topicGeneration
    }

    this.emit('topic-formed-save', topicShare)
    this.emit('warmpeer-match', peerContract, topicShare)
  }

  peerJoin (peerContext) {
    this.checkTimerConnection(peerContext.publickey)
    this.peerHolder[peerContext.publickey] = peerContext
    const noisePublicKey = Buffer.from(peerContext.publickey, 'hex')
    if (noisePublicKey.length === 32) {
      this.swarm.joinPeer(noisePublicKey, { server: true, client: false })
    }
  }

  checkTimerConnection (key) {
    setTimeout(() => {
      if (this.peerConnect[key] === undefined && !Object.keys(this.peerConnect).length) {
        this.emit('peer-share-fail', key)
      }
    }, 6000)
  }

  peerLeave (peerLeaveKey) {
    this.peerHolder[peerLeaveKey] = {}
    this.swarm.leavePeer(peerLeaveKey)
  }

  peerAlreadyJoinSetData (peerContext) {
    this.peerHolder[peerContext.publickey] = peerContext
    return true
  }

  peerJoinClient () {
    this.swarm.listen()
  }

  async topicConnect (peerID, topic) {
    const noisePublicKey = Buffer.from(topic, 'hex')
    if (noisePublicKey.length === 32) {
      const topicKeylive = noisePublicKey.toString('hex')
      this.topicHolder[topic] = {
        role: 'server',
        livePubkey: this.swarm.keyPair.publicKey.toString('hex'),
        topic,
        key: topicKeylive,
        timestamp: ''
      }
      this.sendTopicHolder.push({
        livePubkey: this.swarm.keyPair.publicKey.toString('hex'),
        peerKey: peerID,
        topic
      })
      const peerConnect = this.swarm.join(noisePublicKey, { server: true, client: false })
      this.discoveryList.push({ peerKey: peerID, topic, discovery: peerConnect })
      await peerConnect.flushed()
    }
  }

  async topicListen (topic, peerKey) {
    const noisePublicKey = Buffer.from(topic, 'hex')
    if (noisePublicKey.length === 32) {
      const topicKeylive = noisePublicKey.toString('hex')
      this.topicHolder[topic] = {
        role: 'client',
        topic,
        key: topicKeylive,
        peerKey,
        timestamp: ''
      }
      const peerConnect = this.swarm.join(noisePublicKey, { server: false, client: true })
      this.discoveryList.push({ peerKey, topic, discovery: peerConnect })
      await this.swarm.flush()
    }
  }

  async leaveTopic (topic) {
    await this.swarm.leave(topic)
  }
}

export default NetworkPeers