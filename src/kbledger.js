'use strict'
/**
*  Manage HyperBee  key store datastore
*
* @class HypBee
* @package    HypBee
* @copyright  Copyright (c) 2022 James Littlejohn
* @license    http://www.gnu.org/licenses/old-licenses/gpl-3.0.html
* @version    $Id$
*/
import EventEmitter from 'events'
import Hyperbee from 'hyperbee'

import { Node } from 'hyperbee/lib/messages.js'
import { start } from 'repl'

class HyperBee extends EventEmitter {

  constructor(core, swarm) {
    super()
    this.hello = 'hyperbee'
    this.core = core
    this.swarm = swarm
    this.liveLedger = {}
    // this.setupHyperbee()
  }

  /**
   * setup hypercore protocol
   * @method startKBLedger
   *
  */
  startKBLedger = async function () {
    let ledgerPubkeys = []

    const core = store.get({ name: 'KBLedger' })

    await this.dbKBledger.ready()
    this.client.replicate(this.dbKBledger.feed)
    beePubkeys.push({'kbledger': this.dbKBledger._feed.key.toString('hex')})

    // return beePubkeys
    let startLedgerPubkey = {}
    startLedgerPubkey.type = 'ledger-pubkeys'
    startLedgerPubkey.data = beePubkeys
    this.liveLedger = startLedgerPubkey
    console.log(this.liveBees)
    // this.wsocket.send(JSON.stringify(startBeePubkey))
  }

  /**
   * save kbledger entry
   * @method saveKBLentry
   *
  */
  saveKBLentry = async function (ledgerEntry) {
    await this.dbKBledger.put(ledgerEntry.hash, ledgerEntry.data)
  }

}

export default KBLedger