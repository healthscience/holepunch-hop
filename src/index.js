'use strict'
/**
*  Holepunch data interface
*
* @class HOP
* @package    HOP
* @copyright  Copyright (c) 2022 James Littlejohn
* @license    http://www.gnu.org/licenses/old-licenses/gpl-3.0.html
* @version    $Id$
*/
import EventEmitter from 'events'
import Corestore from 'corestore'
import Hyperswarm from 'hyperswarm'
import goodbye from 'graceful-goodbye'
import b4a from 'b4a'

class HolepunchWorker extends EventEmitter {

  constructor() {
    super()
    this.hello = 'holepunch'
  }

  /**
   * setup holepunch protocol
   * @method startHolepunch
   *
   */
  startHolepunch = async function () {
  }

  /**
  * pass on websocket to library
  * @method setWebsocket
  *
  */
  setWebsocket = function (ws) {
  }

  /**
   * setup holopunch protocols hypercore etc
   * @method setupHolepunch
   *
  */
  setupHolepunch = async function () {

  }

  /**
   * clean and close Holepunch connection
   * @method clearcloseHolepunch
   *
  */
  clearcloseHolepunch = async function () {
 
  }

  /**
   * start Hyperdrive
   * @method setupHyperdrive
   *
  */
  setupHyperdrive = async function () {
  }

}

export default HolepunchWorker    