'use strict'

import EventEmitter from 'events'
import os from 'os'
import Corestore from 'corestore'
import Hyperswarm from 'hyperswarm'
import goodbye from 'graceful-goodbye'

import BeeWorker from './storage/bees.js'
import DriveWorker from './storage/drive.js'
import { NetworkPeers } from './network/peers.js'

class HolepunchWorker extends EventEmitter {
  constructor(storeName) {
    super()
    this.peerStore = storeName ? `.${storeName}` : '.hop-storage'
    this.warmPeers = []
    this.codenameUpdates = []
    this.topicExchange = []
    
    this.startHolepunch()
    this.networkListeners()
  }

  async startHolepunch() {
    this.store = new Corestore(`${os.homedir()}/${this.peerStore}`)
    this.swarm = new Hyperswarm()

    this.swarm.on('connection', conn => this.store.replicate(conn))
    goodbye(() => this.swarm.destroy())

    this.BeeData = new BeeWorker(this.store, this.swarm, this.crypto)
    this.DriveFiles = new DriveWorker(this.store, this.swarm, this.crypto)
    this.Peers = new NetworkPeers(this.store, this.swarm)
  }

  setHOPCrypto(crypto) {
    this.crypto = crypto
    if (this.BeeData) this.BeeData.crypto = crypto
    if (this.DriveFiles) this.DriveFiles.crypto = crypto
  }

  async activateHypercores() {
    await this.DriveFiles.peerDrive.setupHyperdrive()
    await this.DriveFiles.publicDrive.setupHyperdrive()
    await this.BeeData.setupHyperbee()
    
    // Acquire public library manifest for auto-exchange on connection open
    const publicManifest = this.BeeData.getPublicManifest()
    if (publicManifest) {
      this.Peers.setLocalPublicLibrary(publicManifest)
    }

    this.Peers.networkKeys()
    this.emit('hcores-active')
  }

  setWebsocket(ws) {
    this.wsocket = ws
    if (this.BeeData) this.BeeData.setWebsocket(ws)
    if (this.DriveFiles) this.DriveFiles.setWebsocket(ws)
  }

  networkListeners() {
    this.Peers.on('beebee-data', (data) => {
      this.emit('peer-topeer', data)
    })

    this.Peers.on('peer-network', (data) => {
      if (this.wsocket) this.wsocket.send(JSON.stringify(data))
    })

    this.Peers.on('publiclibrarynotification', (data) => {
      this.BeeData.replicateQueryPubliclibrary(data)
    })

    this.Peers.on('cuespace-notification', (data) => {
      this.emit('peer-cuespace', data)
      const bbn1 = data?.data?.data?.content?.bbn1?.publicN1contracts || []
      for (const n1Cont of bbn1) {
        this.BeeData.replicateQueryPubliclibrary({ data: n1Cont })
      }
    })

    // Integration hook for hop-osmosis
    this.Peers.on('osmosis-sync', (data) => {
      this.emit('hop-osmosis-state', data)
    })

    this.Peers.on('connect-warm-first', (data) => {
      const peerId = {
        name: 'not-matched',
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

    this.Peers.on('peer-disconnect', (data) => {
      this.emit('peer-disconnect-notify', data)
    })
  }

  async networkPath(message) {
    if (message.action === 'share') {
      if (['peer-share-invite', 'peer-share-topic'].includes(message.task)) {
        this.warmPeers.push(message.data)
        this.Peers.peerJoin(message.data)
      } else if (message.task === 'public-library-sync') {
        this.Peers.writeToPeer(message.data.publickey, {
          type: 'public-library',
          data: message.data
        })
      }
    } else if (message.action === 'peer-closed') {
      await this.swarm.destroy()
    }
  }
}

export default HolepunchWorker