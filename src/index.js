'use strict'
/**
*  Holepunch data interface
*
* @class HolepunchWorker
* @package    HolepunchWorker
* @copyright  Copyright (c) 2022 James Littlejohn
* @license    http://www.gnu.org/licenses/old-licenses/gpl-3.0.html
* @version    $Id$
*/
import EventEmitter from 'events'
import os from 'os'
import Corestore from 'corestore'
import Hyperswarm from 'hyperswarm'
import goodbye from 'graceful-goodbye'
import b4a from 'b4a'

// import { Node } from 'hyperbee/lib/messages.js'
import BeeWorker from './bees.js'
import DriveWorker from './drive.js'
import PeerWorker from './peers.js'

class HolepunchWorker extends EventEmitter {

  constructor() {
    super()
    this.hello = 'holepunch'
    this.store = {}
    this.swarm = {}
    this.BeeData = {}
    this.DriveFiles = {}
    this.core1 = {}
    this.core2 = {}
    this.core3 = {}
    this.discKeypeer = ''
    this.readcore = null
    this.warmPeers = []
    this.startHolepunch()
    this.networkListeners()
  }

  /**
   * setup holepunch protocol
   * @method startHolepunch
   *
  */
  startHolepunch = async function () {
    this.store = new Corestore(os.homedir() + '/.hop-storage')
    this.swarm = new Hyperswarm()
    // make replication possible
    this.swarm.on('connection', conn => this.store.replicate(conn))
    goodbye(() => this.swarm.destroy())
    this.BeeData = new BeeWorker(this.store, this.swarm)
    this.DriveFiles = new DriveWorker(this.store, this.swarm)
    this.Peers = new PeerWorker(this.store, this.swarm)
  }

  /**
   * bring individual hypercore, bees, drive to active
   * @method activateHypercores
   *
  */
  activateHypercores = async function () {
    await this.DriveFiles.setupHyperdrive()
    await this.BeeData.setupHyperbee()
    this.Peers.networkKeys()
    this.emit('hcores-active')
  }

  /**
   * pass on websocket to library
   * @method setWebsocket
   *
  */
  setWebsocket = function (ws) {
    this.wsocket = ws
    this.BeeData.setWebsocket(ws)
    this.DriveFiles.setWebsocket(ws)
    // this.activateHypercores()
  }

  /**
   * active hypercores auth verified
   * @method startStores
   *
  */
  startStores = function (ws) {
    this.activateHypercores()
  }

  /**
  * listen for outputs from workers
  * @method networkListeners
  *
  */
  networkListeners = function () {
    this.Peers.on('peer-network', (data) => {
      this.wsocket.send(JSON.stringify(data))
    })
    // peer connection active for first time 
    this.Peers.on('peer-connect', (data) => {
     //this.warmPeerPrepare(data)
    })
    // share connection failed
    this.Peers.on('peer-share-fail', (data) => {
      let peerFail = {}
      peerFail.type = 'account'
      peerFail.action = 'peer-share-fail'
      peerFail.data = { publickey: data }
      this.wsocket.send(JSON.stringify(peerFail))
    })
    // save peer topic
    this.Peers.on('peer-topic-save', async (data) => {
      await this.emit('peer-topic-save', data)    
    })
    // peer reconnection topic ie. able to reconnect again
    this.Peers.on('peer-reconnect-topic', (data) => {
      this.emit('peer-reconnect-topic', data)
    })
    // data for beebee
    this.Peers.on('beebee-data', (data) => {
      this.emit('peer-topeer', data)
    })
    // cue space share
    this.Peers.on('cuespace-notification', (data) => {
      this.emit('peer-cuespace', data)
      // check if bentoboxN1 included?
      if (data.data.content.bbn1.publicN1contracts.length > 0) {
        for (let n1Cont of data.data.content.bbn1.publicN1contracts) {
          this.BeeData.replicatePubliclibrary({ data: n1Cont })
        }
      }
    })
    // public library notification
    this.Peers.on('publiclibrarynotification', (data) => {
      this.BeeData.replicatePubliclibrary(data)
    })
    // beebee notifications public
    this.BeeData.on('publibbeebee-notification', (data) => {
      this.emit('beebee-publib-notification', data)
    })
    // new warm incoming peer
    this.Peers.on('connect-warm-first', (data) => {
      let peerInfo = this.Peers.peerHolder[data]
      if (peerInfo === undefined) {
        // receiving peer
        peerInfo = { name: 'peernew'}
      }
      let peerId = {}
      peerId.name = peerInfo.name
      peerId.publickey = data
      peerId.longterm = true
      peerId.settopic = false
      peerId.topic = ''
      peerId.live = false
      this.warmPeers.push(peerId)
      this.emit('peer-incoming-save', peerId)
    })
    // drive listener
    this.DriveFiles.on('largefile-save', (data) => {
      this.emit('drive-save-large', data)
    })
  }

  /**
  * manage flow to network of peers and data
  * @method networkPath
  *
  */
  networkPath = function (message) {
    if (message.action === 'share') {
      // has the peer joined already?
      let peerMatch = false
      for (let wpeer of this.warmPeers) {
        if (wpeer.publickey = message.data.publickey) {
          peerMatch = true
        }
      }
      if (message.task === 'peer-share-invite') {
        // keep track of role, reciving or extended invite
        this.Peers.setRole(message.data.publickey)
        if (peerMatch === true) {
          this.Peers.peerAlreadyJoinSetData(message.data)
          // this.Peers.writeTonetwork(message.data.publickey)
          this.warmPeerPrepare(message.data.publickey, true)
        } else {
          this.warmPeers.push(message.data)
          this.Peers.peerAlreadyJoinSetData(message.data)
          this.Peers.peerJoin(message.data)
        }
      } else if (message.task === 'peer-share-topic') {
        // existing peers reconnecting via topic
        this.Peers.topicConnect(message.data)
      } else if (message.task === 'public-n1-experiment') {
        if (peerMatch === true) {
         this.Peers.peerAlreadyJoinSetData(message.data)
         this.Peers.writeToPublicLibrary(message.data.publickey)
        } else {
          this.warmPeers.push(message.data)
          this.Peers.peerJoin(message.data)
          // now set data and write to public library info.
          this.Peers.peerAlreadyJoinSetData(message.data)
          this.Peers.writeToPublicLibrary(message.data.publickey)
        }
      } else if (message.task = 'cue-space') {
        if (peerMatch === true) {
          this.Peers.peerAlreadyJoinSetData(message.data)
          this.Peers.writeToCueSpace(message.data.publickey)
        } else {
          this.warmPeers.push(message.data)
          this.Peers.peerJoin(message.data)
          // this.Peers.peerAlreadyJoinSetData(message.data)
          // this.Peers.writeToCueSpace(message.data.publickey)
        }
      } else if (message.task === 'peer-write') {
        this.emit('peer-write', message.data)
      } else if (message.task === 'topic') {
        // this.Peers.peerTopic(message.data.topic)
      }
    }
  }


  /**
   * prepare data to send to a warm peer
   * @method warmPeerPrepare
   */
  warmPeerPrepare = function (data, existing) {
    // two checks, if topic send to other peer
    if (existing !== true) {
      let peerRole = this.Peers.peersRole[data]
      if (peerRole === undefined) {
        this.Peers.writeTonetworkTopic(data)
      } else {
        console.log(' this peer set the topic')
      }
    }
    // if data within coming then process that
    let peerDataExist = this.Peers.peerHolder[data]
    if (peerDataExist === undefined) {
    } else {
      // what type of data being shared?
      // check for data along with new peer?
      if (peerDataExist.data !== undefined) {
        if (peerDataExist.data.type === 'private-chart') {
          this.Peers.writeTonetworkData(data, peerDataExist.data)
        } else if (peerDataExist.data.type === 'private-cue-space') {
          this.Peers.writeToCueSpace(this.Peers.peerHolder[peerFirstID].publickey)
        } else if (peerDataExist.data.type === 'public-n1-experiment') {
          this.Peers.writeTonetworkData(data, peerDataExist.data)
        } else if (peerDataExist.data.type === 'public-library') {
          this.Peers.writeToPublicLibrary(data)
        } else if (peerDataExist.data.type === 'text-message') {
          // simpole text message
          this.Peers.writeTonetwork(data)
        }
      }
    }
  }

  /**
   * corestore test example
   * @method testCorestore
   *
  */
  testCoreStore = async function () {
    // A name is a purely-local, and maps to a key pair. It's not visible to readers.
    // Since a name always corresponds to a key pair, these are all writable
    this.core1 = this.store.get({ name: 'core-1', valueEncoding: 'json' })
    this.core2 = this.store.get({ name: 'core-2' })
    this.core3 = this.store.get({ name: 'core-3' })
    await Promise.all([this.core1.ready(), this.core2.ready(), this.core3.ready()])

    // console.log('main core key:', b4a.toString(this.core1.key, 'hex'))
    this.discKeypeer = b4a.toString(this.core1.key, 'hex')

    // Here we'll only join the swarm with the core1's discovery key
    // We don't need to announce core2 and core3, because they'll replicated with core1
    this.swarm.join(this.core1.discoveryKey)

    // Corestore replication internally manages to replicate every loaded core
    // Corestore *does not* exchange keys (read capabilities) during replication.
    this.swarm.on('connection', conn => this.store.replicate(conn))

    // Since Corestore does not exchange keys, they need to be exchanged elsewhere.
    // Here, we'll record the other keys in the first block of core1.
    if (this.core1.length === 0) {
      await this.core1.append({
        otherKeys: [this.core2, this.core3].map(core => b4a.toString(core.key, 'hex'))
      })
    }

    // Record all short messages in core2, and all long ones in core3
    this.core2.append("data data in hypercore")
  }

  /**
   * read hypercore test
   * @method readHypercoreTest
   *
  */
  readHypercoreTest = async function () {
    const lastBlock = await this.core2.get(this.core1.length - 1)
    // console.log(`Raw Block ${seq}:`, lastBlock)
    // console.log(`Decoded Block ${seq}`, Node.decode(lastBlock))
    // console.log('end of read core')
    this.readcore = lastBlock
  }

}

export default HolepunchWorker