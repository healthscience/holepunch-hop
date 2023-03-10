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
import b4a from 'b4a'

import { Node } from 'hyperbee/lib/messages.js'
import { start } from 'repl'

class HyperBee extends EventEmitter {

  constructor(core, swarm) {
    super()
    this.hello = 'hyperbee'
    this.core = core
    this.swarm = swarm
    this.liveBees = {}
    // this.setupHyperbee()
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
   * setup hypercore protocol
   * @method startHyperbee
   *
  */
  setupHyperbee = async function () {
    let beePubkeys = []

    const core = this.core.get({ name: 'publiclibrary' })
    this.dbPublicLibrary = new Hyperbee(core, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.dbPublicLibrary.ready()
    beePubkeys.push({'pubilclibrary': b4a.toString(core.key, 'hex')})
    // console.log(this.dbPublicLibrary._feed)
    // this.client.replicate(this.dbPublicLibrary.feed)

    const core2 = this.core.get({ name: 'peerlibrary' })
    this.dbPeerLibrary = new Hyperbee(core2, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.dbPeerLibrary.ready()
    beePubkeys.push({'peerlibrary': b4a.toString(core2.key, 'hex')})

    const core6 = this.core.get({ name: 'peers' })
    this.dbPeers = new Hyperbee(core6, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.dbPeers.ready()
    beePubkeys.push({'peers': b4a.toString(core6.key, 'hex')})

    const core3 = this.core.get({ name: 'bentospaces' })
    this.dbBentospaces = new Hyperbee(core3, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.dbBentospaces.ready()
    beePubkeys.push({'bentospaces': b4a.toString(core3.key, 'hex')})

    const core4 = this.core.get({ name: 'hopresults' })
    this.dbHOPresults = new Hyperbee(core4, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.dbHOPresults.ready()
    // this.client.replicate(this.dbHOPresults.feed)
    beePubkeys.push({'hopresults': b4a.toString(core4.key, 'hex')})

    const core5 = this.core.get({ name: 'kbledger' })
    this.dbKBledger = new Hyperbee(core5, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.dbKBledger.ready()
    // this.client.replicate(this.dbKBledger.feed)
    beePubkeys.push({'kbledger': b4a.toString(core5.key, 'hex')})
    // return beePubkeys
    let startBeePubkey = {}
    startBeePubkey.type = 'hyperbee-pubkeys'
    startBeePubkey.data = beePubkeys
    this.liveBees = startBeePubkey
    this.wsocket.send(JSON.stringify(startBeePubkey))
  }

  /**
   * save pair in keystore public network library
   * @method savePubliclibrary
   *
  */
  savePubliclibrary = async function (refContract) {
    let beeSave = await this.dbPublicLibrary.put(refContract.data.hash, refContract.data.contract)
    // go query the key are return the info. to ensure data save asplanned.
    let saveCheck = await this.getPublicLibrary(refContract.data.hash)
    let returnMessage = {}
    returnMessage.stored = true
    returnMessage.type = refContract.reftype
    returnMessage.key = saveCheck.key
    returnMessage.contract = saveCheck.value
    return returnMessage
  }
  

  /**
   * save pair in keystore db
   * @method savePeerLibrary
   *
  */
  savePeerLibrary = async function (refContract) {
    await this.dbPeerLibrary.put(refContract.hash, refContract.contract)
    let saveCheck = await this.getPeerLibrary(refContract.hash)
    let returnMessage = {}
    returnMessage.stored = true
    returnMessage.type = refContract.reftype
    returnMessage.key = saveCheck.key
    returnMessage.contract = saveCheck.value
    return returnMessage
  }

  /**
   * save kbledger entry
   * @method saveKBLentry
   *
  */
  saveKBLentry = async function (ledgerEntry) {
    await this.dbKBledger.put(ledgerEntry.hash, ledgerEntry.data)
  }

  /**
   * save HOPresults
   * @method saveHOPresults
   *
  */
  saveHOPresults = async function (refContract) {
    await this.dbHOPresults.put(refContract.hash, refContract.data)
  }

  /**
   * save space layout of bentobox
   * @method saveBentospace
   *
  */
  saveBentospace = async function (spaceContract) {
    let key = 'startbentospaces'
    await this.dbBentospaces.put(key, spaceContract)
    let checkSave = await this.getBentospace(key)
    return checkSave
  }

  /**
   * lookup peer bentospace layout default
   * @method getBentospace
   *
  */
  getBentospace = async function () {
    let key = 'startbentospaces'
    const nodeData = await this.dbBentospaces.get(key)
    return nodeData
  }

  /**
   * save space layout of bentobox
   * @method saveSolospace
   *
  */
  saveSolospace = async function (spaceContract) {
    let key = 'startsolospaces'
    await this.dbBentospaces.put(key, spaceContract)
    let checkSave = await this.getBentospace(key)
    return checkSave
  }

  /**
   * lookup peer solospace layout default
   * @method getSolospace
   *
  */
  getSolospace = async function () {
    let key = 'startsolospaces'
    const nodeData = await this.dbBentospaces.get(key)
    return nodeData
  }

  /**
   * lookup specific result UUID
   * @method getPublicLibrary
   *
  */
  getPublicLibrary = async function (contractID) {
    const nodeData = await this.dbPublicLibrary.get(contractID)
    return nodeData
  }

  /**
   * lookup range query of db
   * @method getPublicLibraryRange
   *
  */
  getPublicLibraryRange = async function (range) {
    const nodeData = this.dbPublicLibrary.createReadStream() // { gt: 'a', lt: 'z' }) // anything >a and <z
    let contractData = []
    for await (const { key, value } of nodeData) {
      contractData.push({ key, value })
    }
    return contractData
  }

  /**
   * return the last entry into db
   * @method getPublicLibraryLast
   *
  */
  getPublicLibraryLast = async function (dataPrint) {
    const nodeData = this.dbPublicLibrary.createHistoryStream({ reverse: true, limit: 1 })
    return nodeData
  }

  /**
   * lookup al peer library entries
   * @method getPeerLibrary
   *
  */
  getPeerLibrary = async function (contractID) {
    const nodeData = await this.dbPeerLibrary.get(contractID)
    return nodeData
  }

  /**
   * lookup al peer library range
   * @method getPeerLibraryRanage
   *
  */
  getPeerLibraryRange = async function () {
    const nodeData = await this.dbPeerLibrary.createReadStream() // { gt: 'a', lt: 'z' })
    let contractData = []
    for await (const { key, value } of nodeData) {
      contractData.push({ key, value })
    }
    return contractData
  }

  /**
   * lookup al peer library Last entry
   * @method getPeerLibraryLast
   *
  */
  getPeerLibraryLast = async function () {
    const nodeData = await this.dbPeerLibrary.createHistoryStream({ reverse: true, limit: 1 })
    return nodeData
  }

  /**
   * lookup specific result UUID
   * @method peerResults
   *
  */
  peerResults = async function (dataPrint) {
    const nodeData = await this.dbHOPresults.get(dataPrint.resultuuid)
    return nodeData
  }


  /**
   * get stream data for keystore db
   * @method getStreamHyperbeeDB
   *
  */
  getStreamHyperbeeDB = async function () {
    // if you want to read a range
    let rs = this.dbbee.createReadStream({ gt: 'a', lt: 'd' }) // anything >a and <d

    let rs2 = this.dbbee.createReadStream({ gte: 'a', lte: 'd' }) // anything >=a and <=d

    for await (const { key, value } of rs) {
      console.log(`${key} -> ${value}`)
    }

  }

  /**
   * delete nxp ref contract from peer library
   * @method deleteRefcontPeerlibrary
   *
  */
  deleteRefcontPeerlibrary = async function (nxpID) {
    let deleteInfo = {}
    let deleteStatus = await this.dbPeerLibrary.del(nxpID)
    deleteInfo.success = deleteStatus
    deleteInfo.nxp = nxpID
    return deleteInfo
  }

  /**
   * delete nxp ref contract from peer library
   * @method deleteBentospace
   *
  */
  deleteBentospace = async function (nxpID) {
    let key = 'startbentospaces'
    const deleteStatus = await this.dbBentospaces.del(key)
    return deleteStatus
}

  /**
   * repicate the publiclibrary peer to peer
   * @method replicatePubliclibrary
   *
  */
  replicatePubliclibrary = async function (key) {
    console.log('key to repilicate')
    console.log(key)
    // key = '3ec0f3b78a0cfe574c4be89b1d703a65f018c0b73ad77e52ac65645d8f51676a'
    const store = this.client.corestore('peerspace-hyperbeetemp')
    const core = this.core.get(key)
    this.dbPublicLibraryTemp = new Hyperbee(core, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.client.replicate(this.dbPublicLibraryTemp.feed) // fetch from the network
    await this.dbPublicLibraryTemp.ready()
    // rep demo data
    let resultsDemoRep = await this.replicateHOPresults()
    let repResponse = {}
    repResponse.replicate = true
    repResponse.type = 'temppubliclibrary'
    repResponse.demo = resultsDemoRep 
    return repResponse
  }

  /**
   * get the network library reference contracts - all for now replicate source
   * @method getReplicatePublicLibrary
   *
  */
  getReplicatePublicLibrary = async function (nxp) {
    console.log('temp public library get info from peer replicate')
    console.log(nxp)
    // const peerRepData = await this.dbPublicLibraryTemp.get()
    const peerRepData = await this.dbPublicLibraryTemp.createReadStream()
    let contractData = []
    for await (const { key, value } of peerRepData) {
      contractData.push({ key, value })
    }
    return contractData
  }

  /**
   * replicate the demo data to the peers results
   * @method replicateHOPresults
   *
  */
  replicateHOPresults = async function () {
    const beeKey = 'eff38e0adefd1e1ffcc8dcf4e3413148645a183f2c13679365c431bcc2d26668'

    const store = this.client.corestore('peerspace-hyperbeetemp')
    const core = this.core.get(beeKey)

    // load and read the hyperbee identified by `beeKey`
    const beeResults =new Hyperbee(core, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })

    await this.client.replicate(beeResults.feed) // fetch from the network
    await beeResults.ready()
    // console.log('value for key ie results dataPrint')
    // console.log(await beeResults.get('005ad9c1c29b6b730b6e9f73dd108f8c716a6075'))
    // console.log('after get uuid')
    let rs = beeResults.createReadStream() // anything >=a and <=d

    for await (const { key, value } of rs) {
      // console.log(`${key} -> ${value}`)
      // need a save funnction in here
      if (key === 'bdb6a7db0b479d9b30406cd24f3cc2f315fd3ba0') {
        // console.log(`${key} -> ${value}`)
        let dataR = {}
        dataR.hash = key
        dataR.data = value
        await this.saveHOPresults(dataR)
      }  
    }
    let repRresponse = {}
    repRresponse.replicate = true
    repRresponse.type = 'represultsdemo'
    return repRresponse
  }

  /**
   * take nxp id from temporary pubic network library and add to peers public library
   * @method publicLibraryAddentry
   *
  */
  publicLibraryAddentry = async function (nxp) {
    console.log('add entry from nl2')
    console.log(nxp)
    const localthis = this
    const refContract = await this.dbPublicLibraryTemp.get(nxp.nxpID)
      // need to look up individual module contracts and copy them across
    for (let mod of refContract.value.modules) {
      // more hypertie get queries and saving
      const modRefContract = await localthis.dbPublicLibraryTemp.get(mod)
        if (modRefContract.value.info.moduleinfo.name === 'visualise') {
          // what are the datatypes?
          let datatypeList = []
          datatypeList.push(modRefContract.value.info.option.settings.xaxis)
          datatypeList = [...datatypeList, ...modRefContract.value.info.option.settings.yaxis]
          for (let dtref of datatypeList) {
            if (dtref !== null) {
              const tempRC = await localthis.dbPublicLibraryTemp.get(dtref)
              const saveReprc = await localthis.dbPublicLibrary.put(tempRC.key, tempRC.value)
              // return saveReprc
            }
          }
        }
        // need to get the underlying ref contract for module type e.g data, compute, vis
        if (modRefContract.value.info.refcont) {
          const tempRC = await localthis.dbPublicLibraryTemp.get(modRefContract.value.info.refcont)
          const saveRC = await  localthis.dbPublicLibrary.put(tempRC.key, tempRC.value)
          // return saveRC
        }
      const saveRClib = await localthis.dbPublicLibrary.put(modRefContract.key, modRefContract.value)
      // return saveRClib
      const savePublibrc = await localthis.dbPublicLibrary.put(refContract.key, refContract.value)
      // return savePublibrc
    }
  }

}

export default HyperBee