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
// import DHT from '@hyperswarm/dht'
import goodbye from 'graceful-goodbye'
import b4a from 'b4a'


class NetworkPeers extends EventEmitter {

  constructor(store, swarm) {
    super()
    console.log('peer manager')
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
  listenNetwork = function () {
    this.swarm.on('connection', (conn, info) => {
      // listen for replication
      this.store.replicate(conn)
      // listener to write message to peers or network partial or broadcast
      let publicKeylive = info.publicKey.toString('hex')
      this.emit('connect-warm', publicKeylive)
      this.peerConnect[publicKeylive] = conn
      this.emit('peer-connect', publicKeylive)
      // process network message
      conn.on('data', data =>
        // console.log('recieve network message:', data.toString()),
        // console.log(data.toString()),
        // console.log('emit to be verified and acted upon appropriately'),
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
    console.log('assess---data receive peer-----------')
    if (Buffer.isBuffer(data)) {
      console.log('1 buffer')
      try {
        let dataShareIn = JSON.parse(data.toString())
        if (dataShareIn.type === 'chart') {
          this.emit('beebee-data', dataShareIn)
          // need to look at NXP,  modules and within for reference contracts.
          // Need to replicate public library for contracts (repliate hyberbee)
          // Need to ask for data source e.g. file (replicate hyberdrive)
          // Lastly put together SafeFlowECS query to produce chart
        } else if (dataShareIn.type === 'peer') {
          console.log('3 buffer')
        }
        console.log(a)
      } catch (e) {
          return console.error('ignore')
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
      console.log('non chart write')
    }
  }


  /**
   * join peer to peer private (server)
   * @method peerJoin
   *
  */
  peerJoin = function (peerContext) {
    this.peerHolder[peerContext.publickey] = peerContext
    const noisePublicKey = Buffer.from(peerContext.publickey, 'hex') //  must be 32 bytes
    if (noisePublicKey.length === 32) {
      const peerConnect = this.swarm.joinPeer(noisePublicKey, { server: true, client: false })
    }
  }

  /**
   * already joined but keep track context data
   * @method peerAlreadyJoin
   *
  */
  peerAlreadyJoin = function (peerContext) {
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
   * listen for topics as a client
   * @method listenClient
   *
  */
  listenClient = async function (topic) {
    const noisePublicKey = Buffer.alloc(32).fill(topic) // A topic must be 32 bytes
    const peerConnect = this.swarm.join(noisePublicKey, { server: false, client: true })
    await peerConnect.flushed() // Waits for the topic to be fully announced on the DHT
  }

  /**
   * 
   * @method listen
   *
  */
  listen = function () {
    console.log('listen')
  }

  /**
   * setup peers protocol
   * @method setupHyerPeers
   *
  */
  setupHyerPeers = function () {
    /* const dht = new DHT()

    // This keypair is your peer identifier in the DHT
    const keyPair = DHT.keyPair()

    const server = dht.createServer(conn => {
      console.log('got connection!')
      process.stdin.pipe(conn).pipe(process.stdout)
    })

    server.listen(keyPair).then(() => {
      console.log('listening on:', b4a.toString(keyPair.publicKey, 'hex'))
    })

    // Unnannounce the public key before exiting the process
    // (This is not a requirement, but it helps avoid DHT pollution)
    goodbye(() => server.close()) */
  }

}

export default NetworkPeers