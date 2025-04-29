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
    this.repPublicHolder = {}
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
    console.log('setting up hyperbee')
    let beePubkeys = []

    const core = this.store.get({ name: 'publiclibrary' })
    this.dbPublicLibrary = new Hyperbee(core, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.dbPublicLibrary.ready()
    beePubkeys.push({ store: 'publiclibrary', privacy: 'public', pubkey: b4a.toString(this.dbPublicLibrary.key, 'hex')})
    // allow other peer access to public library  (need to check for DDOS ie over asked)
    // join a topic for network 
    const discovery = this.swarm.join(this.dbPublicLibrary.discoveryKey)
    // Only display the key once the Hyperbee has been announced to the DHT
    discovery.flushed().then(() => {
      console.log('public library open')
    })

    const core2 = this.store.get({ name: 'peerlibrary' })
    this.dbPeerLibrary = new Hyperbee(core2, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.dbPeerLibrary.ready()
    beePubkeys.push({store:'peerlibrary', privacy: 'private', pubkey: b4a.toString(core2.key, 'hex')})

    const core6 = this.store.get({ name: 'peers' })
    this.dbPeers = new Hyperbee(core6, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.dbPeers.ready()
    beePubkeys.push({store:'peers', privacy: 'private', pubkey: b4a.toString(core6.key, 'hex')})

    const core3 = this.store.get({ name: 'bentospaces' })
    this.dbBentospaces = new Hyperbee(core3, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.dbBentospaces.ready()
    beePubkeys.push({store:'bentospaces', pubkey: b4a.toString(core3.key, 'hex')})

    const core14 = this.store.get({ name: 'bentochat' })
    this.dbBentochat = new Hyperbee(core14, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.dbBentochat.ready()
    beePubkeys.push({store:'bentochat', privacy: 'private', pubkey: b4a.toString(core3.key, 'hex')})


    const core4 = this.store.get({ name: 'hopresults' })
    this.dbHOPresults = new Hyperbee(core4, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.dbHOPresults.ready()
    // this.client.replicate(this.dbHOPresults.feed)
    beePubkeys.push({store:'hopresults', privacy: 'private', pubkey: b4a.toString(core4.key, 'hex')})

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
    beePubkeys.push({store:'bentocues', privacy: 'public', pubkey: b4a.toString(core7.key, 'hex')})
    // open the cues library
    const discoveryCues = this.swarm.join(this.dbBentocues.discoveryKey)
    // Only display the key once the Hyperbee has been announced to the DHT
    discoveryCues.flushed().then(() => {
      console.log('cues library open')
    })

    const core13 = this.store.get({ name: 'bentomodels' })
    this.dbBentomodels = new Hyperbee(core13, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.dbBentomodels.ready()
    beePubkeys.push({store:'bentomodels', privacy: 'public', pubkey: b4a.toString(core7.key, 'hex')})

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
    beePubkeys.push({store:'bentomarkers', privacy: 'private', pubkey: b4a.toString(core9.key, 'hex')})


    const core10 = this.store.get({ name: 'research' })
    this.dbBentoresearch = new Hyperbee(core10, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.dbBentoresearch.ready()
    beePubkeys.push({store:'research', privacy: 'public', pubkey: b4a.toString(core10.key, 'hex')})


    const core11 = this.store.get({ name: 'bentoproducts' })
    this.dbBentoproducts = new Hyperbee(core11, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.dbBentoproducts.ready()
    beePubkeys.push({store:'bentoproducts', privacy: 'private', pubkey: b4a.toString(core11.key, 'hex')})

    const core12 = this.store.get({ name: 'bentomedia' })
    this.dbBentomedia = new Hyperbee(core12, {
      keyEncoding: 'utf-8', // can be set to undefined (binary), utf-8, ascii or and abstract-encoding
      valueEncoding: 'json' // same options as above
    })
    await this.dbBentomedia.ready()
    beePubkeys.push({store:'bentomedia', privacy: 'private', pubkey: b4a.toString(core12.key, 'hex')})
    
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

  /** CHAT */

  /**
   * save chat history
   * @method saveBentochat
   *
  */
  saveBentochat = async function (chatHistory) {
    await this.dbBentochat.put(chatHistory.chat.chatid, chatHistory)
    let checkSave = await this.getBentochat(chatHistory.chat.chatid)
    return checkSave
  }

  /**
   * delete chat item
   * @method deleteBentochat
   *
  */
  deleteBentochat = async function (chat) {
    await this.dbBentochat.del(chat.chatid)
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
    const nodeData = await this.dbBentochat.get(key)
    return nodeData
  }

  /**
   * lookup range save chat history
   * @method getBentochatHistory
   *
  */
  getBentochatHistory = async function (range) {
    const chathistoryData = this.dbBentochat.createReadStream() // { gt: 'a', lt: 'z' }) // anything >a and <z
    let chatData = []
    for await (const { key, value } of chathistoryData) {
      chatData.push({ key, value })
    }
    return chatData
  }

  /** SPACE */

  /**
   * save space menu
   * @method saveSpaceHistory
   *
  */
  saveSpaceHistory = async function (spaceContract) {
    await this.dbBentospaces.put(spaceContract.space.cueid, spaceContract)
    let checkSave = await this.getBentospace(spaceContract.space.cueid)
    return checkSave
  }

  /**
   * save space layout of bentobox
   * @method saveBentospace
   *
  */
  saveBentospace = async function (spaceContract) {
    await this.dbBentospaces.put(spaceContract.cueid, spaceContract)
    let checkSave = await this.getBentospace(spaceContract.cueid)
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
   * lookup bentospaces all
   * @method getAllBentospaces
   *
  */
  getAllBentospaces = async function () {
    const spacesHistory = await this.dbBentospaces.createReadStream()
    let spacesData = []
    for await (const { key, value } of spacesHistory) {
      spacesData.push({ key, value })
    }    
    return spacesData
  }


  /**
   * delete nxp ref contract from peer library
   * @method deleteBentospace
   *
  */
  deleteBentospace = async function (space) {
    const deleteStatus = await this.dbBentospaces.del(space.cueid)
    let deleteInfo = {}
    deleteInfo.spaceid = space.cueid
    return deleteInfo
  }

  /** CUES */
  /**
   * save cues
   * @method saveCues
   *
  */
  saveCues = async function (cuesInfo) {
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

  /** MODELS */
  /**
   * save model
   * @method saveModel
  */
  saveModel = async function (modelInfo) {
    await this.dbBentomodels.put(modelInfo.id, modelInfo.data)
    let checkSave = await this.getModel(modelInfo.id)
    return checkSave
  }

  /**
   * get one cue by id
   * @method getModel
   *
  */
  getModel = async function (key) {
    const nodeData = await this.dbBentomodels.get(key)
    return nodeData
  }

  /**
   * get all cuees
   * @method getModelHistory
   *
  */
  getModelHistory = async function (key) {
    const modelHistory = await this.dbBentomodels.createReadStream()
    let modelData = []
    for await (const { key, value } of modelHistory) {
      modelData.push({ key, value })
    }
    return modelData
  }

  /**
   * delete nxp ref contract from peer library
   * @method deleteBentomodel
  */
  deleteBentoModel = async function (model) {
    const deleteStatus = await this.dbBentomodels.del(model.id)
    let deleteInfo = {}
    deleteInfo.id = model.id
    return deleteInfo
  }

 /** MEDIA */
  /**
   * save media
   * @method saveMedia
   *
  */
  saveMedia = async function (mediaInfo) {
    await this.dbBentomedia.put(mediaInfo.cueid, mediaInfo.data)
    let checkSave = await this.getMedia(mediaInfo.cueid)
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
   * get all media
   * @method getMediaHistory
   *
  */
  getMediaHistory = async function (key) {
    const cuesHistory = await this.dbBentomedia.createReadStream()
    let cuesData = []
    for await (const { key, value } of cuesHistory) {
      cuesData.push({ key, value })
    }    
    return cuesData
  }


  /**
   * delete nxp ref contract from peer library
   * @method deleteBentomedia
  */
  deleteBentomedia = async function (media) {
    const deleteStatus = await this.dbBentomedia.del(media.id)
    let deleteInfo = {}
    deleteInfo.spaceid = media.id
    return deleteInfo
  }

  /** PEERS */
  /**
   * save research
   * @method savePeer
   *
  */
  savePeer = async function (peerInfo) {
    await this.dbPeers.put(peerInfo.publickey, peerInfo)
    let checkSave = await this.getPeer(peerInfo.publickey)
    return checkSave
  }

  /**
   * get one peer by publickey
   * @method getPeer
   *
  */
  getPeer = async function (key) {
    const nodeData = await this.dbPeers.get(key)
    return nodeData
  }

  /**
   * get all peers
   * @method getPeersHistory
   *
  */
  getPeersHistory = async function (key) {
    const peerHistory = await this.dbPeers.createReadStream()
    let peerData = []
    for await (const { key, value } of peerHistory) {
      peerData.push({ key, value })
    }    
    return peerData
  }

  /**
   * delete contract
   * @method deletePeer
  */
  deletePeer = async function (pubkey) {
    const deleteStatus = await this.dbPeers.del(pubkey)
    let deleteInfo = {}
    deleteInfo.publickey = pubkey
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
    const deleteStatus = await this.dbBentoresearch.del(cue.id)
    let deleteInfo = {}
    deleteInfo.spaceid = cue.id
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
    const deleteStatus = await this.dbBentomarkers.del(cue.id)
    let deleteInfo = {}
    deleteInfo.spaceid = cue.id
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
  deleteBentoProduct = async function (cue) {
    const deleteStatus = await this.dbBentoproducts.del(cue.id)
    let deleteInfo = {}
    deleteInfo.spaceid = cue.id
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

 //** */ public library **//

  /**
   * save pair in keystore public network library
   * @method savePubliclibrary
   *
  */
  savePubliclibrary = async function (refContract) {
    await this.dbPublicLibrary.put(refContract.data.hash, refContract.data.contract)
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
    const coreRep = this.store.get({ key: b4a.from(dataIn.discoverykey, 'hex') })

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

    const nodeData = beePlib.createReadStream()
    let resData = []
    for await (const { key, value } of nodeData) {
      resData.push({ key, value })
    }
    // data received?
    if (resData.length > 0) {
      this.repPublicHolder[dataIn.discoverykey] = resData
      // notify peer repliate complete, ask if want save
      this.emit('publib-replicate-notification', { data: { text: 'public library replication complete', publib: dataIn.discoverykey }})
    } else {
      this.emit('publib-replicate-notification', { data: { text: 'no data received', publib: dataIn.discoverykey }})
    }
  }

  /**
   * repicate the publiclibrary peer to peer
   * @method replicateQueryPubliclibrary
   *
  */
  replicateQueryPubliclibrary = async function (dataIn) {
    // create or get the hypercore using the public key supplied as command-line argument
    const coreRep = this.store.get({ key: b4a.from(dataIn.data.data.datastores, 'hex') })

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
    const boardNXPcontract = await beePlib.get(dataIn.data.data.boardID)
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
      this.confirmPubLibList[dataIn.data.data.datastores] = holderConfirm
      this.emit('publibbeebee-notification', dataIn)
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
   * look up holder and save data to public library datastore
   * @method saveRepliatePubLibary
   *
  */
  saveRepliatePubLibary = async function (data) {
    // add board nxp
    let updatePubLib = this.repPublicHolder[data.discoverykey]
    if (data.library === 'public') {
      await this.updatePublicLibrary(updatePubLib)
    } else if (data.library === 'cues') {
      await this.updateCuesLibrary(updatePubLib)
    }
    this.repPublicHolder[data.discoverykey] = []
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
   * update cues library from replication
   * @method updateCuesLibrary
   *
  */
  updateCuesLibrary = async function (libContracts) {
    // save entries required
    const batch = this.dbBentocues.batch()
    for (const { key, value } of libContracts) {
      await batch.put(key, JSON.parse(value))
    }
    await batch.flush()

    // check
    const libUpdatecheck = this.dbBentocues.createReadStream()
    let libConracts = []
    for await (const { key, value } of libUpdatecheck) {
      libConracts.push({ key, value })
    }
    return true
  }

  /**
   * repicate the publiclibrary peer to peer
   * @method ryOLD
   *
  */
  ryOLD = async function (key) {
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