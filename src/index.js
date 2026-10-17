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
    this.wsocket = null
    this.osmosis = null

    this.setStorename(storeName)
    this.ready = this.startHolepunch().catch(err => this.emit('error', err))
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
      for (let i = 0; i < modules.length; i++) {
        const mod = modules[i]
        if (this.BeeData[mod]) {
          this.BeeData[mod].crypto = crypto
        }
      }
    }
  }

  async startHolepunch () {
    const storagePath = path.join(os.homedir(), this.peerStore)
    this.store = new Corestore(storagePath)
    this.swarm = new Hyperswarm()

    this.osmosis = createOsmosisMembrane(this.swarm, 100, 0)

    goodbye(() => this.swarm.destroy())

    this.BeeData = new BeeWorker(this.store, this.swarm, this.crypto)
    this.DriveFiles = new DriveWorker(this.store, this.swarm)
    this.Peers = new PeerWorker(this.store, this.swarm, {
      getPublicManifest: () => this.BeeData.getPublicManifest()
    })

    this.networkListeners()
  }

  async activateHypercores () {
    await this.ready

    if (this.BeeData && typeof this.BeeData.setupHyperbee === 'function') {
      await this.BeeData.setupHyperbee()
    } else if (this.BeeData && typeof this.BeeData.ready === 'function') {
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
      if (keyLiveMatch && keyLiveMatch.value && keyLiveMatch.value.concept && keyLiveMatch.value.concept.publickey) {
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

    this.Peers.on('peer-topic-set', async (data) => {
      if (data && data.peercontract) {
        this.topicExchange.set(data.peercontract, data)
      }
    })

    this.Peers.on('peer-reconnect-topic-id', (peerIn, data) => {
      const peerMatch = this.Peers.matchPeerTopic(data.topic)
    })

    // save the topic
    this.Peers.on('peer-record-formed', (peerRecord) => {
      if (peerRecord) {
        // save
        this.saveHelper(peerRecord)
        // inform beebee BentoBoxDS
        // this.emit('peer-reconnect-topic-notify', peerRecord);
      }
    });

    // save the topic
    this.Peers.on('peer-record-formed-accept', (peerRecord) => {
      if (peerRecord) {
        // save
        this.saveHelper(peerRecord)
        // inform beebee BentoBoxDS
        // this.emit('peer-reconnect-topic-notify', peerRecord);
      }
    });

    this.Peers.on('peer-reconnected', (data) => {

      this.wsocket.send(JSON.stringify({
        type: 'account',
        action: 'peer-reconnected-verify',
        data: {
          publickey: data.publickey,
          topic: data.topic,
          name: data.record?.value?.concept?.name || data.record?.concept?.name
        }
      }))

    })


    this.Peers.on('beebee-data', (data) => {
      this.emit('peer-topeer', data)
    })

    this.Peers.on('cuespace-notification', (data) => {
      this.emit('peer-cuespace', data)
      const n1Contracts = data && data.data && data.data.data && data.data.data.content && data.data.data.content.bbn1 && data.data.data.content.bbn1.publicN1contracts
      if (Array.isArray(n1Contracts) && n1Contracts.length > 0) {
        for (let i = 0; i < n1Contracts.length; i++) {
          this.BeeData.replicateQueryPubliclibrary({ data: n1Contracts[i] })
        }
      }
    })

    this.Peers.on('publiclibrary-notification-manifest', async (warmPeerPK) => {
      const rawManifests = this.Peers.peerManifests.get(warmPeerPK)
      if (!rawManifests) return

      const approvedManifests = await this.osmosis.filterIngress('public-library', rawManifests)
      if (!approvedManifests) return

      const libraryList = Array.isArray(approvedManifests) ? approvedManifests : [approvedManifests]

      for (let i = 0; i < libraryList.length; i++) {
        const libManifest = libraryList[i]
        if (libManifest.store === 'bentocues') {
          await this.BeeData.replicateQueryPubliclibrary({
            peerKey: warmPeerPK,
            beeKey: libManifest.pubkey || libManifest.beeKey,
            store: libManifest.store,
            manifest: libManifest
          })
        }
      }

      if (this.wsocket) {
        this.wsocket.send(JSON.stringify({
          type: 'osmosis',
          action: 'osmosis-replication-complete',
          completed: true,
          store: 'bentocues'
        }))
      }
    })

    this.Peers.on('publiclibrary-notification-manifest', async (warmPeerPK) => {
      const rawManifests = this.Peers.peerManifests.get(warmPeerPK)
      if (!rawManifests) return

      const approvedManifests = await this.osmosis.filterIngress('public-library', rawManifests)
      if (!approvedManifests) return

      const libraryList = Array.isArray(approvedManifests) ? approvedManifests : [approvedManifests]

      for (let i = 0; i < libraryList.length; i++) {
        const libManifest = libraryList[i]
        if (libManifest.store === 'bentocues') {
          await this.BeeData.replicateQueryPubliclibrary({
            peerKey: warmPeerPK,
            beeKey: libManifest.pubkey || libManifest.beeKey,
            store: libManifest.store,
            manifest: libManifest
          })
        }
      }

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
      const targetPeerKey = data.targetPeerKey
      const stores = data.stores
      if (!targetPeerKey || !stores) return

      // 1. Retrieve Peer 1's full manifest list
      const publicManifests = this.Peers.peerManifests.get(targetPeerKey)
      if (!publicManifests || !Array.isArray(publicManifests)) {
        console.warn(`[osmosis] No valid public manifest list found for peerKey: ${targetPeerKey}`)
        return
      }

      const targetStores = Array.isArray(stores) ? stores : [stores]
      const manifestsToSync = []

      // 2. Loop through the incoming request and map each requested store to its manifest
      for (const storeName of targetStores) {
        const matchingManifest = publicManifests.find(m => m.store === storeName)
        if (matchingManifest) {
          manifestsToSync.push(matchingManifest)
        } else {
          console.warn(`[osmosis] Warning: Requested store "${storeName}" has no matching manifest in cache.`)
        }
      }

      console.log(`[osmosis] Built sync array with ${manifestsToSync.length} manifest(s).`)

      // 3. Sequentially process and replicate each matched store
      for (let i = 0; i < manifestsToSync.length; i++) {
        const manifest = manifestsToSync[i]
        const passed = await this.osmosis.filterIngress('public-library', manifest)
        if (!passed) continue

        await this.BeeData.replicateQueryPubliclibrary({
          peerKey: targetPeerKey,
          beeKey: manifest.pubkey || manifest.beeKey,
          store: manifest.store,
          manifest
        })
      }

      // 4. Dispatch completion signal once all loops finish
      if (this.wsocket) {
        this.wsocket.send(JSON.stringify({
          type: 'osmosis',
          action: 'osmosis-replication-complete',
          store: targetStores[0],
          stores: targetStores,
          completed: true
        }))
      }
    })

    this.BeeData.on('osmosis-notification', (data) => {
      this.emit('beebee-publib-notification', data)
    })

    this.BeeData.on('publib-replicate-notification', (data) => {
      console.log('inform beebee osmosis replication 0000000')
      this.emit('replicate-publib-notification', data)
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

  async saveHelper (peerRecord) {
   
    let libMessageout = {}
    libMessageout.type = 'library'
    libMessageout.action = 'account'
    libMessageout.reftype = 'new-peer-topic'
    libMessageout.privacy = 'private'
    libMessageout.task = 'PUT'
    libMessageout.data = peerRecord
    libMessageout.bbid = ''
    // await this.wiring.library.libManager.libraryManage(libMessageout)
    this.emit('peer-record-save', libMessageout)
  }

  async networkPath (message) {

    if (!message) return

    if (message.action === 'share') {
      const reEstablishShort = this.Peers.checkConnectivityStatus(message, [], 'invite-gen')
      if (message.task === 'peer-share-invite') {
        // peer accepts invite send from a peer
        this.Peers.setPendingRole('peer-share-invite', message.data.publickey, message.data.codename, message.data.name)

      } else if (message.task === 'peer-share-codename') {
        // peer generate hop address pubkey and codename
        this.Peers.setPendingRole('peer-share-codename', message.data.publickey, message.data.codename, message.data.name)


      } else if (message.task === 'peer-share-topic') {
        if (message.data && message.data.codename) {
          this.Peers.setRole({
            stage: 'peer-share-invite',
            pubkey: message.data.publickey,
            codename: message.data.codename,
            name: message.data.name
          })
        }

        const peerTopeerState = this.Peers.checkConnectivityStatus(message, [], 'share-path')

        if (peerTopeerState.live === false && peerTopeerState.existing === false) {
          // this.setWarmPeers(message.data)
          this.Peers.peerJoin(message.data)
        } else {
          // this.setWarmPeers(message.data)
          this.Peers.peerAlreadyJoinSetData(message.data)

          if (reEstablishShort.peer && reEstablishShort.peer.value && reEstablishShort.peer.value.settopic === true) {
            this.Peers.topicConnect(reEstablishShort.peer.value.topic)
          } else if (reEstablishShort.peer && reEstablishShort.peer.value && reEstablishShort.peer.value.topic) {
            this.Peers.topicListen(reEstablishShort.peer.value.topic, message.data.publickey)
          }
        }
      } else if (message.task === 'cue-space' || message.task === 'public-n1-experiment') {
        this.Peers.peerAlreadyJoinSetData(message.data)
      }
    } else if (message.action === 'retry') {
      if (message.data && message.data.value && message.data.value.concept && message.data.value.concept.settopic === true) {
        this.Peers.topicConnect(message.data.key, message.data.value.concept.topic)
      } else if (message.data && message.data.value && message.data.value.concept && message.data.value.concept.topic) {
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

  matchWarmSaveKey (saveKey) {

    return this.Peers.warmPeers.get(saveKey)
  }

  matchWarmSaveLiveKey (saveKey) {
    for (const peerSav of this.Peers.warmPeers.values()) {
      if (peerSav && peerSav.value && peerSav.value.concept && peerSav.value.concept.publickey === saveKey) {
        return peerSav
      }
    }
    return {}
  }

  async processCodenameMatching (data) {
    const codePeer = this.matchWarmSaveKey(data)
    if (!codePeer || !codePeer.value || !codePeer.value.concept) return

    const peerKey = codePeer.value.concept.publickey
    const cname = this.codenameUpdates.get(peerKey)

    if (cname) {
      const matchCodename = this.Peers.matchPeersCodename(cname)
      if (matchCodename) {
        matchCodename.peerkey = cname.data.peerkey
        matchCodename.contractKey = data
        // this.emit('peer-codename-update', matchCodename)
      }
      this.codenameUpdates.delete(peerKey)
    }
  }

  async flushConnections () {
    if (!this.swarm) return
    await this.swarm.flush()
    await Promise.all(Array.from(this.swarm.connections).map(e => e.flush()))
    await new Promise(resolve => setImmediate(resolve))
  }
}

export default HolepunchWorker