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

  // Connection preparation methods
  prepareConnectionInfo =  function(info, publicKey) {
    const topicKeylive = info.topics;
    const roleTaken = info.client;
    let discoveryTopicInfo = {};
    if (topicKeylive.length === 0) {
      if (roleTaken === false) {
        discoveryTopicInfo = this.checkDisoveryStatus('server', publicKey, topicKeylive);
      } else if (roleTaken === true) {
        discoveryTopicInfo = this.checkDisoveryStatus('client', publicKey, topicKeylive);
      }
      if (discoveryTopicInfo === undefined) {
        discoveryTopicInfo = { firstTime: false, topic: ''}
      }
    } else {
      discoveryTopicInfo = { firstTime: false, topic: ''}
    }
       
    return {
      topicKeylive,
      roleTaken,
      discoveryTopicInfo
    };
  }

  handleFirstTimeConnection = function(conn, info, connectionInfo) {
    const { publicKey } = info;
    const { topicKeylive } = connectionInfo;
    
    let publicKeylive = publicKey.toString('hex')
    // First establish the connection
    this.peerConnect[publicKeylive] = conn;
    let roleTaken = info.client
    // check status of topic  first time no topic
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
    }
}

  /**
   *  Reconnection handler
   * 
   */
  handleReconnection = function(conn, info, connectionInfo) {
    const { publicKey } = info;
    const { topicKeylive, discoveryTopicInfo, serverStatus } = connectionInfo;
    // Reconnection logic
    this.peerConnect[publicKey.toString('hex')] = conn;
    let topic = topicKeylive[0].toString('hex')
    // match topic to topic holder list to get original pub key ID
    let originalKey = ''
    for (let savePeer of this.peerNetwork) {
      if (savePeer.value.topic === topic) {
         originalKey = savePeer.value.publickey;
        break;
      }
    }
    if (topic.length > 0) {
      // Handle topic-based reconnection
      const topicMatch = this.topicHolder[topic];
      if (topicMatch && Object.keys(topicMatch).length > 0) {
        topicMatch.currentPubkey = publicKey.toString('hex');
        this.topicHolder[topic] = topicMatch;
        this.dataFlowCheck(topic, 'client');
        this.updatePeerStatus(topic, originalKey);
        // inform other peer of peerkey id
        this.writeTopicReconnect(originalKey, topicMatch)
      }
    } else {
      // Handle non-topic reconnection
      this.dataFlowCheck(publicKey.toString('hex'), 'server');
    }
  }

  /*
   * Update peer status
  *
  **/
  updatePeerStatus = function(topic, publicKey) {
    let originalKey = '';
    for (let savePeer of this.peerNetwork) {
      if (savePeer.value.topic === topic) {
        originalKey = savePeer.value.publickey;
        break;
      }
    }

    const updatePeerStatus = this.peerNetwork.map(savePeer => {
      if (savePeer.key === originalKey) {
        return {
          ...savePeer,
          value: {
            ...savePeer.value,
            live: true,
            livePeerkey: publicKey
          }
        };
      }
      return savePeer;
    });

    this.peerNetwork = updatePeerStatus;
    this.emit('peer-live-network', originalKey);
  }

  /*
   * Listen for network connections
  *
  **/
  listenNetwork = function () {
    this.swarm.on('connection', (conn, info) => {
      const publicKey = info.publicKey.toString('hex');
      const connectionInfo = this.prepareConnectionInfo(info, publicKey);
      // Determine which path to take
      if (connectionInfo.discoveryTopicInfo.firstTime === false) {
        this.handleReconnection(conn, info, connectionInfo);
      } else if (connectionInfo.discoveryTopicInfo.firstTime === true) {
        this.handleFirstTimeConnection(conn, info, connectionInfo);
      }
      
      // Common setup
      this.store.replicate(conn);

      // process network message
      conn.on('data', data =>
        // assess data
        this.assessData(publicKey, data)
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

    });
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
        } else if (dataShareIn.type === 'topic-reconnect-id') {
          this.emit('peer-reconnect-topic-id', dataShareIn.data)
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
  *  match peer to topic live
  *  @method matchPeerTopic
  * 
  */
  matchPeerTopic = function (topic) {
    // first match live pubkey to topic and then use topic to get original
    let peerSettings = {}
    for (let savePeer of this.peerNetwork) {
      if (savePeer.value.topic === topic) {
        peerSettings = savePeer
      }
    }
    return peerSettings
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

  /* dataFlowCheck = function (topicIn, role) {
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
  }*/
  
  /**
   * check discovery status on network
   * @method checkDisoveryStatus
   *
  */
  checkDisoveryStatus = function (nodeRole, publicKey, topic) {
    let topicList = []
    if (nodeRole === 'server') {
      topicList = this.sendTopicHolder
    } else if (nodeRole === 'client') {
      topicList = this.topicHolder
    }
    
    // previous info at hand 
    let firstTime = false
    let emptyHolder = false

    // we get public key --  discovery process to match to topic, has that topic been set before, then match live key to peerKey ie. the pubkey used an id from first time connection??
    // scenerios
    // 1. first time connection both client and server -- no save peers
    // 2. first time connection client -- with saved peers
    // 3. first time connection server -- with saved peers
    // 4. reconnect with only one options
    // 5. reconnect client with saved peers
    // 6. reconnect server with saved peers
    // 7  mix of peers acting as clients and server
    let checkDiscoveryInfo = {}
    // any existing peers
    if (this.peerNetwork.length === 0) {
      firstTime = true
    } else {
      // check in client or Server roles
      // client will have topic if returning peer
      if (nodeRole === 'client') {
        // check if topic in peerInfo on connect
        if (topic.length === 0) {
          firstTime = true
        }
      } else if (nodeRole === 'server') {
        if (topicList.length === 0) {
          firstTime = true
        } else {
          // could be first time connect
          // check if public keey in network
          let existingPeerCheck = false
          for (let peer of this.peerNetwork) {
            if (peer.key === publicKey) {
              existingPeerCheck = true
            } else {
              existingPeerCheck = false
            }
          }
          // can rule out reconnection?  not enough info at this time, peer if reconnect topic will send id to match direct
          if (existingPeerCheck === false) {
            firstTime = 'wait-topic-confirm'
          }
        }
      }
    }


    checkDiscoveryInfo.firstTime = firstTime
    checkDiscoveryInfo.emptyHolder = emptyHolder
    checkDiscoveryInfo.role = nodeRole
    checkDiscoveryInfo.server = ''
    checkDiscoveryInfo.client = ''
    checkDiscoveryInfo.topic = ''
    return checkDiscoveryInfo


    /*
    if (this.peerNetwork.length > 0) {
      emptyHolder = true
      // match pubkey to peer to get set topic
      let matchTopic = ''
      for (let peer of this.peerNetwork) {
        if (peer.key === publicKey) {
          matchTopic = peer.value.topic
        } else {
        }
      }
      // now use match topic to see if topic set as server or client roles?
      let sendLogic = []
      let holderLogic = []
      for (let sendPeerT of this.sendTopicHolder) {
        if (sendPeerT.topic === matchTopic) {
          sendLogic.push(sendPeerT)
        } else {
        }
      }
      let matchHolderKeys = Object.keys(this.topicHolder)
      for (let topicH of matchHolderKeys) {
        if (this.topicHolder[topicH].topic === matchTopic) {
          holderLogic.push(this.topicHolder[topicH])
        } else {
        }
      }
      console.log('match topic')
      console.log(matchTopic)
      console.log('send logic')
      console.log(sendLogic)
      console.log('holder logic')
      console.log(holderLogic)
      if (nodeRole === 'client') {
        console.log('extra workk for client')
        if (matchTopic.length > 0 && sendLogic.length === 0 && holderLogic.length === 0) {
          firstTime = true
        } else {
          firstTime = true
        }
      } else if (nodeRole === 'server') {
        console.log('extra workk for server')
        // check if public key match any exsting keyids?
        /* for (let peer of this.peerNetwork) {
          if (peer.key === publicKey) {
            firstTime = false
          } else {
            firstTime = true
          }
        } 
      }
 
    } else {
      firstTime = true
    }
    
    // has a topic already been sent to this peer, if not must be first time
    let beforeSendTopic = false
    for (let topicS of this.sendTopicHolder) {
      if (topicS.livePubkey === publicKey) {
        beforeSendTopic = true
      }
    }
    let checkDiscoveryTopic = {}
    checkDiscoveryTopic.firstTime = firstTime  // should this be set???
    if (topicList.length > 0) {
      for (let topicH of topicList) {
        const noisePublicKey = Buffer.from(topicH.topic, 'hex')
        let discovery = this.swarm.status(noisePublicKey)
        console.log('discovery000000000000000000000000')
        console.log(discovery.topic.toString('hex'))
        let discoverTopic = discovery.topic.toString('hex')
        if (discoverTopic === topicH.topic) {
          // do the peerid match?
          discovery.swarm.connections.forEach((value, key) => {
            console.log('value looooop')
            checkDiscoveryTopic.server = value.publicKey.toString('hex')
            checkDiscoveryTopic.client = value.remotePublicKey.toString('hex')
            checkDiscoveryTopic.topic = discoverTopic
          })
          if (checkDiscoveryTopic.client === topicH.peerKey) {
            console.log('retrun rrrr1111')
            checkDiscoveryTopic.firstTime = false
            console.log(checkDiscoveryTopic)
            return checkDiscoveryTopic
          } else {
            if (checkDiscoveryTopic.topic === topicH.topic) {
              // now check if returning
              if (firstTime === false && emptyHolder === true) {
                // match current public key to original key uses a permanent key
                let permKeyID = ''
                let topicSet = ''
                if (checkDiscoveryTopic.client === publicKey) {
                  permKeyID = checkDiscoveryTopic.client
                  topicSet = checkDiscoveryTopic.topic
                }
                // now use this id to check if peer has been invited
                let beforeTopicCheck = this.checkTopicModes(topicSet)
                console.log('beftopicchchc-------------------')
                console.log(beforeTopicCheck)
                checkDiscoveryTopic.firstTime = beforeTopicCheck.firstTime
              } else {
                checkDiscoveryTopic.firstTime = true
              }
              console.log('return rrrr2222')
              console.log(checkDiscoveryTopic)
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
      console.log('return rrrr3333')
      return checkDiscoveryTopic
    }
*/   
  }

  /**
   * match topics already set send and holder modes
   * @method checkTopicModes
   *
  */
  checkTopicModes = function (matchTopic) {
    // now use match topic to see if topic set as server or client roles?
    let sendLogic = []
    let holderLogic = []
    for (let sendPeerT of this.sendTopicHolder) {
      if (sendPeerT.topic === matchTopic) {
        sendLogic.push(sendPeerT)
      } else {
      }
    }
    let matchHolderKeys = Object.keys(this.topicHolder)
    for (let topicH of matchHolderKeys) {
      if (this.topicHolder[topicH].topic === matchTopic) {
        holderLogic.push(this.topicHolder[topicH])
      } else {
      }
    }
    let firstTime = false
    if (sendLogic.length === 0 && holderLogic.length === 0) {
      firstTime = true
    }

    return { firstTime: firstTime }
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
        this.Peers.writeToPublicLibrary(livePubkey, peerTopeerState)
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
   * write message to topic reconnect peer to inform of id
   * @method writeTopicReconnect
   *
  */
  writeTopicReconnect = function (publickey, topicInfo) {
    let topicReconnectMessage = {}
    topicReconnectMessage.type = 'topic-reconnect-id'
    topicReconnectMessage.data = { topic: topicInfo.topic, peerKey: topicInfo.peerKey }
    this.peerConnect[topicInfo.currentPubkey].write(JSON.stringify(topicReconnectMessage))
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