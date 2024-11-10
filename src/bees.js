'use strict'
/**
*  Manage HyperBee  key store datastore
*
* @class HyperBee
* @package    HyperBee
* @copyright  Copyright (c) 2024 James Littlejohn
* @license    http://www.gnu.org/licenses/old-licenses/gpl-3.0.html
* @version    $Id$
*/
import EventEmitter from 'events'
import Hyperbee from 'hyperbee'
import b4a from 'b4a'

class HyperBee extends EventEmitter {

  constructor(store, swarm) {
    super()
    this.hello = 'hyperbee'
    this.store = store
    this.swarm = swarm
    this.liveBees = {}
    this.confirmPubLibList = {}
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
   * @method setupHyperbee
   *
  */
  setupHyperbee = async function () {
    let beePubkeys = []

    const core = this.store.get({ name: 'publiclibrary' })
    this.dbPublicLibrary = new Hyperbee(core, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.dbPublicLibrary.ready()
    beePubkeys.push({ store: 'publiclibrary', pubkey: b4a.toString(core.key, 'hex')})
    // allow other peer access to public library  (need to check for DDOS ie over asked)
    // join a topic
    const discovery = this.swarm.join(this.dbPublicLibrary.discoveryKey)
    // Only display the key once the Hyperbee has been announced to the DHT
    discovery.flushed().then(() => {
    })


    const core2 = this.store.get({ name: 'peerlibrary' })
    this.dbPeerLibrary = new Hyperbee(core2, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.dbPeerLibrary.ready()
    beePubkeys.push({store:'peerlibrary', pubkey: b4a.toString(core2.key, 'hex')})

    const core6 = this.store.get({ name: 'peers' })
    this.dbPeers = new Hyperbee(core6, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.dbPeers.ready()
    beePubkeys.push({store:'peers', pubkey: b4a.toString(core6.key, 'hex')})

    const core3 = this.store.get({ name: 'bentospaces' })
    this.dbBentospaces = new Hyperbee(core3, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.dbBentospaces.ready()
    beePubkeys.push({store:'bentospaces', pubkey: b4a.toString(core3.key, 'hex')})

    const core4 = this.store.get({ name: 'hopresults' })
    this.dbHOPresults = new Hyperbee(core4, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.dbHOPresults.ready()
    // this.client.replicate(this.dbHOPresults.feed)
    beePubkeys.push({store:'hopresults', pubkey: b4a.toString(core4.key, 'hex')})

    const core5 = this.store.get({ name: 'kbledger' })
    this.dbKBledger = new Hyperbee(core5, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.dbKBledger.ready()
    // this.client.replicate(this.dbKBledger.feed)
    beePubkeys.push({store:'kbledger', pubkey: b4a.toString(core5.key, 'hex')})
    // stores of cues, media, research, markers, products/treatments

    const core7 = this.store.get({ name: 'bentocues' })
    this.dbBentocues = new Hyperbee(core7, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.dbBentocues.ready()
    beePubkeys.push({store:'bentocues', pubkey: b4a.toString(core7.key, 'hex')})


    const core8 = this.store.get({ name: 'bentodecisions' })
    this.dbBentodecisions = new Hyperbee(core8, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.dbBentodecisions.ready()
    beePubkeys.push({store:'bentodecisions', pubkey: b4a.toString(core8.key, 'hex')})


    const core9 = this.store.get({ name: 'bentomarkers' })
    this.dbBentomarkers = new Hyperbee(core9, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.dbBentomarkers.ready()
    beePubkeys.push({store:'bentomarkers', pubkey: b4a.toString(core9.key, 'hex')})


    const core10 = this.store.get({ name: 'research' })
    this.dbBentoresearch = new Hyperbee(core10, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.dbBentoresearch.ready()
    beePubkeys.push({store:'research', pubkey: b4a.toString(core10.key, 'hex')})


    const core11 = this.store.get({ name: 'bentoproducts' })
    this.dbBentoproducts = new Hyperbee(core11, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.dbBentoproducts.ready()
    beePubkeys.push({store:'bentoproducts', pubkey: b4a.toString(core11.key, 'hex')})

    const core12 = this.store.get({ name: 'bentoproducts' })
    this.dbBentomedia = new Hyperbee(core12, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.dbBentomedia.ready()
    beePubkeys.push({store:'bentoproducts', pubkey: b4a.toString(core12.key, 'hex')})

    this.emit('hbee-live')
    // return beePubkeys
    let startBeePubkey = {}
    startBeePubkey.type = 'account'
    startBeePubkey.action = 'hyperbee-pubkeys'
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
    await this.dbPeerLibrary.put(refContract.data.hash, refContract.data.contract)
    let saveCheck = await this.getPeerLibrary(refContract.data.hash)
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
   * save chat history
   * @method saveBentochat
   *
  */
  saveBentochat = async function (chatHistory) {
    await this.dbBentospaces.put(chatHistory.chat.chatid, chatHistory)
    let checkSave = await this.getBentochat(chatHistory.chat.chatid)
    return checkSave
  }

  /**
   * delete chat item
   * @method deleteBentochat
   *
  */
  deleteBentochat = async function (chat) {
    await this.dbBentospaces.del(chat.chatid)
    let deleteInfo = {}
    deleteInfo.chatid = chat.chatid
    return deleteInfo
  }

  /**
   * lookup peer bentospace layout default
   * @method getBentochat
   *
  */
  getBentochat = async function (key) {
    // let key = 'startbentospaces'
    const nodeData = await this.dbBentospaces.get(key)
    return nodeData
  }

  /**
   * lookup range save chat history
   * @method getBentochatHistory
   *
  */
  getBentochatHistory = async function (range) {
    const chathistoryData = this.dbBentospaces.createReadStream() // { gt: 'a', lt: 'z' }) // anything >a and <z
    let chatData = []
    for await (const { key, value } of chathistoryData) {
      chatData.push({ key, value })
    }
    return chatData
  }

  /**
   * save space menu
   * @method saveSpaceHistory
   *
  */
  saveSpaceHistory = async function (spaceContract) {
    await this.dbBentospaces.put(spaceContract.space.spaceid, spaceContract)
    let checkSave = await this.getBentospace(spaceContract.space.spaceid)
    return checkSave
  }

  /**
   * save space layout of bentobox
   * @method saveBentospace
   *
  */
  saveBentospace = async function (spaceContract) {
    await this.dbBentospaces.put(spaceContract.spaceid, spaceContract)
    let checkSave = await this.getBentospace(spaceContract.spaceid)
    return checkSave
  }

  /**
   * lookup peer bentospace layout default
   * @method getBentospace
   *
  */
  getBentospace = async function (key) {
    const nodeData = await this.dbBentospaces.get(key)
    return nodeData
  }

  /**
   * delete nxp ref contract from peer library
   * @method deleteBentospace
   *
  */
  deleteBentospace = async function (space) {
    const deleteStatus = await this.dbBentospaces.del(space.spaceid)
    let deleteInfo = {}
    deleteInfo.spaceid = space.spaceid
    return deleteInfo
  }

  /** CUES */
  /**
   * save cues
   * @method saveCues
   *
  */
  saveCues = async function (cuesInfo) {
    console.log('save cue pleleelleellel')
    console.log(cuesInfo)
    await this.dbBentocues.put(cuesInfo.cueid, cuesInfo.data)
    let checkSave = await this.getCues(cuesInfo.cueid)
    return checkSave
  }

  /**
   * get one cue by id
   * @method getCues
   *
  */
  getCues = async function (key) {
    const nodeData = await this.dbBentocues.get(key)
    return nodeData
  }

  /**
   * get all cuees
   * @method getCuesHistory
   *
  */
  getCuesHistory = async function (key) {
    const cuesHistory = await this.dbBentocues.createReadStream()
    let cuesData = []
    for await (const { key, value } of cuesHistory) {
      cuesData.push({ key, value })
    }    
    return cuesData
  }

  /**
   * delete nxp ref contract from peer library
   * @method deleteBentocue
  */
  deleteBentocue = async function (cue) {
    const deleteStatus = await this.dbBentocues.del(cue.cueid)
    let deleteInfo = {}
    deleteInfo.spaceid = cue.cueid
    return deleteInfo
  }

 /** MEDIA */
  /**
   * save media
   * @method saveMedia
   *
  */
  saveMedia = async function (mediaInfo) {
    console.log('save cue pleleelleellel')
    await this.dbBentomedia.put(mediaInfo.id, mediaInfo)
    let checkSave = await this.getCues(mediaInfo.id)
    return checkSave
  }

  /**
   * get one cue by id
   * @method getMedia
   *
  */
  getMedia = async function (key) {
    const nodeData = await this.dbBentomedia.get(key)
    return nodeData
  }

  /**
   * delete nxp ref contract from peer library
   * @method deleteBentocue
  */
  deleteBentomedia = async function (media) {
    const deleteStatus = await this.dbBentomedia.del(media.id)
    let deleteInfo = {}
    deleteInfo.spaceid = media.id
    return deleteInfo
  }

  /** RESEARCH */
  /**
   * save research
   * @method saveResearch
   *
  */
  saveResearch = async function (cuesInfo) {
    await this.dbBentoresearch.put(cuesInfo.cueid, cuesInfo.data)
    let checkSave = await this.getResearch(cuesInfo.cueid)
    return checkSave
  }

  /**
   * get one cue by id
   * @method getResearch
   *
  */
  getResearch = async function (key) {
    const nodeData = await this.dbBentoresearch.get(key)
    return nodeData
  }

  /**
   * get all research
   * @method getResearchHistory
   *
  */
  getResearchHistory = async function (key) {
    const cuesHistory = await this.dbBentoresearch.createReadStream()
    let cuesData = []
    for await (const { key, value } of cuesHistory) {
      cuesData.push({ key, value })
    }    
    return cuesData
  }

  /**
   * delete contract
   * @method deleteBentoResearch
  */
  deleteBentoResearch = async function (cue) {
    const deleteStatus = await this.dbBentoresearch.del(cue.cueid)
    let deleteInfo = {}
    deleteInfo.spaceid = cue.cueid
    return deleteInfo
  }

  /** MARKER */
  /**
   * save marker
   * @method saveMarker
   *
  */
  saveMarker = async function (cuesInfo) {
    await this.dbBentomarkers.put(cuesInfo.cueid, cuesInfo.data)
    let checkSave = await this.getMarker(cuesInfo.cueid)
    return checkSave
  }

  /**
   * get one cue by id
   * @method getMarker
   *
  */
  getMarker = async function (key) {
    const nodeData = await this.dbBentomarkers.get(key)
    return nodeData
  }

  /**
   * get all research
   * @method getMarkerHistory
   *
  */
  getMarkerHistory = async function (key) {
    const cuesHistory = await this.dbBentomarkers.createReadStream()
    let cuesData = []
    for await (const { key, value } of cuesHistory) {
      cuesData.push({ key, value })
    }    
    return cuesData
  }

  /**
   * delete contract
   * @method deleteBentoMarker
  */
  deleteBentoMarker = async function (cue) {
    const deleteStatus = await this.dbBentomarkers.del(cue.cueid)
    let deleteInfo = {}
    deleteInfo.spaceid = cue.cueid
    return deleteInfo
  }

  /** Product */
  /**
   * save product
   * @method saveProduct
   *
  */
  saveProduct = async function (cuesInfo) {
    await this.dbBentoproducts.put(cuesInfo.cueid, cuesInfo.data)
    let checkSave = await this.getProduct(cuesInfo.cueid)
    return checkSave
  }

  /**
   * get one cue by id
   * @method getProduct
   *
  */
  getProduct = async function (key) {
    const nodeData = await this.dbBentoproducts.get(key)
    return nodeData
  }

  /**
   * get all prodcut
   * @method getProductHistory
   *
  */
  getProductHistory = async function (key) {
    const cuesHistory = await this.dbBentoproducts.createReadStream()
    let cuesData = []
    for await (const { key, value } of cuesHistory) {
      cuesData.push({ key, value })
    }    
    return cuesData
  }

  /**
   * delete contract
   * @method deleteBentoProduct
  */
  deleteBentoMarker = async function (cue) {
    const deleteStatus = await this.dbBentoproducts.del(cue.cueid)
    let deleteInfo = {}
    deleteInfo.spaceid = cue.cueid
    return deleteInfo
  }

  /**
   * save space layout of bentobox
   * @method saveSolospace
   *
  */
  saveSolospace = async function (spaceContract) {
    let key = 'startsolospaces'
    await this.dbBentospaces.put(key, spaceContract)
    let checkSave = await this.getSolospace(key)
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
   * filter peer library to get compute modules with a key
   * @method getPeerLibComputeModules
   *
  */
  getPeerLibComputeModules = async function () {
    const moduleData = await this.dbPeerLibrary.createHistoryStream({ reverse: true, limit: 10 })
    return moduleData
  }


  /**
   * get all kbl entries
   * @method KBLentries
   *
  */
  KBLentries = async function (dataPrint) {
    const nodeData = this.dbKBledger.createReadStream()
    let ledgerData = []
    for await (const { key, value } of nodeData) {
      ledgerData.push({ key, value })
    }
    return ledgerData
  }

  /**
   * lookup specific result UUID
   * @method peerResultsItem
   *
  */
  peerResultsItem = async function (dataPrint) {
    const resultsData = this.dbKBledger.get(dataPrint.resultuuid)
    return resultsData
  }

  /**
   * lookup specific result UUID
   * @method peerResults
   *
  */
  peerResults = async function () {
    const nodeData = this.dbKBledger.createReadStream()
    let resData = []
    for await (const { key, value } of nodeData) {
      resData.push({ key, value })
    }
    return resData
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
   * delete nxp ref contract public
   * @method deleteRefcontPubliclibrary
   *
  */
  deleteRefcontPubliclibrary = async function (nxpID) {
    let deleteInfo = {}
    let deleteStatus = await this.dbPublicLibrary.del(nxpID)
    deleteInfo.success = deleteStatus
    deleteInfo.nxp = nxpID
    return deleteInfo
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
   * repicate the publiclibrary peer to peer
   * @method replicatePubliclibrary
   *
  */
  replicatePubliclibrary = async function (dataIn) {
    // create or get the hypercore using the public key supplied as command-line argument
    const coreRep = this.store.get({ key: b4a.from(dataIn.data.datastores, 'hex') })

    // create a hyperbee instance using the hypercore instance
    const beePlib = new Hyperbee(coreRep, {
      keyEncoding: 'utf-8',
      valueEncoding: 'utf-8'
    })

    // wait till the hypercore properties to be intialized
    await coreRep.ready()

    // logging the public key of the hypercore instance
    // console.log('core key here is:', coreRep.key.toString('hex'))

    // Attempt to connect to peers
    this.swarm.join(coreRep.discoveryKey, { server: false, client: true })

    await coreRep.update()

    // if provided with specific boarnxp key then just get the contract, extract module contracts and get those contracts and then inform the peer and save to their public library
    const boardNXPcontract = await beePlib.get(dataIn.data.boardID)
    let unString = JSON.parse(boardNXPcontract.value)
    let moduleContracts = []
    for (let mod of unString.modules) {
      let modC = await beePlib.get(mod)
      moduleContracts.push(modC)
    }
    // next reference contracts, then ref within refs i.e. packaging datatypes
    let referenceContracts = []
    for (let modRef of moduleContracts) {
      let unString = JSON.parse(modRef.value)
      if (unString.style === 'packaging') {
        // get list of datatypes
        for (let ref of unString.info.value.concept.tablestructure) {
          if (ref?.refcontract) {
          let refC = await beePlib.get(ref.refcontract)
            referenceContracts.push(refC)
          }
        }
      } else if (unString.style === 'compute') {
        // console.log('compute TODO')
        // console.log(unString)
      } else if (unString.style === 'visualise') {
        // console.log('visualise TODO')
        // console.log(unString)
      } else if (unString.style === 'question') {
        let questRef = {}
        questRef.key = unString.info.key
        questRef.value = JSON.stringify(unString.info.value)
        referenceContracts.push(questRef)
      }
    }
    // notify and get confirmation to accept and save to public library
    if (moduleContracts.length > 0) {
      // keep hold of data ready to be confirmed
      let holderConfirm = {}
      holderConfirm.boardNXP = [boardNXPcontract]
      holderConfirm.modules = moduleContracts
      holderConfirm.refcontracts = referenceContracts
      this.confirmPubLibList[dataIn.data.datastores] = holderConfirm
      this.emit('publibbeebee-notification', dataIn.data)
    }
    // or
    // now ask for whole of public library
    /* read all of repliate connect bee and displays */
    const chathistoryData = beePlib.createReadStream() // { gt: 'a', lt: 'z' }) // anything >a and <z
    let chatData = []
    for await (const { key, value } of chathistoryData) {
      if (key === dataIn.data.boardID) {
       chatData.push({ key, value })
      }
    }
    // now replicate with peer own public library in whole or per nxp
    /* let savePublib = await this.updatePublicLibrary(beePlib)
    let repMessage = {}
    repMessage.type = 'library'
    repMessage.action = 'replicate-publiclibrary'
    repMessage.task = 'replicate'
    repMessage.reftype = 'publiclibrary'
    repMessage.data = savePublib
    return repMessage */
  }


  /**
   * peer confirmed add to public library
   * @method addConfrimPublicLibrary
   *
  */
  addConfrimPublicLibrary = async function (data) {
    // add board nxp
    await this.updatePublicLibrary(this.confirmPubLibList[data.datastores].boardNXP)
    // add modules
    await this.updatePublicLibrary(this.confirmPubLibList[data.datastores].modules)
    // add reference
    await this.updatePublicLibrary(this.confirmPubLibList[data.datastores].refcontracts)
  }

  /**
   * update public library from peers public library
   * @method updatePublicLibrary
   *
  */
  updatePublicLibrary = async function (libContracts) {
    // save entries required
    const batch = this.dbPublicLibrary.batch()
    for (const { key, value } of libContracts) {
      await batch.put(key, JSON.parse(value))
    }
    await batch.flush()

    // check
    const libUpdatecheck = this.dbPublicLibrary.createReadStream()
    let libConracts = []
    for await (const { key, value } of libUpdatecheck) {
      libConracts.push({ key, value })
    }
    return true
  }

  /**
   * repicate the publiclibrary peer to peer
   * @method replicatePubliclibraryOLD
   *
  */
  replicatePubliclibraryOLD = async function (key) {
    // key = '3ec0f3b78a0cfe574c4be89b1d703a65f018c0b73ad77e52ac65645d8f51676a'
    const store = this.client.corestore('peerspace-hyperbeetemp')
    const core = this.store.get(key)
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
    const core = this.store.get(beeKey)

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
      // need a save funnction in here
      if (key === 'bdb6a7db0b479d9b30406cd24f3cc2f315fd3ba0') {
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