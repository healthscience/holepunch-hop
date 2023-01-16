'use strict'
/**
*  Manage Peers connections
*
* @class HypPeers
* @package    HypPeers
* @copyright  Copyright (c) 2022 James Littlejohn
* @license    http://www.gnu.org/licenses/old-licenses/gpl-3.0.html
* @version    $Id$
*/
import EventEmitter from 'events'
import DHT from '@hyperswarm/dht'
import goodbye from 'graceful-goodbye'
import b4a from 'b4a'


class HypPeers extends EventEmitter {

  constructor(core, swarm) {
    super()
    this.hello = 'hyperpeers'
    this.core = core
    this.swarm = swarm
    this.drive = {}
    // this.setupHyerPeers()
  }

  /**
   * setup peers protocol
   * @method setupHyerPeers
   *
  */
  setupHyerPeers = function () {
    const dht = new DHT()

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
    goodbye(() => server.close())
  }

}

export default HypPeers