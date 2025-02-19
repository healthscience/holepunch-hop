'use strict'
/**
*  Manage Peers connections
*
* @class NetworkPeers
* @package    NetworkPeers
* @copyright  Copyright (c) 2022 James Littlejohn
* @license    http://www.gnu.org/licenses/old-licenses/gpl-3.0.html
* @version    $Id$
*/
import EventEmitter from 'events'
import crypto from 'crypto'

class NetworkPeers extends EventEmitter {

  constructor(store, swarm) {
    super()
    this.hello = 'hyperpeers'
    this.store = store
    this.swarm = swarm
    this.drive = {}
    this.peerPrime = ''
    this.peerNetwork = []
    this.peerHolder = {}
    this.peerConnect = {}
    this.topicHolder = {}
    this.sendTopicHolder = []
    this.peersRole = {}
  }

  /**
   * public/piv key on DHT
   * @method networkKeys
   *
  */
  networkKeys = function () {
    console.log('swarm on start')
    // console.log(this.swarm)
    console.log(this.swarm._discovery) // .toString('hex'))

    this.swarm._discovery.forEach((value, key) => {
      console.log('key')
      console.log(key)
      this.peerPrime = key
      console.log(this.peerPrime)
      console.log('-----------swarm discovery on START-------------------')
      console.log(Object.keys(value))
      console.log(value.topic)
      console.log(value.topic.toString('hex'))
    })
    let peerNxKeys = {}
    peerNxKeys.publickey = this.swarm.keyPair.publicKey.toString('hex')
    let networkMessage = {}
    networkMessage.type = 'account'
    networkMessage.action = 'network-keys'
    networkMessage.data = peerNxKeys
    this.emit('peer-network', networkMessage)
    this.listenNetwork()
    this.peerJoinClient()
  }

  /**
   * set role in peer to peer relationship,  invte or receive?
   * @method setRole
   *
  */
  setRole = function (pubKey) {
    let setRole = { send: 'prime' , invite: pubKey}
    this.peersRole[pubKey] = setRole
  }

  /**
   * connection listen
   * @method listenNetwork
   *
  */
  listenNetwork = function  () {
    this.swarm.on('connection', (conn, info) => {
      // save peer connection instance for ongoing communication
      console.log('peer connection establihsed======================================')
      // console.log(conn)
      console.log('=================================================================')
      console.log(info)
      let publicKeylive = info.publicKey.toString('hex')
      console.log('topic set or fir stiem connect', info.topics)
      let topicKeylive = info.topics
      console.log('publicKeylive', publicKeylive)
      console.log('topicKeylive', topicKeylive)
      console.log('this.topicHolder', this.topicHolder)
      let recConnectPeer = info.proven
      console.log(recConnectPeer)
      // if client will get back new public key for topic peer and topic
      // check send holder ie did this peer act as server?
      let topicIn = 'rec' //topicKeylive[0].toString('hex')
      let peerServerActive = false
      for (let perServer of this.sendTopicHolder) {
        console.log(perServer)
        if (perServer.topic === topicIn) {
          console.log('yes server for this topoic seup')
          peerServerActive = true
        }
      }

      // check if topic re establish or first time?
      if (topicKeylive.length > 0) {
        console.log('yes connection via topic')
        let topicIn = topicKeylive[0].toString('hex')
        let topicMatch = this.topicHolder[topicIn]
        console.log(topicMatch)
        if (Object.keys(topicMatch).length > 0) {
          console.log('topic found and connected')
          // looks at what needs data needs cshared
          // match new public key to saved publickey
          topicMatch.currentPubkey = publicKeylive
          this.topicHolder[topicIn] = topicMatch
          console.log('update with new pubilc key for this session')
          console.log(this.topicHolder)         
        } else {
          console.log('first connect aaaa')
          this.peerConnect[publicKeylive] = conn
          // this.emit('connect-warm-first', publicKeylive)
          // listen for replication  NEED UPTATED LOGIC
          this.store.replicate(conn)          
        }
      } else {
        console.log('not tpic connection present so direct start ptop')
        if (recConnectPeer === false) {
          console.log('first connect bbbbb')
          this.peerConnect[publicKeylive] = conn
          // this.emit('connect-warm-first', publicKeylive)
          // listen for replication  NEED UPTATED LOGIC
          this.store.replicate(conn)
        }
      }

      // process network message
      conn.on('data', data =>
        // assess data
        this.assessData(publicKeylive, data)
      )
      //conn.end()
    })
  }

  /**
   * what is the connectivity between two peers
   *  @method checkConnectivityStatus
  */
  checkConnectivityStatus = function (message, warmPeers) {
    let ptopStatus = {}
    let savedPtoP = false
    let livePtoP = false
    let peerInfo = {}
    let peerMatch = false
    for (let exPeer of this.peerNetwork) {
      if (exPeer.key === message.data.publickey) {
        savedPtoP = true
        peerInfo = exPeer
      }
    }
    for (let wpeer of warmPeers) {
      // connection open and live directly between two peers?
      let openConn = this.peerConnect[message.data.publickey]
      if (openConn !== undefined) {
       livePtoP = true 
      }
      // peer existing
      if (wpeer.publickey = message.data.publickey) {
        peerMatch = true
      }
    }
    // set the status
    ptopStatus.live = livePtoP
    ptopStatus.peer = peerInfo
    ptopStatus.existing = savedPtoP
    ptopStatus.role = this.peersRole[message.data.publickey]
    ptopStatus.data = message.data
    ptopStatus.action = message.action
    ptopStatus.task = message.task
    return ptopStatus
  }

  /**
   * 
   * @method assessData data and act
   *
  */
  assessData = function (peer, data) {
    if (Buffer.isBuffer(data)) {
      try {
        let dataShareIn = JSON.parse(data.toString())
        console.log('ASSESS dataShareIn', dataShareIn)
        if (dataShareIn.type === 'private-chart') {
          this.emit('beebee-data', dataShareIn)
          // need to look at NXP,  modules and within for reference contracts.
          // Need to replicate public library for contracts (repliate hyberbee)
          // Need to ask for data source e.g. file (replicate hyberdrive)
          // Lastly put together SafeFlowECS query to produce chart
        } else if (dataShareIn.type === 'private-cue-space') {
          this.emit('cuespace-notification', dataShareIn)
        } else if (dataShareIn.type === 'public-library') {
          this.emit('publiclibrarynotification', dataShareIn)
        } else if (dataShareIn.type === 'peer') {
        } else if (dataShareIn.type === 'topic-reconnect') {
          console.log('PEER RECONNECT TOPIC', dataShareIn)
          // peer has share a topic for future reconnect
          // check if publickey is  topic key if yes, already active do nothing
          let topicMatch = this.topicHolder[dataShareIn.topic]
          if (topicMatch !== undefined) {
            if (topicMatch.currentPubkey === dataShareIn.publickey) {
              console.log('existing peer++++++++++')
              console.log(topicMatch)
            } else {
              console.log('new peer++++++++++')
              this.emit('peer-reconnect-topic', dataShareIn)
            }
          } else {
            console.log('new peer+++2222+++++++')
            this.emit('peer-reconnect-topic', dataShareIn)
          }
        }
      } catch (e) {
          return console.error('ignore err')
      }
    }
  }

  /**
   * write message to network
   * @method writeTonetwork
   *
  */
  writeTonetwork = function (data, messType) {
    // check this peer has asked for chart data
    let dataSend = data
    this.peerConnect[data].write(JSON.stringify(dataSend))
  }

  /**
   * write message to network
   * @method writeTonetworkTopic
   *
  */
  writeTonetworkTopic = function (publickey) {
    const randomString = crypto.randomBytes(32).toString('hex')
    // Convert the random string to a buffer
    const buffer = Buffer.from(randomString, 'hex')
      let topicGeneration =  randomString // 'kprel135811kprel135811kprel13581'
      // need to save the topic initiator of warm peer save relationship
      console.log('PEER GENERATING TOPIC FOR RECOOONERCT  PATH')
      this.emit('peer-topic-save', { peerkey: publickey, topic: topicGeneration })
      // send to other peer topic to allow reconnection in future
      let topicShare = {}
      topicShare.type = 'topic-reconnect'
      topicShare.publickey = this.swarm.keyPair.publicKey.toString('hex')
      topicShare.peerkey = this.swarm.keyPair.publicKey.toString('hex')
      topicShare.topic = topicGeneration
      topicShare.data = topicGeneration
      // inform peer that topic has been created
      this.peerConnect[publickey].write(JSON.stringify(topicShare))
  }

  /**
   * write message to network
   * @method writeTonetworkData
   *
  */
  writeTonetworkData = function (publickey, dataShare) {
    this.peerConnect[publickey].write(JSON.stringify(dataShare))
  }

  /**
   * write message connect public library
   * @method writeToPublicLibrary
   *
  */
  writeToPublicLibrary = function (publickey) {
    // check this peer has asked for chart data
    let connectTrue = publickey in this.peerConnect
    let libraryTrue = publickey in this.peerHolder
    if (connectTrue === true && libraryTrue === true) {
      let libraryData = this.peerHolder[publickey]
      let dataShare = {}
      dataShare.data = libraryData.data
      dataShare.type = 'public-library'
      this.peerConnect[publickey].write(JSON.stringify(dataShare))
    } else {
      console.log('no board to write ie share with a peer')
    }
  }

  /**
   * write message connect peers space
   * @method writeToCueSpace
   *
  */
  writeToCueSpace = function (publickey) {
    // check this peer has asked for space data
    let connectTrue = publickey in this.peerConnect
    let spaceTrue = publickey in this.peerHolder
    if (connectTrue === true && spaceTrue === true) {
      let libraryData = this.peerHolder[publickey]
      this.peerConnect[publickey].write(JSON.stringify(libraryData))
    } else {
      console.log('no cuespace to write ie share with a peer')
    }
  }

  /**
   * join peer to peer direct private (server)
   * @method peerJoin
   *
  */
  peerJoin = function (peerContext) {
    // set timeer to inform if not connection can be established
    this.checkTimerConnection(peerContext.publickey)
    this.peerHolder[peerContext.publickey] = peerContext
    const noisePublicKey = Buffer.from(peerContext.publickey, 'hex') //  must be 32 bytes
    if (noisePublicKey.length === 32) {
      console.log('valid address end')
      console.log(peerContext)
      const peerConnect = this.swarm.joinPeer(noisePublicKey, { server: true, client: false })
    }
  }

  /**
   * give 2 seconds for connection to establish
   * @method checkTimerConnection
   *
  */
  checkTimerConnection (key) {
    // if peerconnect not set the inform beebee  not connection accepted try again
    let localthis = this
    // setTimeout(checkPeerState(localthis, key), 2000)
    setTimeout(() => checkPeerState(localthis, key), 6000)

    function checkPeerState (localthis, publicKeylive) {
      if (localthis.peerConnect[publicKeylive] === undefined) {
        // failed peer connection
        localthis.emit('peer-share-fail', publicKeylive)
      } else {
        // connnection established
      }
    }
  }

  /**
   * leave a direct peer connection
   * @method peerLeave
   *
  */
  peerLeave = function (peerLeaveKey) {
    this.peerHolder[peerLeaveKey] = {}
    this.swarm.leavePeer(peerLeaveKey)
  }

  /**
   * already joined but keep track context data
   * @method peerAlreadyJoinSetData
   *
  */
  peerAlreadyJoinSetData = function (peerContext) {
    this.peerHolder[peerContext.publickey] = peerContext
    return true
  }

  /**
   * join peer to peer private (client)
   * @method peerJoinClient
   *
  */
  peerJoinClient = function () {
    this.swarm.listen() 
  }

  /**
   * out message topics as a client
   * @method topicConnect
   *
  */
  topicConnect = async function (topic) {
    // const noisePublicKey = Buffer.alloc(32).fill(topic) // A topic must be 32 bytes
    // console.log('noisePublicKey server', noisePublicKey)
    const noisePublicKey = Buffer.from(topic, 'hex') //  must be 32 bytes
    if (noisePublicKey.length === 32) {
      let topicKeylive = noisePublicKey.toString('hex')
      this.topicHolder[topic] = { role: 'server', livePubkey: this.swarm.keyPair.publicKey.toString('hex'), topic: topic, key: topicKeylive, timestamp: '' }
      this.sendTopicHolder.push({ livePubkey: this.swarm.keyPair.publicKey.toString('hex'), topic: topic })
      const peerConnect = this.swarm.join(noisePublicKey, { server: true, client: false })
      await peerConnect.flushed() // Waits for the topic to be fully announced on the DHT
    }
   }

  /**
   * out message topics as a client
   * @method topicListen
   *
  */
  topicListen = async function (topic, peerKey) {
    // const noisePublicKey = Buffer.alloc(32).fill(topic) // A topic must be 32 bytes
    // let topicKeylive = noisePublicKey.toString('hex')
    const noisePublicKey = Buffer.from(topic, 'hex') //  must be 32 bytes
    if (noisePublicKey.length === 32) {
      console.log('perefe key length')
      let topicKeylive = noisePublicKey.toString('hex')
      console.log(topicKeylive)
      this.topicHolder[topic] = { role: 'client', topic: topic, key: topicKeylive, peerKey: peerKey, timestamp: '' }
      const peerConnect = this.swarm.join(noisePublicKey, { server: false, client: true })
      await peerConnect.flushed() // Waits for the topic to be fully announced on the DHT
    } else {
      console.log('key lenght issue')
    }
  }

  /**
   * leave topic
   * @method leaveTopic
   *
  */
  leaveTopic = async function (topic) {
    await this.swarm.leave(topic)
  }

}

export default NetworkPeers