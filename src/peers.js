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

  constructor(core, swarm) {
    super()
    console.log('peer manager')
    this.hello = 'hyperpeers'
    this.core = core
    this.swarm = swarm
    this.drive = {}
  }

  /**
   * public/piv key on DHT
   * @method networkKeys
   *
  */
  networkKeys = function () {
    console.log('hyperswarm begin2')
    let peerNxKeys = {}
    peerNxKeys.publickey = this.swarm.keyPair.publicKey.toString('hex')
    let networkMessage = {}
    networkMessage.type = 'account'
    networkMessage.action = 'network-keys'
    networkMessage.data = peerNxKeys
    this.emit('peer-network', networkMessage)
    this.listenNetwork()
  }

  /**
   * connection listen
   * @method listenNetwork
   *
  */
  listenNetwork = function () {
    console.log('listen network')
    this.on('peer-write', (data) => {
      console.log('peer message tos send')
      // conn.write('peer welcome to HOP++' + JSON.stringify(data))
    })
    this.swarm.on('connection', (conn, info) => {
      // listener to write message to peers or network partial or broadcast

      // process network message
      conn.on('data', data =>
        console.log('recieve network message:', data.toString()),
        console.log('emit to be verified and acted upon appropriately')
      )
      //conn.end()
    })
  }

  /**
   * write message to network
   * @method writeTonetwork
   *
  */
  writeTonetwork = function (data) {
   console.log('write emit')
    this.emit('peer-write', data)
  }


  /**
   * join peer to peer private (server)
   * @method peerJoin
   *
  */
  peerJoin = function (peerPubkey) {
    const noisePublicKey = Buffer.from(peerPubkey, 'hex') //  must be 32 bytes
    if (noisePublicKey.length === 32) {
      const peerConnect = this.swarm.joinPeer(noisePublicKey, { server: true, client: false })
    }
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
    const peerConnect = this.swarm.joinPeer(noisePublicKey, { server: false, client: true })
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