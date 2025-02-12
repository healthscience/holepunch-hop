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


class NetworkPeers extends EventEmitter {

  constructor(store, swarm) {
    super()
    this.hello = 'hyperpeers'
    this.store = store
    this.swarm = swarm
    this.drive = {}
    this.peerHolder = {}
    this.peerConnect = {}
  }

  /**
   * public/piv key on DHT
   * @method networkKeys
   *
  */
  networkKeys = function () {
    console.log('swarm on start')
    // console.log(this.swarm._discovery) // .toString('hex'))

    this.swarm._discovery.forEach((value, key) => {
      console.log('key')
      console.log(key)
      console.log('-----------swarm discovery IN-------------------')
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
   * connection listen
   * @method listenNetwork
   *
  */
  listenNetwork = function  () {
    this.swarm.on('connection', (conn, info) => {
      // listen for replication
      this.store.replicate(conn)
      // listener to write message to peers or network partial or broadcast
      let publicKeylive = info.publicKey.toString('hex')
      this.emit('connect-warm', publicKeylive)
      this.peerConnect[publicKeylive] = conn
      // only send message back once peer info has been saved??????????
      //this.emit('peer-connect', publicKeylive)
      // process network message
      conn.on('data', data =>
        // assess data
        this.assessData(publicKeylive, data)
      )
      //conn.end()
    })
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
        if (dataShareIn.type === 'chart') {
          this.emit('beebee-data', dataShareIn)
          // need to look at NXP,  modules and within for reference contracts.
          // Need to replicate public library for contracts (repliate hyberbee)
          // Need to ask for data source e.g. file (replicate hyberdrive)
          // Lastly put together SafeFlowECS query to produce chart
        } else if (dataShareIn.type === 'cue-space') {
          this.emit('cuespace-notification', dataShareIn)
        } else if (dataShareIn.type === 'public-library') {
          this.emit('publiclibrarynotification', dataShareIn)
        } else if (dataShareIn.type === 'peer') {
        } else if (dataShareIn.type === 'topic-reconnect') {
          this.emit('peer-reconnect', dataShareIn)      
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
  writeTonetwork = function (publickey) {
    // check this peer has asked for chart data
    let connectTrue = publickey in this.peerConnect
    let chartTrue = publickey in this.peerHolder
    if (connectTrue === true && chartTrue === true) {
      let chartData = this.peerHolder[publickey]
      let dataShare = {}
      dataShare.hop = chartData.hop
      dataShare.data = chartData.data
      dataShare.type = 'chart'
      this.peerConnect[publickey].write(JSON.stringify(dataShare))
    } else {
      let topicGeneration = 'kprel135811'
      // need to save the topic initiator of warm peer save relationship
      this.emit('peer-topic-save', { peerkey: publickey, topic: topicGeneration })
      // send to other peer topic to allow reconnection in future
      let topicShare = {}
      topicShare.type = 'topic-reconnect'
      topicShare.publickey = this.swarm.keyPair.publicKey.toString('hex')
      topicShare.data = topicGeneration  
      this.peerConnect[publickey].write(JSON.stringify(topicShare))
    }
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
      let dataShare = {}
      dataShare.data = libraryData.data
      dataShare.type = 'cue-space'
      this.peerConnect[publickey].write(JSON.stringify(dataShare))
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
    this. checkTimerConnection(peerContext.publickey)
    this.peerHolder[peerContext.publickey] = peerContext
    const noisePublicKey = Buffer.from(peerContext.publickey, 'hex') //  must be 32 bytes
    if (noisePublicKey.length === 32) {
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
  topiConnect = async function (topic) {
    const noisePublicKey = Buffer.alloc(32).fill(topic) // A topic must be 32 bytes
    const peerConnect = this.swarm.join(noisePublicKey, { server: true, client: false })
    await peerConnect.flushed() // Waits for the topic to be fully announced on the DHT
  }

  /**
   * out message topics as a client
   * @method topicListen
   *
  */
  topicListen = async function (topic) {
    const noisePublicKey = Buffer.alloc(32).fill(topic) // A topic must be 32 bytes
    const peerConnect = this.swarm.join(noisePublicKey, { server: false, client: true })
    await peerConnect.flushed() // Waits for the topic to be fully announced on the DHT
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