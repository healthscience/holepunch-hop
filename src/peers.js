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
    this.peersRole = []
    this.discoveryList = []
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
  setRole = function (peerData) {
    let setRole = { send: 'prime' , invite: peerData}
    this.peersRole.push(setRole)
  }

  /**
   * look at role of each peer save and join or listen to network
   * @method setupConnectionBegin
   *
  */
  setupConnectionBegin = function (peerNetwork) {
    this.peerNetwork = peerNetwork
    for (let sPeer of this.peerNetwork) {
      // sPeer.value.key = publicKeylive
      if (sPeer.value.settopic === true) {
        // client role  need to pass on peerUniqueID
        this.topicConnect(sPeer.key, sPeer.value.topic)
      } else {
        // server role
        this.topicListen(sPeer.value.topic, sPeer.key)
      }
    }
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
      // listen for replication  NEED UPTATED LOGIC
      this.store.replicate(conn)
      // assess if token is present to match to exsing peer account ID?
      let publicKeylive = info.publicKey.toString('hex')
      let topicKeylive = info.topics
      let roleTaken = info.client
      // if now topics info then server, pass by
      let discoveryTopicInfo = {}
      if (topicKeylive.length === 0) {
        // check if joined now?
        discoveryTopicInfo = this.checkDisoveryStatus('server')
      } else {
        discoveryTopicInfo = {topic: ''}
      }
      let topicServer = this.topicHolder[discoveryTopicInfo.topic]
      let serverStatus = false
      if (topicServer !== undefined) {
        if (Object.keys(topicServer).length > 0) {
          serverStatus = true
        }
      }
      // check if toppic via matching or being client receiving
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
          // update to live client
          let originalKey = ''
          for (let savePeer of this.peerNetwork) {
            if (savePeer.value.topic === topicIn) {
              originalKey = savePeer.value.publickey    
            }
          }
          let updatePeerStatus = []
          for (let savePeer of this.peerNetwork) {
            if (savePeer.key === originalKey) {
              let updatetoLive = savePeer
              updatetoLive.value.live = true
              updatetoLive.value.livePeerkey = publicKeylive
              updatePeerStatus.push(updatetoLive)
              this.emit('peer-live-network', originalKey)
            } else {
              updatePeerStatus.push(savePeer)
            }
          }
          this.peerNetwork = updatePeerStatus
        } else {
          // keep track of connection
          this.peerConnect[publicKeylive] = conn
          this.dataFlowCheck(publicKeylive, 'server')
        }

        if (serverStatus === true) {
          // set to live
          // update livePeerkey to true?? 
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
              // update beebee
              this.emit('peer-live-network', originalKey)
            } else {
              updatePeerStatus.push(savePeer)
            }
          }
          this.peerNetwork = updatePeerStatus
        }
      } else {
        // first time or from topic reset?
        // need to check from client and server side
        if (this.topicHolder[publicKeylive] === undefined) {
          // is client or server role
          let roleType = ''
          if (roleTaken === false) {
            roleType = 'server'
          } else {
            roleType = 'client'
          }
          let roleContext = {}
          roleContext.publickey = publicKeylive
          roleContext.roletaken = roleType
          // first time cheeck for data long with it?
          this.peerConnect[publicKeylive] = conn
          this.dataFlowCheck(publicKeylive, 'first')
          this.emit('connect-warm-first', roleContext)
        } else {
          this.peerConnect[publicKeylive] = conn
          this.dataFlowCheck(publicKeylive, 'server')
        }
      }

      // process network message
      conn.on('data', data =>
        // assess data
        this.assessData(publicKeylive, data)
      )

      conn.on('error', data => {
        let connectLivekeys = Object.keys(this.peerConnect)
        for (let peer of this.peerNetwork) {
          for (let pconn of connectLivekeys) {
            if (peer.value.livePeerkey === pconn) {
              // check if connect is close?
              let keysNoise = Object.keys(this.peerConnect[pconn]['noiseStream']['_writableState']['stream']['_writableState']['stream']['_writableState']['stream']['_writableState']['stream']['rawStream']['_closed'])
              // console.log(this.peerConnect[pconn]['noiseStream']['_writableState']['stream']['_writableState']['stream']['_writableState']['stream']['_writableState']['stream']['rawStream']['_closed'])
              let closeStatus = this.peerConnect[pconn]['noiseStream']['_writableState']['stream']['_writableState']['stream']['_writableState']['stream']['_writableState']['stream']['rawStream']['_closed']
              if (closeStatus === true) {
                // remove peer & inform beebee
                this.emit('peer-disconnect', { publickey: peer.key })
              }
            }
          }
        }
      })

      // conn.end()
    })
  }

  /**
   * 
   * @method updateListen
   *
  */
  updateListen = function (data) {
    // console.log('update listen')
    // console.log(data)
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
        // match current public key to base id of peer
        let peerMatch = this.peerMatchbase(peer)
        if (dataShareIn.type === 'private-chart') {
          this.emit('beebee-data', { publickey: peerMatch, data: dataShareIn })
          // two types of chart share above html answer sharing and below from a full bentoboxN1 experiment TODO
          // need to look at NXP,  modules and within for reference contracts.
          // Need to replicate public library for contracts (repliate hyberbee)
          // Need to ask for data source e.g. file (replicate hyberdrive)
          // Lastly put together SafeFlowECS query to produce chart
        } else if (dataShareIn.type === 'private-cue-space') {
          this.emit('cuespace-notification', { publickey: peerMatch, data: dataShareIn })
        } else if (dataShareIn.type === 'public-library') {
          this.emit('publiclibrarynotification', { publickey: peerMatch, data: dataShareIn })
        } else if (dataShareIn.type === 'peer') {
        } else if (dataShareIn.type === 'peer-codename-inform') {
          // all peer to match publicke to codename then update save and infom beebee
          this.emit('peer-codename-match', dataShareIn)
        } else if (dataShareIn.type === 'topic-reconnect') {
          // peer has share a topic for future reconnect
          // check if publickey is  topic key if yes, already active do nothing
          let topicMatch = this.topicHolder[dataShareIn.topic]
          if (topicMatch !== undefined) {
            if (topicMatch.currentPubkey === dataShareIn.publickey) {
            } else {
              // server set topic in first connect flow
              this.emit('peer-reconnect-topic', dataShareIn)
            }
          } else {
            // client path
            dataShareIn.settopic = false
            this.emit('peer-reconnect-topic', dataShareIn)
          }
        }
      } catch (e) {
          return console.error('ignore err')
      }
    }
  }

  /**
   * what is the connectivity between two peers
   *  @method checkConnectivityStatus
  */
  checkConnectivityStatus = function (message, warmPeers, decodePath) {
    let ptopStatus = {}
    let savedPtoP = false
    let livePtoP = false
    let savedpeerInfo = {}
    let peerMatch = false
    // split invite to parts
    if (decodePath === 'invite-gen') {
      let parts = this.inviteDecoded(message.data)
      message.data.publickey = parts[1]
      message.data.codename = parts[2]
    } else {
    }
    // check saved i.e. exsting known peer
    for (let exPeer of this.peerNetwork) {
      if (exPeer.key === message.data.publickey) {
        savedPtoP = true
        savedpeerInfo = exPeer
      }
    }
    // check is peer is live
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
  *  match codename to peer name
  *  @method matchCodename
  * 
  */
  matchCodename = function (data) {
    let codeNameInvite = {}
    let inviteIn = {}
    for (let roleP of this.peersRole) {
      if (roleP.invite.pubkey === data) {
        inviteIn = roleP
      }
    }
    codeNameInvite = { codename: inviteIn.invite.codename, invitePubkey: data , name: inviteIn.invite.name}
    // match codename to role
    let roleMatch = { publickey: data, role: inviteIn, codename: codeNameInvite.codename, name: codeNameInvite.name }
    return roleMatch
  }

  /**
  *  match codename to peer codename
  *  @method matchPeersCodename
  * 
  */
  matchPeersCodename = function (data) {
    let inviteIn = {}
    for (let roleP of this.peersRole) {
      if (roleP.invite.codename === data.data.inviteCode) {
        inviteIn = roleP
      }
    }
    // match codename to role
    let roleMatch = { publickey: data, role: inviteIn, codename: inviteIn.invite.codename, name: inviteIn.invite.name }
    return roleMatch
  }

  /**
  *  match peer key to settings
  *  @method peerMatchTopic
  * 
  */
  peerMatchTopic = function (pubKey) {
    // first match live pubkey to topic and then use topic to get original
    let peerSettings = {}
    for (let savePeer of this.peerNetwork) {
      if (savePeer.key === pubKey) {
        peerSettings = savePeer
      }
    }
    return peerSettings
  }

  /**
  *  match discovery peer reconnect
  *  @method discoveryMatch
  * 
  */
  discoveryMatch = function (pubKey) {
    // first match live pubkey to topic and then use topic to get original
    let discoverySettings = {}
    for (let savePeer of this.discoveryList) {
      if (savePeer.peerKey === pubKey) {
        discoverySettings = savePeer.discovery
      }
    }
    // now refresh
    discoverySettings.refresh()
    return true
  }

  /**
  *  match current publickey to peer id i.e. estbalshed on first connect and maps to 'peername' in UX
  *  @method peerMatchbase
  * 
  */
  peerMatchbase = function (currPubKey) {
    // first match live pubkey to topic and then use topic to get original
    let originalKey = ''
    for (let savePeer of this.peerNetwork) {
      if (savePeer.value.livePeerkey === currPubKey) {
        originalKey = savePeer.key
      }
    }
    // check if first time peer connect
    if (originalKey.length === 0) {
      return currPubKey
    } else {
      return originalKey
    }
  }

  /**
  *  split invte code string
  *  @method inviteDecoded
  * 
  */
  inviteDecoded = function (invite) {
    const [prefix, hexString] = invite.publickey.split(':')
    let splitInvite = []
    if (prefix === 'hop') {
      const next32Bytes = hexString.slice(0, 64)
      const remainder = hexString.slice(64)
      splitInvite.push('hop')
      splitInvite.push(next32Bytes)
      splitInvite.push(remainder)
    } else {
      // first time split fine
      splitInvite.push('hop')
      splitInvite.push(invite.publickey)
      splitInvite.push(invite.codename)
    }
    return splitInvite
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
      if (peerActionData !== undefined) {  
        peerTopeerState = peerActionData.data
      }
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
    // any data to write to network? NOT USED?
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
  checkDisoveryStatus = function (nodeRole) {
    let topicList = []
    if (nodeRole === 'server') {
      topicList = this.sendTopicHolder
    } else if (nodeRole === 'client') {
      topicList = this.topicHolder
    }
    let checkDiscoveryTopic = {}
    if (topicList.length > 0) {
      for (let topicH of topicList) {
        const noisePublicKey = Buffer.from(topicH.topic, 'hex')
        let discovery = this.swarm.status(noisePublicKey)
        let discoverTopic = discovery.topic.toString('hex')
        if (discoverTopic === topicH.topic) {
          // do the peerid match?
          discovery.swarm.connections.forEach((value, key) => {
            checkDiscoveryTopic.server = value.publicKey.toString('hex')
            checkDiscoveryTopic.client = value.remotePublicKey.toString('hex')
            checkDiscoveryTopic.topic = discoverTopic
          })
          if (checkDiscoveryTopic.client === topicH.peerKey) {
            return checkDiscoveryTopic
          } else {
            if (checkDiscoveryTopic.topic === topicH.topic) {
              return checkDiscoveryTopic
            } else {
              checkDiscoveryTopic.topic = ''
            }
        }
        } else {
          
        }
      }
    } else {
      checkDiscoveryTopic.server = '' 
      checkDiscoveryTopic.client = ''
      checkDiscoveryTopic.topic = ''
    }
    return checkDiscoveryTopic
  }


  /**
   * where to route data share
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
      } else if (peerTopeerState.type === 'public-n1-experiment') {
        this.writeToPublicLibrary(livePubkey, peerTopeerState)
      } else if (peerTopeerState.type === 'private-cue-space') {
        this.writeToCueSpace(livePubkey, peerTopeerState)
      } else if (peerTopeerState.type === 'peer-write') {
        this.Peers.writeTonetwork(peerTopeerState)
      } else if (peerTopeerState.type === 'public-library') {
        this.Peers.writeToPublicLibrary(data)
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
  writeTonetworkTopic = function (publickey, codeName) {
    const randomString = crypto.randomBytes(32).toString('hex')
    // Convert the random string to a buffer
    const buffer = Buffer.from(randomString, 'hex')
      let topicGeneration =  randomString
      // send to other peer topic to allow reconnection in future
      let topicShare = {}
      topicShare.type = 'topic-reconnect'
      topicShare.publickey = this.swarm.keyPair.publicKey.toString('hex')
      topicShare.peerkey = this.swarm.keyPair.publicKey.toString('hex')
      topicShare.prime = true
      topicShare.topic = topicGeneration
      topicShare.codename = codeName
      topicShare.data = topicGeneration
      this.emit('topic-formed-save', topicShare)
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
  writeToPublicLibrary = function (publickey, data) {
    // check this peer has asked for chart data
      let dataShare = {}
      dataShare.data = data
      dataShare.type = 'public-library'
      this.peerConnect[publickey].write(JSON.stringify(dataShare))
  }

  /**
   * write message connect peers space
   * @method writeToCueSpace
   *
  */
  writeToCueSpace = function (publickey, data) {
    this.peerConnect[publickey].write(JSON.stringify(data))
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
      this.swarm.joinPeer(noisePublicKey, { server: true, client: false })
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
  topicConnect = async function (peerID, topic) {
    // const noisePublicKey = Buffer.alloc(32).fill(topic) // A topic must be 32 bytes
    const noisePublicKey = Buffer.from(topic, 'hex') //  must be 32 bytes
    if (noisePublicKey.length === 32) {
      let topicKeylive = noisePublicKey.toString('hex')
      this.topicHolder[topic] = { role: 'server', livePubkey: this.swarm.keyPair.publicKey.toString('hex'), topic: topic, key: topicKeylive, timestamp: '' }
      this.sendTopicHolder.push({ livePubkey: this.swarm.keyPair.publicKey.toString('hex'), peerKey: peerID, topic: topic })
      const peerConnect = this.swarm.join(noisePublicKey, { server: true, client: false })
      this.discoveryList.push({ peerKey: peerID, topic: topic, discovery: peerConnect })
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
      this.discoveryList.push({ peerKey: peerKey, topic: topic, discovery: peerConnect })
      await this.swarm.flush() // Waits for the topic to be fully announced on the DHT
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