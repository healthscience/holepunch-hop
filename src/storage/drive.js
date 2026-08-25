'use strict'
/**
*  Manage HyperDrive  file datastore
*
* @class HypDrive
* @package    HypDrive
* @copyright  Copyright (c) 2022 James Littlejohn
* @license    http://www.gnu.org/licenses/old-licenses/gpl-3.0.html
* @version    $Id$
*/
import EventEmitter from 'events'
import PeerDrive from './hyperdrive/private-drive.js'
import PublicDrive from './hyperdrive/public-drive.js'

class HypDrive extends EventEmitter {

  constructor(core, swarm, crypto) {
    super()
    this.hello = 'hyperdrive'
    this.core = core
    this.swarm = swarm
    this.crypto = crypto
    this.drive = {}
    this.dataBase = {}
    this.activeWriteStreams = {}
    // private and public file storage
    const privateStore = this.core.namespace('private-drive')
    const publicStore = this.core.namespace('public-drive')
    this.peerDrive = new PeerDrive(privateStore, swarm, crypto)
    this.publicDrive = new PublicDrive(publicStore, swarm, crypto)
  }

    /**
   * pass on websocket to library
   * @method setWebsocket
   *
  */
  setWebsocket = function (ws) {
    this.wsocket = ws
  }

  /**
   * produce list of files in folder
   * @method listFilesFolder 
   *
  */
  listFilesFolder = async function (folder) {
    const stream = await this.peerDrive.list(folder) //  [options])
    return stream
  }

}

export default HypDrive