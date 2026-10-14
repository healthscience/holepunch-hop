'use strict'

import EventEmitter from 'events'
import b4a from 'b4a'
import crypto from 'crypto'

import { PeerProtocol } from './osmosis/protocol.js'

class NetworkPeers extends EventEmitter {
  constructor (store, swarm, options = {}) {
    super()
    this.hello = 'hyperpeers'
    this.store = store
    this.swarm = swarm
    this.getPublicManifest = options.getPublicManifest

    // Streamlined RAM State Maps
    this.activeSessions = new Map() // Map<peerHex, { conn, protocol }>

    // Scoped RAM state maps
    this.pendingPeers = new Map()
    this.pendingTopic = new Map()
    this.pendingNoidentity = new Map()
    this.savedPeers = new Map()
    this.warmPeers = new Map()
    // this.pendingInvites = new Map() // Map<codename, { pubkey, codename, name }>
    this.peerHolder = {}

    this._setupSwarm()
  }

  _setupSwarm () {
    this.swarm.on('connection', (conn, info) => {
      const peerHex = b4a.toString(info.publicKey, 'hex')

      const protocol = new PeerProtocol(conn, {
        publicKey: peerHex,
        localManifest: typeof this.getPublicManifest === 'function' ? this.getPublicManifest() : {},
        onMessage: (peerKey, payload) => this.handlePeerControl(peerKey, payload),
        onOsmosis: (peerKey, frame) => this.handlePeerOsmosis(peerKey, frame)
      })

      this.activeSessions.set(peerHex, { conn, protocol })

      if (this.store && typeof this.store.replicate === 'function') {
        this.store.replicate(conn)
      }

      this._evaluateConnection(info, peerHex)

      conn.on('close', () => {
        this.activeSessions.delete(peerHex)
        delete this.peerHolder[peerHex]
        this.emit('peer-disconnect', { publickey: peerHex })
        this.emit('peer-disconnected', peerHex)
      })

      conn.on('error', (err) => {
        this.emit('peer-error', { peerHex, error: err })
      })
    })
  }

  networkKeys () {
    const peerNxKeys = {
      publickey: b4a.toString(this.swarm.keyPair.publicKey, 'hex')
    }
    const networkMessage = {
      type: 'account',
      action: 'network-keys',
      data: peerNxKeys
    }
    this.emit('peer-network', networkMessage)
    this.swarm.listen()
  }

  setupConnectionBegin (peerNetwork) {
    if (!Array.isArray(peerNetwork)) return
    for (let i = 0; i < peerNetwork.length; i++) {
      const sPeer = peerNetwork[i]
      const hexKey = typeof sPeer.key === 'string' ? sPeer.key : b4a.toString(sPeer.key, 'hex')
      const concept = sPeer.value && sPeer.value.concept
      this.savedPeers.set(hexKey, sPeer)

      if (concept && concept.settopic === true) {
        this.topicConnect(hexKey, concept.topic)
      } else if (concept && concept.topic) {
        this.topicListen(concept.topic, hexKey)
      }
    }
  }

  /**
   *  evaluate connection as the happen on Swarm
   * @method _evaluateConnection
   * @param {} info 
   * @param {*} peerHex 
   */
  _evaluateConnection (info, peerHex) {
    // console.log('[Transport] Connection established:', peerHex, 'Is Client:', info.client)

    if (info.client) {
      // Acceptor / Dialer Path: Check if this connection maps to a pending invite
      const pendingRecord = this.matchPendingTopic(peerHex)

      if (pendingRecord) {
        // Transmit the codename to unlock the remote Generator's pendingPeers map
        this.warmPeerIdentityPrepare(peerHex, pendingRecord)

      } else {
        // check if existing warm peer
        // Extract topic from connection metadata
        const topicBuffer = info.topics && info.topics[0]
        const topicHex = topicBuffer ? b4a.toString(topicBuffer, 'hex') : null

        if (topicHex) {
          const matchedPeerRecord = this.findPeerByTopic(topicHex)
          if (matchedPeerRecord) {
            
            this.warmPeers.set(peerHex, { record: matchedPeerRecord })

            this.writeTonetworkData(peerHex, {
              type: 'peer-reconnect-resume',
              data: { topic: topicHex }
            })

            this.emit('peer-reconnected', {
              publickey: peerHex,
              topic: topicHex,
              record: matchedPeerRecord
            })
            return
          }
        }
      }
    } else {
      // update pending to show connection established
      this.pendingSetNoidentity(peerHex, info.client)
      // Do not force a lookup here; wait for the incoming peer-codename-inform packet.
    }
  }

  /**
   * pick up incoming messages from warm peers and route
   * @method handlePeerControl
   * @param {*} peerKey 
   * @param {*} netData 
   */
  handlePeerControl (peerKey, netData) {
    
    if (netData && netData.type === 'peer-codename-inform') {
      this.codenameMatchIdentity(peerKey, netData.data)
    }
    
    if (netData && netData.type === 'topic-reconnect-id') {
      this.matchTopicConfirm(peerKey, netData.data)
    }

    if (netData && netData.type === 'peer-reconnect-resume') {
      const topicHex = netData.data && netData.data.topic
      if (topicHex) {
        const matchedPeerRecord = this.findPeerByTopic(topicHex)
        if (matchedPeerRecord) {
          
          this.activeSessions.set(peerKey, { record: matchedPeerRecord })

          this.emit('peer-reconnected', {
            publickey: peerKey,
            topic: topicHex,
            record: matchedPeerRecord
          })
        }
      }
    }
  
  }


  // Peer generates invite token peer accept invite
  setPendingRole (stage, pubkey, codename, name) {
    let inviteStage = false
    if (stage === 'peer-share-codename' || stage === 'peer-share-invite') {
      inviteStage = true      
    }

    const stagingRecord = {
      key: pubkey,
      stages: { 
        inviteGenerated: inviteStage,
        codenameGenerated: false,
        connected: false,
        codenameMatched: false
      },
      setPendingRole: null,
      committedToDisk: false,
      concept: {
        name: name,
        codename: codename,
        publickey: pubkey,
        roletaken: null,
        longterm: true,
        settopic: false,
        topic: '',
        live: false
      }
    };

    if (stage === 'peer-share-codename') {
      this.pendingPeers.set(codename, stagingRecord);
    } else if (stage === 'peer-share-invite') {
      this.pendingTopic.set(pubkey, stagingRecord);
      // peer connection activate
      this.peerJoin(pubkey, stagingRecord)
    }
  }

  // incoming connection but not matched to any invite identity yet
  pendingSetNoidentity (publicKey, role) {
    let noIdentity = {}
    noIdentity.publickey = publicKey
    noIdentity.client = role
    this.pendingNoidentity.set(publicKey, noIdentity)
  }

  // Peer generates invite token peer accept invite
  updatePendingTopic (publicKey) {
    // get existing pending pendingPeers or pendingTopic
    let existingPending = this.pendingTopic.get(publicKey)
    existingPending.stages.connected = true
    existingPending.stages.codenameGenerated = true
    // update pending MAP state
    this.pendingTopic.set(publicKey, existingPending)
  }

  // Peer confirm codename match to invite
  updatePendingPeers (publicKey) {
    // get existing pending pendingPeers or pendingTopic
    let existingPending = this.pendingPeers.get(publicKey)
    existingPending.stages.codenameMatched = true
    // update pending MAP state
    this.pendingPeers.set(publicKey, existingPending)
  }

  findPeerByTopic (topicHex) {
    for (const [key, record] of this.savedPeers.entries()) {
      const storedTopic = record.value?.concept?.topic || record.concept?.topic
      if (storedTopic === topicHex) {
        return record
      }
    }
    return null
  }

  // assess all the peer record stages and confirm completion
  peerRecordAssess (pendingType, publicKey, codename) {
    let liveRecord = {}
    if (pendingType === 'peer') {
      liveRecord = this.pendingPeers.get(codename)
    } else if (pendingType === 'topic') {
      liveRecord = this.pendingTopic.get(publicKey)
    }

    let stagesConfirm = false

    if (pendingType === 'peer') {
      // check if connected?
      if (liveRecord.stages.connected === false) {
        // check the identiy connect for
        let liveConnection = this.pendingNoidentity.get(publicKey)
        if (liveConnection) {
          if (liveRecord.stages.inviteGenerated === true && liveRecord.stages.codenameMatched ===  true ) {
            stagesConfirm = true
          }
        }
      }
    }

    if (pendingType === 'topic') {
      // check if connected?
      if (liveRecord.stages.connected === true) {
        // check the identiy connect for
        if (liveRecord.stages.inviteGenerated === true && liveRecord.stages.codenameGenerated ===  true ) {
          stagesConfirm = true
        }
      }
    }
    let confirmPeer = {}
    confirmPeer.confirm = stagesConfirm
    confirmPeer.record = liveRecord
    return confirmPeer
  }

  handlePeerOsmosis (peerKey, frame) {
    if (this.hyperbee && this.hyperbee.osmosis && typeof this.hyperbee.osmosis.receiveOsmosisFrame === 'function') {
      this.hyperbee.osmosis.receiveOsmosisFrame(peerKey, frame)
    }

    if (this.hyperbee && typeof this.hyperbee.emitSafeflowQuery === 'function') {
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

  /**
   * 
   * @mehthod matchPendingTopic
   * @param {*} stage 
   * @param {*} peerPubkey 
   * @param {*} peerData 
   * @returns 
  */
   matchPendingTopic (publicKey) {
    // pendinTipc map
    let pendingTopicMatch = this.pendingTopic.get(publicKey)
    return pendingTopicMatch

  }

  /**
   * 
   *  Sanitize pubkey in peer-codename-match before saving
   * 
  */
  codenameMatchIdentity (publicKey, data) {
    if (data && data.inviteCode) {
      const matchedCodename = this.matchPeersCodename(data.inviteCode)
      if (matchedCodename) {
        // update peerRecord
        this.updatePendingPeers(matchedCodename.concept.codename)
        // prepare the topic to reconnect with peer
        this.prepareTonetworkTopic(publicKey, matchedCodename)
      } else {
        console.log('STOP')
      }

    } 
  }

  updatePeerRecordTopic (publicKey, data) {
    // get the existing pending record
    let liveRecord = this.pendingTopic.get(publicKey)
    liveRecord.concept.settopic = false
    liveRecord.concept.topic = data.topic
  }

  setPeerRecordTopic (publicKey, data) {
    // get the existing pending record
    let liveRecord = this.pendingPeers.get(publicKey)
    liveRecord.concept.settopic = true
    liveRecord.concept.topic = data.topic
  }

  /**
   *  
   * 
  */
  matchTopicConfirm(publicKey, data) {
    // update peer record for topic
    this.updatePeerRecordTopic(publicKey, data)
    // peerRecord assess and then allow saving if all complete
    let checkRecord = this.peerRecordAssess('topic', publicKey, '')
    if (checkRecord.confirm === true) {
      this.emit('peer-record-formed-accept', checkRecord.record)
    } else {
      // inform beebee peer connection has not been established

      // remove pending

    }
  }  

  async handleCodenameArrival(peerKey, codenameData) {
    const record = this.warmPeers.get(peerKey);
    if (!record) return;

    // Resolve identity
    const matched = this.matchPeersCodename(codenameData);
    if (matched && matched.name) {
      record.concept.name = matched.name;
      record.stages.codenameMatched = true;
    }

    // Check if fully staged
    if (record.stages.inviteGenerated && record.stages.connected && record.stages.codenameMatched && !record.committedToDisk) {
      record.committedToDisk = true;

      // ATOMIC COMMITTED SAVE TO HYPERBEE
      const formedContract = this.libComposer.livePeer.peerPrepare('hopeer', record.concept);
      await this.BeeData.savePeer(formedContract);

      // Safe to emit downstream now that state is complete and persisted
      this.emit('peer-codename-update', {
        contractKey: peerKey,
        name: record.concept.name
      });
    }
  }


  latestPeerNetwork (peerNetwork) {
    this.setupConnectionBegin(peerNetwork)
  }

  peerJoin (publicKey, stagingRecord) {
    if (!publicKey || !stagingRecord) return
    this.peerHolder[publicKey] = stagingRecord
    const noisePublicKey = b4a.from(publicKey, 'hex')
    if (noisePublicKey.length === 32) {
      this.swarm.joinPeer(noisePublicKey, { server: true, client: true })
    }
  }

  peerLeave (peerLeaveKey) {
    delete this.peerHolder[peerLeaveKey]
    const noisePublicKey = b4a.from(peerLeaveKey, 'hex')
    if (noisePublicKey.length === 32) {
      this.swarm.leavePeer(noisePublicKey)
    }
  }

  peerAlreadyJoinSetData (peerContext) {
    if (peerContext && peerContext.publickey) {
      this.peerHolder[peerContext.publickey] = peerContext
      return true
    }
    return false
  }

  matchPeersCodename (codenameID) {
    let peerMatch = this.pendingPeers.get(codenameID)
    return peerMatch
  }

  inviteDecoded (invite) {
    const raw = typeof invite === 'string'
      ? invite
      : ((invite && (invite.invite || invite.publickey)) || '')

    const splitInvite = []

    if (typeof raw === 'string' && raw.includes(':')) {
      const parts = raw.split(':')
      const prefix = parts[0]
      const hexString = parts[1]
      if (prefix === 'hop' && hexString) {
        const next32Bytes = hexString.slice(0, 64)
        const remainder = hexString.slice(64)
        splitInvite.push('hop', next32Bytes, remainder)
        return splitInvite
      }
    }

    const pubKeyFallback = (invite && invite.publickey) ? invite.publickey : raw
    const codenameFallback = (invite && invite.codename) ? invite.codename : ''
    splitInvite.push('hop', pubKeyFallback, codenameFallback)
    return splitInvite
  }

  checkConnectivityStatus (message, warmPeers = [], decodePath) {
    const ptopStatus = {}
    if (!message || !message.data) return ptopStatus

    if (decodePath === 'invite-gen') {
      const parts = this.inviteDecoded(message.data)
      if (typeof message.data === 'string' || (message.data && message.data.invite)) {
        message.data = { publickey: parts[1], codename: parts[2] }
      } else {
        message.data.publickey = parts[1]
        message.data.codename = parts[2]
      }
    }

    const targetKey = message.data.publickey
    const isLive = targetKey ? this.activeSessions.has(targetKey) : false

    let matchedRole = null
    if (targetKey) {
      // matchedRole = this.matchCodename(targetKey)
    }

    ptopStatus.peer = {}
    ptopStatus.existing = false
    ptopStatus.live = isLive
    ptopStatus.role = matchedRole ? matchedRole.role : null
    ptopStatus.data = message.data
    ptopStatus.action = message.action
    ptopStatus.task = message.task

    return ptopStatus
  }

  broadcastOsmosis (heliAngle, entropy, ecsVectorBuffer, action = 0) {
    for (const session of this.activeSessions.values()) {
      session.protocol.sendOsmosis(heliAngle, entropy, ecsVectorBuffer, action)
    }
  }

  getChannel (publickey) {
    const session = this.activeSessions.get(publickey)
    return session ? session.protocol : null
  }

  /**
   * prepare message to identify connection i.e. info other peer of codename from inite
   * @method warmPeerIdentityPrepare
   * @param {*} data 
   * @param {*} existing 
  */
  warmPeerIdentityPrepare (publicKeyInvitee, identityCode) {
    const codenameInform = {
      type: 'peer-codename-inform',
      action: 'set',
      data: {
        inviteCode: identityCode.concept.codename,
        publickey: this.swarm.keyPair.publicKey.toString('hex'),
        peerkey: publicKeyInvitee //  peerkey what other peer is looking for
      }
    }
    // update status of stages 
    this.updatePendingTopic(publicKeyInvitee)
    this.writeTonetworkData(publicKeyInvitee, codenameInform)
  }


  writeTonetwork (data) {
    const targetKey = typeof data === 'string' ? data : data.publickey
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
    const channel = this.getChannel(topicInfo.currentPubkey || publickey)
    if (channel) channel.sendControl(topicReconnectMessage)
  }

  prepareTonetworkTopic (publicKey, peerRecord) {
    const topicGeneration = crypto.randomBytes(32).toString('hex')

    const topicShare = {
      type: 'topic-reconnect',
      peercontract: peerRecord,
      publickey: b4a.toString(this.swarm.keyPair.publicKey, 'hex'),
      peerkey: b4a.toString(this.swarm.keyPair.publicKey, 'hex'),
      prime: true,
      topic: topicGeneration,
      codename: peerRecord.concept.codename,
      data: topicGeneration
    }
    // inform peer of topic
    this.writeTopicReconnect(publicKey, topicShare)

    // update Peer Record
    this.setPeerRecordTopic(peerRecord.concept.codename, topicShare)

    let confirmRecord = this.peerRecordAssess('peer', publicKey, peerRecord.concept.codename)
    if (confirmRecord.confirm === true ) {
      this.emit('peer-record-formed', confirmRecord.record)
    } else {
      // inform peer connection failed
      console.log('end')
    }
    // upgrade to warm peer
  }

  async topicConnect (peerID, topic) {
    const noisePublicKey = b4a.from(topic, 'hex')
    if (noisePublicKey.length === 32) {
      const peerConnect = this.swarm.join(noisePublicKey, { server: true, client: true })
      await peerConnect.flushed()
    }
  }

  async topicListen (topic, peerKey) {
    const noisePublicKey = b4a.from(topic, 'hex')
    if (noisePublicKey.length === 32) {
      this.swarm.join(noisePublicKey, { server: true, client: true })
      await this.swarm.flush()
    }
  }

  async leaveTopic (topic) {
    const noisePublicKey = b4a.from(topic, 'hex')
    if (noisePublicKey.length === 32) {
      await this.swarm.leave(noisePublicKey)
    }
  }
}

export default NetworkPeers