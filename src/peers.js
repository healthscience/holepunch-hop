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
    this.peerNetwork = [] // set on loading library via HOP
    this.peerEstContext = {}
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
    // console.log('swarm on start')
    // console.log(this.swarm)
    // console.log(this.swarm._discovery) // .toString('hex'))

    /*
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
    */
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
   * incoming establsihed information
   * @method setRestablished
   *
  */
  setRestablished = function (pubKey, established) {
    this.peerEstContext[pubKey] = established
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
      // console.log(info)
      // listen for replication  NEED UPTATED LOGIC
      this.store.replicate(conn)
      // assess if token is present to match to exsing peer account ID?
      let publicKeylive = info.publicKey.toString('hex')
      let topicKeylive = info.topics
      // check if joined now?
      let discoveryTopicInfo = this.checkDisoveryStatus()
      let topicServer = this.topicHolder[discoveryTopicInfo.topic]
      let serverStatus = false
      if (topicServer !== undefined) {
        if (Object.keys(topicServer).length > 0) {
          serverStatus = true
        }
      }
      // check if toppic  ONLY client will
      if (topicKeylive.length > 0 || serverStatus === true) {
        // keep track of connection
        this.peerConnect[publicKeylive] = conn
        if (topicKeylive.length > 0) {
          let topicIn = topicKeylive[0].toString('hex')
          let topicMatch = this.topicHolder[topicIn]
          if (Object.keys(topicMatch).length > 0) {
            // looks at what needs data needs cshared
            // match new public key to saved publickey
            topicMatch.currentPubkey = publicKeylive
            this.topicHolder[topicIn] = topicMatch
            this.dataFlowCheck(topicIn, 'client')
          } else {
            this.peerConnect[publicKeylive] = conn
            
          }
        } else {
          // keep track of connection
          this.peerConnect[publicKeylive] = conn
          this.dataFlowCheck(publicKeylive, 'server')
        }
        // set to live
        let originalKey = ''
        for (let savePeer of this.peerNetwork) {
          if (savePeer.value.topic === topicServer.topic) {
            originalKey = savePeer.value.publickey    
          }
        }
        // need original connection public key
        let updatePeerStatus = []
        for (let savePeer of this.peerNetwork) {
          if (savePeer.key === originalKey) {
            let updatetoLive = savePeer
            updatetoLive.value.live = true
            updatetoLive.value.livePeerkey = publicKeylive
            updatePeerStatus.push(updatetoLive)
          } else {
            updatePeerStatus.push(savePeer)
          }
        }
        this.peerNetwork = updatePeerStatus
        console.log('update peer to live status')
        console.log(this.peerNetwork)
        // this.emit('peer-live-return', originalKey)
      } else {
        // first time or from topic reset?
        // need to check from client and server side
        if (this.topicHolder[publicKeylive] === undefined) {
          // first time cheeck for data long with it?
          this.peerConnect[publicKeylive] = conn
          this.dataFlowCheck(publicKeylive, 'first')
          this.emit('connect-warm-first', publicKeylive)
        } else {
          this.peerConnect[publicKeylive] = conn
          this.dataFlowCheck(publicKeylive, 'server')
        }
        // set to live
        // let peerLive = this.peerNetwork(publicKeylive)
        // peerLive.value.live = true
        // this.livePeers[publicKeylive] = peerLive
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
    console.log('check connectivity status')
    console.log(message)
    console.log(this.peerNetwork)
    let ptopStatus = {}
    let savedPtoP = false
    let livePtoP = false
    let savedpeerInfo = {}
    let peerMatch = false
    // check saved i.e. exsting known peer
    for (let exPeer of this.peerNetwork) {
      if (exPeer.key === message.data.publickey) {
        savedPtoP = true
        savedpeerInfo = exPeer
      }
    }
    // chech is peer is live
    let peerLiveStatus = false
    for (let sPeer of this.peerNetwork) {
      if (sPeer.key === message.data.publickey) {
        peerLiveStatus = sPeer.value.live
      }      
    }
    // is first time or ongoing?
    if (peerLiveStatus === true) {
      livePtoP = true
    } else {
      // first time connection
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
    }
    // set the status
    ptopStatus.peer = savedpeerInfo
    // settopic
    ptopStatus.existing = savedPtoP
    // live
    ptopStatus.live = livePtoP
    ptopStatus.role = this.peersRole[message.data.publickey]
    ptopStatus.data = message.data
    ptopStatus.action = message.action
    ptopStatus.task = message.task
    return ptopStatus
  }


  /**
  *  check if any data actions along with connecting input?
  *  @method dataFlowCheck
  * 
  */
  dataFlowCheck = function (topicIn, role) {
    // check if any data connection flow?
    let peerTopeerState = {}
    let matchPeer = {}
    if (role === 'client') {
      matchPeer = this.topicHolder[topicIn]
      let peerActionData = this.peerHolder[matchPeer.peerKey]
      peerTopeerState = peerActionData.data
    } else if (role === 'server') {
      matchPeer.currentPubkey = topicIn
      // loop over topics and see what info available??
      let checkDiscoveryTopic = {}
      for (let topicH of this.sendTopicHolder) {
        const noisePublicKey = Buffer.from(topicH.topic, 'hex')
        let discovery = this.swarm.status(noisePublicKey)
        let discoverTopic = discovery.topic.toString('hex')
        if (discoverTopic === topicH.topic) {
          discovery.swarm.connections.forEach((value, key) => {
            checkDiscoveryTopic.server = value.publicKey.toString('hex')
            checkDiscoveryTopic.client = value.remotePublicKey.toString('hex')
            checkDiscoveryTopic.topic = discoverTopic
          })
        }
      }
      // find out peer publickey first
      let peerMTopic = {}
      for (let peerh of this.peerNetwork) {
       if (peerh.value.topic === checkDiscoveryTopic.topic) {
          peerMTopic = peerh
        }
      }
      // server from topic or first time direct?
      if (Object.keys(peerMTopic).length === 0) {
        //  first time direct connection
        peerMTopic.key = topicIn  // note this is public key  poor naming  
      } else {
      }
      // check for data
      let peerActionData = this.peerHolder[peerMTopic.key]
      if (peerActionData !== undefined) {
        peerTopeerState = peerActionData.data
      } else {
        peerTopeerState = {}
      }
      } else if (role === 'first') {
        let peerActionData = this.peerHolder[topicIn]
        if (peerActionData === undefined) {
          peerTopeerState = {}
        } else {
          if(peerActionData.data !== undefined) {
            peerTopeerState = peerActionData.data          
          } else {
            peerTopeerState = {}
          }
        }
      }
    // any data to write to network?
    let checkDataShare = Object.keys(peerTopeerState).length
    if (checkDataShare > 0) {
      if (peerTopeerState.type === 'peer-share-invite') {
      } else if (peerTopeerState.type === 'private-chart') {  
        this.writeTonetworkData(matchPeer.currentPubkey, peerTopeerState)
      } else if (peerTopeerState.type === 'peer-share-topic') {
      } else if (peerTopeerState.type === 'public-n1-experiment') {
      } else if (peerTopeerState.type === 'cue-space') {
      } else if (peerTopeerState.type === 'peer-write') {
      }
    } 
  }

  /**
   * check discovery status on network
   * @method checkDisoveryStatus
   *
  */
  checkDisoveryStatus = function () {
    let checkDiscoveryTopic = {}
    for (let topicH of this.sendTopicHolder) {
      const noisePublicKey = Buffer.from(topicH.topic, 'hex')
      let discovery = this.swarm.status(noisePublicKey)
      let discoverTopic = discovery.topic.toString('hex')
      if (discoverTopic === topicH.topic) {
        // let getRemote = discovery.swarm.connections.get('remotePublicKey')
        // conosle.log(getRemote)
        discovery.swarm.connections.forEach((value, key) => {
          checkDiscoveryTopic.server = value.publicKey.toString('hex')
          checkDiscoveryTopic.client = value.remotePublicKey.toString('hex')
          checkDiscoveryTopic.topic = discoverTopic
        })
      }
    }
    return checkDiscoveryTopic
  }


  /**
   * check discovery status on network
   * @method routeDataPath
   *
  */
  routeDataPath = function (livePubkey, peerTopeerState) {
    // any data to write to network?
    let checkDataShare = Object.keys(peerTopeerState).length
    if (checkDataShare > 0) {
      if (peerTopeerState.type === 'peer-share-invite') {
      } else if (peerTopeerState.type === 'private-chart') {  
        this.writeTonetworkData(livePubkey, peerTopeerState)
      } else if (peerTopeerState.type === 'peer-share-topic') {
      } else if (peerTopeerState.type === 'public-n1-experiment') {
      } else if (peerTopeerState.type === 'cue-space') {
      } else if (peerTopeerState.type === 'peer-write') {
      }
    }
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
      console.log(topicGeneration)
      this.emit('peer-topic-save', { peerkey: publickey, topic: topicGeneration, settopic: true })
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
      let topicKeylive = noisePublicKey.toString('hex')
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