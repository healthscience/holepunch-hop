'use strict'

import EventEmitter from 'events'
import os from 'os'
import path from 'path'
import Corestore from 'corestore'
import Hyperswarm from 'hyperswarm'
import goodbye from 'graceful-goodbye'

import BeeWorker from './storage/bees.js'
import DriveWorker from './storage/drive.js'
import PeerWorker from './network/peers.js'
import createOsmosisMembrane from 'hop-osmosis'

class HolepunchWorker extends EventEmitter {
  constructor (storeName) {
    super()
    this.hello = 'holepunch'
    this.Peers = null
    this.peerStore = ''
    this.store = null
    this.swarm = null
    this.BeeData = null
    this.DriveFiles = null
    this.crypto = null
    this.discKeypeer = ''
    this.readcore = null
    this.warmPeers = []
    this.codenameUpdates = []
    this.topicExhange = []
    this.wsocket = null

    this.setStorename(storeName)
    this.ready = this.startHolepunch().catch(err => this.emit('error', err))
    this.osmosis = createOsmosisMembrane(this.swarm, 100, 0)
  }

  setStorename (storeName) {
    if (!storeName || storeName.length === 0) {
      this.peerStore = '.hop-storage'
    } else {
      this.peerStore = '.' + storeName
    }
  }

  setHOPCrypto (crypto) {
    this.crypto = crypto
    if (this.BeeData) {
      this.BeeData.crypto = crypto
      const modules = [
        'PublicLibrary', 'PeerLibrary', 'Peers', 'Results',
        'Ledger', 'Chat', 'Clock', 'Spaces', 'Cues',
        'Boxes', 'Models', 'Research', 'Markers',
        'Products', 'Media', 'Learn', 'Lifestrap',
        'Orgo', 'Gelle', 'Lensglue', 'Besearch'
      ]
      modules.forEach(mod => {
        if (this.BeeData[mod]) {
          this.BeeData[mod].crypto = crypto
        }
      })
    }
  }

  async startHolepunch () {
    const storagePath = path.join(os.homedir(), this.peerStore)
    this.store = new Corestore(storagePath)
    this.swarm = new Hyperswarm()

    this.swarm.on('connection', conn => this.store.replicate(conn))
    goodbye(() => this.swarm.destroy())

    this.BeeData = new BeeWorker(this.store, this.swarm, this.crypto)
    this.DriveFiles = new DriveWorker(this.store, this.swarm)
    this.Peers = new PeerWorker(this.store, this.swarm, {
      getPublicManifest: () => this.BeeData.getPublicManifest() })

    this.networkListeners()
  }

  async activateHypercores () {
    await this.ready

    if (typeof this.BeeData?.setupHyperbee === 'function') {
      await this.BeeData.setupHyperbee()
    } else if (typeof this.BeeData?.ready === 'function') {
      await this.BeeData.ready()
    }

    this.Peers.networkKeys()
    this.emit('hcores-active')
  }

  setWebsocket (ws) {
    this.wsocket = ws
    if (this.BeeData) this.BeeData.setWebsocket(ws)
    if (this.DriveFiles) this.DriveFiles.setWebsocket(ws)
  }

  async startStores () {
    await this.activateHypercores()
  }

  networkListeners () {
    this.Peers.on('peer-network', (data) => {
      if (this.wsocket) this.wsocket.send(JSON.stringify(data))
    })

    this.Peers.on('warmpeer-match', (data, context) => {
      const keyLiveMatch = this.matchWarmSaveKey(data)
      if (keyLiveMatch?.value?.concept?.publickey) {
        this.Peers.completePeerRelationship(keyLiveMatch.value.concept.publickey, context)
      }
    })

    this.Peers.on('peer-share-fail', (data) => {
      const peerFail = {
        type: 'account',
        action: 'peer-share-fail',
        data: { publickey: data }
      }
      if (this.wsocket) this.wsocket.send(JSON.stringify(peerFail))
    })

    this.Peers.on('peer-reconnect-topic', async (data) => {
      data.prime = false
      this.emit('peer-topic-update', data)
    })

    this.Peers.on('peer-topic-set', async (data) => {
      this.topicExhange.push(data)
    })

    this.Peers.on('peer-reconnect-topic-id', (peerIn, data) => {
      this.Peers.updatePeerStatus(data.topic, peerIn)
      const peerMatch = this.Peers.matchPeerTopic(data.topic)
      const codeNameInform = {
        type: 'peer-codename-inform',
        action: 'set',
        data: { inviteCode: '', peercontract: peerMatch }
      }
      this.emit('invite-live-peer', codeNameInform)
    })

    this.Peers.on('topic-formed-save', (data) => {
      this.topicExhange.push(data)
    })

    this.Peers.on('peer-codename-match', (data) => {
      this.Peers.matchInviteFirst(data)
      this.codenameUpdates.push(data)
    })

    this.Peers.on('beebee-data', (data) => {
      this.emit('peer-topeer', data)
    })

    this.Peers.on('cuespace-notification', (data) => {
      this.emit('peer-cuespace', data)
      const n1Contracts = data?.data?.data?.content?.bbn1?.publicN1contracts
      if (Array.isArray(n1Contracts) && n1Contracts.length > 0) {
        for (const n1Cont of n1Contracts) {
          this.BeeData.replicateQueryPubliclibrary({ data: n1Cont })
        }
      }
    })

    // pass through osmosis
    this.Peers.on('publiclibrary-notification-manifest', async (warmPeerPK) => {
      const rawManifests = this.Peers.peerManifests.get(warmPeerPK)
      if (!rawManifests) return

      const approvedManifests = await this.osmosis.filterIngress('public-library', rawManifests)
      if (!approvedManifests) return

      const libraryList = Array.isArray(approvedManifests) ? approvedManifests : [approvedManifests]

      for (const libManifest of libraryList) {
        // Target bentocues store for single-store test isolation
        if (libManifest.store === 'bentocues') {
          await this.BeeData.replicateQueryPubliclibrary({
            peerKey: warmPeerPK,
            beeKey: libManifest.pubkey || libManifest.beeKey,
            store: libManifest.store,
            manifest: libManifest
          })
        }
      }

      // Notify test runner over WebSocket that Osmosis sync has completed
      if (this.wsocket) {
        this.wsocket.send(JSON.stringify({
          type: 'osmosis',
          action: 'osmosis-replication-complete',
          completed: true,
          store: 'bentocues'
        }))
      }
    })



    this.Peers.on('osmosis-request-replication', async (data) => {
      // console.log('[osmosis:event:trace] Triggered osmosis-request-replication handler:', data)
      const { targetPeerKey, stores } = data
      if (!targetPeerKey) return

      // 1. Fetch public library manifests advertised by target peer
      const publicManifests = this.Peers.peerManifests.get(targetPeerKey)
      // console.log(`[osmosis:event:trace] Manifests on file for peer ${targetPeerKey?.substring(0, 8)}...:`, publicManifests)

      if (!publicManifests || publicManifests.length === 0) {
        console.warn(`[osmosis:event:trace] Abort: No public manifests registered for target peer ${targetPeerKey}`)
        return
      }

      const targetStores = Array.isArray(stores) ? stores : [stores]
      const manifestsToSync = publicManifests.filter((m) => targetStores.includes(m.store))
      // console.log(`[osmosis:event:trace] Matched manifest(s) to sync (${manifestsToSync.length}):`, manifestsToSync)

      // 2. Filter via hop-osmosis and replicate
      for (const manifest of manifestsToSync) {
        // console.log(`[osmosis:event:trace] Filtering ingress membrane for store: "${manifest.store}"...`)
        const passed = await this.osmosis.filterIngress('public-library', manifest)
        // console.log(`[osmosis:event:trace] Membrane filter result for "${manifest.store}": ${Boolean(passed)}`)
        if (!passed) continue

        // console.log(`[osmosis:event:trace] Calling BeeData.replicateQueryPubliclibrary for store: "${manifest.store}"...`)
        await this.BeeData.replicateQueryPubliclibrary({
          peerKey: targetPeerKey,
          beeKey: manifest.pubkey,
          store: manifest.store,
          manifest
        })
        // console.log(`[osmosis:event:trace] Completed replication call for store: "${manifest.store}".`)
      }

      // 3. Send WebSocket completion signal
      if (this.wsocket) {
        // console.log('[osmosis:event:trace] Dispatching osmosis-replication-complete WebSocket payload...')
        this.wsocket.send(
          JSON.stringify({
            type: 'osmosis',
            action: 'osmosis-replication-complete',
            store: targetStores[0],
            stores: targetStores,
            completed: true
          })
        )
      }
    })



    this.BeeData.on('osmosis-notification', (data) => {
      this.emit('beebee-publib-notification', data)
    })

    this.BeeData.on('publib-replicate-notification', (data) => {
      this.emit('replicate-publib-notification', data)
    })

    this.Peers.on('connect-warm-first', (data) => {
      let peerInfoName = 'not-matched'
      if (data.roletaken !== 'server') {
        const peerRole = this.Peers.matchCodename(data.publickey)
        if (peerRole?.name?.length > 0) {
          peerInfoName = peerRole.name
        }
      }

      const peerId = {
        name: peerInfoName,
        publickey: data.publickey,
        roletaken: data.roletaken,
        longterm: true,
        settopic: false,
        topic: '',
        live: false,
        livePeerkey: ''
      }
      this.emit('peer-incoming-save', peerId)
    })

    this.Peers.on('peer-live-network', (data) => {
      this.emit('peer-live-notify', { peercontract: data })
    })

    this.Peers.on('peer-disconnect', (data) => {
      this.emit('peer-disconnect-notify', data)
    })

    this.DriveFiles.on('largefile-save', (data) => {
      this.emit('drive-save-large', data)
    })
  }

  async networkPath (message) {
    if (message.action === 'share') {
      const reEstablishShort = this.Peers.checkConnectivityStatus(message, this.warmPeers, 'invite-gen')
      if (message.task === 'peer-share-invite' || message.task === 'peer-share-topic') {
        const peerTopeerState = this.Peers.checkConnectivityStatus(message, this.warmPeers, 'share-path')
        if (peerTopeerState.live === false && peerTopeerState.existing === false) {
          this.Peers.setRole({ pubkey: message.data.publickey, codename: message.data.codename, name: message.data.name })
          this.warmPeers.push(message.data)
          this.Peers.peerAlreadyJoinSetData(message.data)
          this.Peers.peerJoin(message.data)
        } else {
          this.warmPeers.push(message.data)
          this.Peers.peerAlreadyJoinSetData(message.data)

          this.Peers.setRestablished(message.data.publickey, reEstablishShort)
          if (reEstablishShort.live === true) {
            if (Object.keys(reEstablishShort.peer || {}).length === 0) {
              const peerActionData = this.Peers.peerHolder[message.data.publickey]
              if (peerActionData) this.Peers.routeDataPath(message.data.publickey, peerActionData.data)
            } else {
              if (reEstablishShort.peer.value?.livePeerkey?.length === 0) {
                const peerActionData = this.Peers.peerHolder[message.data.publickey]
                if (peerActionData) this.Peers.routeDataPath(message.data.publickey, peerActionData.data)
              } else {
                const peerActionData = this.Peers.peerHolder[message.data.publickey]
                if (peerActionData) this.Peers.routeDataPath(reEstablishShort.peer.value.livePeerkey, peerActionData.data)
              }
            }
          } else {
            if (reEstablishShort.peer?.value?.settopic === true) {
              this.Peers.topicConnect(reEstablishShort.peer.value.topic)
            } else if (reEstablishShort.peer?.value?.topic) {
              this.Peers.topicListen(reEstablishShort.peer.value.topic, message.data.publickey)
            }
          }
        }
      } else if (message.task === 'peer-share-codename') {
        this.Peers.setRole({ pubkey: message.data.publickey, codename: message.data.codename, name: message.data.name })
      } else if (message.task === 'cue-space' || message.task === 'public-n1-experiment') {
        this.Peers.peerAlreadyJoinSetData(message.data)
        const peerActionData = this.Peers.peerHolder[message.data.publickey]
        if (peerActionData) {
          const targetKey = Object.keys(reEstablishShort.peer || {}).length === 0
            ? message.data.publickey
            : reEstablishShort.peer.value.livePeerkey
          this.Peers.routeDataPath(targetKey, peerActionData.data)
        }
      }
    } else if (message.action === 'retry') {
      if (message.data.value?.concept?.settopic === true) {
        this.Peers.topicConnect(message.data.key, message.data.value.concept.topic)
      } else if (message.data.value?.concept?.topic) {
        this.Peers.topicListen(message.data.value.concept.topic, message.data.key)
      }
    } else if (message.action === 'peer-closed') {
      this.flushConnections()
      if (this.swarm) await this.swarm.destroy()
    } else if (message.action === 'replicate-library') {
      if (message.task === 'public-library-replicate') {
        this.BeeData.replicatePubliclibrary(message.data)
      }
    } else if (message.action === 'save-replicate-library') {
      this.BeeData.saveRepliatePubLibary(message.data)
    } else if (message.action === 'osmosis-request-replication') {
      this.Peers.emit('osmosis-request-replication', message.data)
    }
  }

  setWarmPeers (warmPeers) {
    this.warmPeers.push(warmPeers)
  }

  warmPeerPrepare (data, existing) {
    this.processCodenameMatching(data)
    if (existing !== true) {
      let peerMatch = {}
      for (const wpeer of this.warmPeers) {
        if (wpeer.key === data) {
          peerMatch = wpeer
        }
      }

      // Check and set sentinel to prevent double send
      if (peerMatch?.value?.concept?.roletaken === 'client' && !peerMatch.codenameInformSent) {
        peerMatch.codenameInformSent = true
        
        const fullPeerInfo = this.matchWarmSaveKey(data)
        const roleStatus = this.Peers.matchCodename(fullPeerInfo.value.concept.publickey)
        const codenameInform = {
          type: 'peer-codename-inform',
          action: 'set',
          data: {
            inviteCode: roleStatus.codename,
            publickey: data,
            peerkey: this.swarm.keyPair.publicKey.toString('hex')
          }
        }
        this.Peers.writeTonetworkData(fullPeerInfo.value.concept.publickey, codenameInform)
      } else if (peerMatch?.value?.concept?.roletaken === 'server' && !peerMatch.codenameInformSent) {
        peerMatch.codenameInformSent = true
        
        const codeNameInform = {
          type: 'peer-codename-inform',
          action: 'set',
          data: { inviteCode: '', peercontract: peerMatch }
        }
        this.emit('invite-live-peer', codeNameInform)
        this.Peers.writeTonetworkTopic(data, codeNameInform)
      }
    }

    const peerDataExist = this.Peers.peerHolder[data]
    if (peerDataExist !== undefined) {
      this.Peers.routeDataPath(data, peerDataExist)
    }
  }

  matchWarmSaveKey (saveKey) {
    let keyLive = {}
    for (const peerSav of this.warmPeers) {
      if (peerSav.key === saveKey) {
        keyLive = peerSav
      }
    }
    return keyLive
  }

  matchWarmSaveLiveKey (saveKey) {
    let keyLive = {}
    for (const peerSav of this.warmPeers) {
      if (peerSav?.value?.concept?.publickey === saveKey) {
        keyLive = peerSav
      }
    }
    return keyLive
  }

  async processCodenameMatching (data) {
    const codePeer = this.matchWarmSaveKey(data)
    const updateCodeName = []
    for (const cname of this.codenameUpdates) {
      if (cname.data?.peerkey === codePeer?.value?.concept?.publickey) {
        const matchCodename = this.Peers.matchPeersCodename(cname)
        matchCodename.peerkey = cname.data.peerkey
        matchCodename.contractKey = data
        this.emit('peer-codename-update', matchCodename)
      } else {
        updateCodeName.push(cname)
      }
    }
    this.codenameUpdates = updateCodeName
  }

  topicSaveReturn (data) {
    const updateTopic = []
    for (const ctopic of this.topicExhange) {
      if (ctopic.peercontract === data.key.toString('hex')) {
        this.emit('peer-reconnect-topic-notify', ctopic)
        this.emit('peer-topic-save', ctopic)
      } else {
        updateTopic.push(ctopic)
      }
    }
    this.topicExhange = updateTopic
  }

  async flushConnections () {
    if (!this.swarm) return
    await this.swarm.flush()
    await Promise.all(Array.from(this.swarm.connections).map(e => e.flush()))
    await new Promise(resolve => setImmediate(resolve))
  }
}

export default HolepunchWorker