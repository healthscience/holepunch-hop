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

import PublicLibraryModule from './modules/publicLibrary.js'
import PeerLibraryModule from './modules/peerLibrary.js'
import PeersModule from './modules/peers.js'
import ResultsModule from './modules/results.js'
import LedgerModule from './modules/ledger.js'
import ChatModule from './modules/chat.js'
import ClockModule from './modules/clock.js'
import SpacesModule from './modules/spaces.js'
import CuesModule from './modules/cues/cues.js'
import BoxesModule from './modules/cues/boxes.js'
import ModelsModule from './modules/cues/models.js'
import ResearchModule from './modules/cues/research.js'
import MarkersModule from './modules/cues/markers.js'
import ProductsModule from './modules/cues/products.js'
import MediaModule from './modules/cues/media.js'
import LearnModule from './modules/cues/learn.js'
import LifestrapModule from './modules/lifestrap/lifestrap.js'

class HyperBee extends EventEmitter {

  constructor(store, swarm) {
    super()
    this.hello = 'hyperbee'
    this.store = store
    this.swarm = swarm
    this.liveBees = {}
    this.activeBees = []
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

    const coreRef = this.store.get({ name: 'publiclibrary-ref' })
    this.dbPublicLibraryRef = new Hyperbee(coreRef, {
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    await this.dbPublicLibraryRef.ready()
    beePubkeys.push({ store: 'publiclibrary-ref', privacy: 'public', pubkey: b4a.toString(this.dbPublicLibraryRef.key, 'hex')})
    const discoveryRef = this.swarm.join(this.dbPublicLibraryRef.discoveryKey)
    discoveryRef.flushed().then(() => {
      console.log('public library ref open')
    })

    const coreMod = this.store.get({ name: 'publiclibrary-mod' })
    this.dbPublicLibraryMod = new Hyperbee(coreMod, {
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    await this.dbPublicLibraryMod.ready()
    beePubkeys.push({ store: 'publiclibrary-mod', privacy: 'public', pubkey: b4a.toString(this.dbPublicLibraryMod.key, 'hex')})
    const discoveryMod = this.swarm.join(this.dbPublicLibraryMod.discoveryKey)
    discoveryMod.flushed().then(() => {
      console.log('public library mod open')
    })

    const corePeerRef = this.store.get({ name: 'peerlibrary-ref' })
    this.dbPeerLibraryRef = new Hyperbee(corePeerRef, {
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    await this.dbPeerLibraryRef.ready()
    beePubkeys.push({store:'peerlibrary-ref', privacy: 'private', pubkey: b4a.toString(corePeerRef.key, 'hex')})

    const corePeerMod = this.store.get({ name: 'peerlibrary-mod' })
    this.dbPeerLibraryMod = new Hyperbee(corePeerMod, {
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    await this.dbPeerLibraryMod.ready()
    beePubkeys.push({store:'peerlibrary-mod', privacy: 'private', pubkey: b4a.toString(corePeerMod.key, 'hex')})

    const core6 = this.store.get({ name: 'peers' })
    this.dbPeers = new Hyperbee(core6, {
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    await this.dbPeers.ready()
    beePubkeys.push({store:'peers', privacy: 'private', pubkey: b4a.toString(core6.key, 'hex')})

    const core3 = this.store.get({ name: 'bentospaces' })
    this.dbBentospaces = new Hyperbee(core3, {
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    await this.dbBentospaces.ready()
    beePubkeys.push({store:'bentospaces', pubkey: b4a.toString(core3.key, 'hex')})

    const core14 = this.store.get({ name: 'bentochat' })
    this.dbBentochat = new Hyperbee(core14, {
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    await this.dbBentochat.ready()
    beePubkeys.push({store:'bentochat', privacy: 'private', pubkey: b4a.toString(core14.key, 'hex')})

    const core4 = this.store.get({ name: 'hopresults' })
    this.dbHOPresults = new Hyperbee(core4, {
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    await this.dbHOPresults.ready()
    beePubkeys.push({store:'hopresults', privacy: 'private', pubkey: b4a.toString(core4.key, 'hex')})

    const core5 = this.store.get({ name: 'kbledger' })
    this.dbCohereceLedger = new Hyperbee(core5, {
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    await this.dbCohereceLedger.ready()
    beePubkeys.push({store:'kbledger', pubkey: b4a.toString(core5.key, 'hex')})

    const core7 = this.store.get({ name: 'bentocues' })
    this.dbBentocues = new Hyperbee(core7, {
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    await this.dbBentocues.ready()
    beePubkeys.push({store:'bentocues', privacy: 'public', pubkey: b4a.toString(core7.key, 'hex')})
    const discoveryCues = this.swarm.join(this.dbBentocues.discoveryKey)
    discoveryCues.flushed().then(() => {
      console.log('cues library open')
    })

    const core13 = this.store.get({ name: 'bentomodels' })
    this.dbBentomodels = new Hyperbee(core13, {
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    await this.dbBentomodels.ready()
    beePubkeys.push({store:'bentomodels', privacy: 'public', pubkey: b4a.toString(core13.key, 'hex')})

    const core15 = this.store.get({ name: 'bentoboxes' })
    this.dbBentoBoxes = new Hyperbee(core15, {
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    await this.dbBentoBoxes.ready()
    beePubkeys.push({store:'bentoboxes', privacy: 'private', pubkey: b4a.toString(core15.key, 'hex')})

    const core8 = this.store.get({ name: 'bentodecisions' })
    this.dbBentodecisions = new Hyperbee(core8, {
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    await this.dbBentodecisions.ready()
    beePubkeys.push({store:'bentodecisions', pubkey: b4a.toString(core8.key, 'hex')})

    const core9 = this.store.get({ name: 'bentomarkers' })
    this.dbBentomarkers = new Hyperbee(core9, {
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    await this.dbBentomarkers.ready()
    beePubkeys.push({store:'bentomarkers', privacy: 'private', pubkey: b4a.toString(core9.key, 'hex')})

    const core10 = this.store.get({ name: 'research' })
    this.dbBentoresearch = new Hyperbee(core10, {
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    await this.dbBentoresearch.ready()
    beePubkeys.push({store:'research', privacy: 'public', pubkey: b4a.toString(core10.key, 'hex')})

    const core11 = this.store.get({ name: 'bentoproducts' })
    this.dbBentoproducts = new Hyperbee(core11, {
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    await this.dbBentoproducts.ready()
    beePubkeys.push({store:'bentoproducts', privacy: 'private', pubkey: b4a.toString(core11.key, 'hex')})

    const core12 = this.store.get({ name: 'bentomedia' })
    this.dbBentomedia = new Hyperbee(core12, {
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    await this.dbBentomedia.ready()
    beePubkeys.push({store:'bentomedia', privacy: 'private', pubkey: b4a.toString(core12.key, 'hex')})

    const core16 = this.store.get({ name: 'besearch' })
    this.dbBesearch = new Hyperbee(core16, {
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    await this.dbBesearch.ready()
    beePubkeys.push({store:'besearch', privacy: 'private', pubkey: b4a.toString(core16.key, 'hex')})

    const core17 = this.store.get({ name: 'beebeelearn' })
    this.dbBeeBeeLearn = new Hyperbee(core17, {
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    await this.dbBeeBeeLearn.ready()
    beePubkeys.push({store:'beebeelearn', privacy: 'public', pubkey: b4a.toString(core17.key, 'hex')})

    const core18 = this.store.get({ name: 'heliclock' })
    this.dbHeliClock = new Hyperbee(core18, {
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    await this.dbHeliClock.ready()
    beePubkeys.push({store:'heliclock', privacy: 'private', pubkey: b4a.toString(core18.key, 'hex')})

    const core19 = this.store.get({ name: 'bentolifestrap' })
    this.dbBentolifestrap = new Hyperbee(core19, {
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    await this.dbBentolifestrap.ready()
    beePubkeys.push({store:'bentolifestrap', privacy: 'private', pubkey: b4a.toString(core19.key, 'hex')})

    // Initialize Modules
    this.PublicLibrary = new PublicLibraryModule(this.dbPublicLibraryRef, this.dbPublicLibraryMod, this.store, this.swarm, this.emit.bind(this))
    this.PeerLibrary = new PeerLibraryModule(this.dbPeerLibraryRef, this.dbPeerLibraryMod)
    this.Peers = new PeersModule(this.dbPeers)
    this.Results = new ResultsModule(this.dbHOPresults)
    this.Ledger = new LedgerModule(this.dbCohereceLedger)
    this.Chat = new ChatModule(this.dbBentochat)
    this.Clock = new ClockModule(this.dbHeliClock)
    this.Spaces = new SpacesModule(this.dbBentospaces)
    this.Cues = new CuesModule(this.dbBentocues)
    this.Boxes = new BoxesModule(this.dbBentoBoxes)
    this.Models = new ModelsModule(this.dbBentomodels)
    this.Research = new ResearchModule(this.dbBentoresearch, this.dbBesearch)
    this.Markers = new MarkersModule(this.dbBentomarkers)
    this.Products = new ProductsModule(this.dbBentoproducts)
    this.Media = new MediaModule(this.dbBentomedia)
    this.Learn = new LearnModule(this.dbBeeBeeLearn)
    this.Lifestrap = new LifestrapModule(this.dbBentolifestrap)

    this.emit('hbee-live')
    let startBeePubkey = {
      type: 'account',
      action: 'hyperbee-pubkeys',
      data: beePubkeys
    }
    this.liveBees = startBeePubkey
    this.wsocket.send(JSON.stringify(startBeePubkey))
    this.activeBees = beePubkeys
  }

  // Delegate methods to modules for backward compatibility
  saveHOPresults = (data) => this.Results.saveHOPresults(data)
  peerResults = () => this.Results.peerResults()
  peerResultsItem = (key) => this.Results.peerResultsItem(key)
  deleteResultsItem = (key) => this.Results.deleteResultsItem(key)

  saveBentochat = (data) => this.Chat.saveBentochat(data)
  deleteBentochat = (data) => this.Chat.deleteBentochat(data)
  getBentochat = (key) => this.Chat.getBentochat(key)
  getBentochatHistory = (lsID, category, range) => this.Chat.getBentochatHistory(lsID, category, range)

  saveHeliClock = (data) => this.Clock.saveHeliClock(data)
  deleteHeliClock = (data) => this.Clock.deleteHeliClock(data)
  getHeliClock = (key) => this.Clock.getHeliClock(key)
  getHeliClockHistory = (lsID, category, range) => this.Clock.getHeliClockHistory(lsID, category, range)

  saveSpaceHistory = (data) => this.Spaces.saveSpaceHistory(data)
  saveBentospace = (data) => this.Spaces.saveBentospace(data)
  getBentospace = (key) => this.Spaces.getBentospace(key)
  getAllBentospaces = () => this.Spaces.getAllBentospaces()
  deleteBentospace = (data) => this.Spaces.deleteBentospace(data)
  
  saveSolospace = (data) => this.Spaces.saveSolospace(data)
  getSolospace = () => this.Spaces.getSolospace()

  saveCues = (data) => this.Cues.saveCues(data)
  getCues = (key) => this.Cues.getCues(key)
  getCuesHistory = (lsID, category, key) => this.Cues.getCuesHistory(lsID, category, key)
  deleteBentocue = (data) => this.Cues.deleteBentocue(data)
  updateCuesLibrary = (data) => this.Cues.updateCuesLibrary(data)

  saveLifestrap = (data) => this.Lifestrap.saveLifestrap(data)
  getLifestrap = (key) => this.Lifestrap.getLifestrap(key)
  getLifestrapHistory = (lsID, category, key) => this.Lifestrap.getLifestrapHistory(lsID, category, key)
  deleteLifestrap = (data) => this.Lifestrap.deleteLifestrap(data)
  updateLifestrapLibrary = (data) => this.Lifestrap.updateLifestrapLibrary(data)

  saveBentoBox = (data) => this.Boxes.saveBentoBox(data)
  getBentoBox = (key) => this.Boxes.getBentoBox(key)
  getBentoBoxHistory = (lsID, category, key) => this.Boxes.getBentoBoxHistory(lsID, category, key)
  deleteBentoBox = (data) => this.Boxes.deleteBentoBox(data)

  saveModel = (data) => this.Models.saveModel(data)
  getModel = (key) => this.Models.getModel(key)
  getModelHistory = (lsID, category, key) => this.Models.getModelHistory(lsID, category, key)
  deleteBentoModel = (data) => this.Models.deleteBentoModel(data)

  saveMedia = (data) => this.Media.saveMedia(data)
  getMedia = (key) => this.Media.getMedia(key)
  getMediaHistory = (lsID, category, key) => this.Media.getMediaHistory(lsID, category, key)
  deleteBentomedia = (data) => this.Media.deleteBentomedia(data)

  savePeer = (data) => this.Peers.savePeer(data)
  getPeer = (key) => this.Peers.getPeer(key)
  getPeersHistory = (lsID, category, key) => this.Peers.getPeersHistory(lsID, category, key)
  deletePeer = (pubkey) => this.Peers.deletePeer(pubkey)

  saveResearch = (data) => this.Research.saveResearch(data)
  getResearch = (key) => this.Research.getResearch(key)
  getResearchHistory = (lsID, category, key) => this.Research.getResearchHistory(lsID, category, key)
  deleteBentoResearch = (data) => this.Research.deleteBentoResearch(data)

  saveBesearch = (data) => this.Research.saveBesearch(data)
  getBesearch = (key) => this.Research.getBesearch(key)
  getBesearchHistory = (lsID, category, key) => this.Research.getBesearchHistory(lsID, category, key)
  deleteBentoBesearch = (data) => this.Research.deleteBentoBesearch(data)

  saveMarker = (data) => this.Markers.saveMarker(data)
  getMarker = (key) => this.Markers.getMarker(key)
  getMarkerHistory = (lsID, category, key) => this.Markers.getMarkerHistory(lsID, category, key)
  deleteBentoMarker = (data) => this.Markers.deleteBentoMarker(data)

  saveProduct = (data) => this.Products.saveProduct(data)
  getProduct = (key) => this.Products.getProduct(key)
  getProductHistory = (lsID, category, key) => this.Products.getProductHistory(lsID, category, key)
  deleteBentoProduct = (data) => this.Products.deleteBentoProduct(data)

  saveBeeBeeLearn = (data) => this.Learn.saveBeeBeeLearn(data)
  deleteBeeBeeLearn = (key) => this.Learn.deleteBeeBeeLearn(key)
  getBeeBeeLearn = (key) => this.Learn.getBeeBeeLearn(key)
  getBeeBeeLearnHistory = (lsID, category, range) => this.Learn.getBeeBeeLearnHistory(lsID, category, range)

  savePubliclibraryRef = (data) => this.PublicLibrary.savePubliclibraryRef(data)
  savePubliclibraryMod = (data) => this.PublicLibrary.savePubliclibraryMod(data)
  getPublicLibraryRef = (id) => this.PublicLibrary.getPublicLibraryRef(id)
  getPublicLibraryMod = (id) => this.PublicLibrary.getPublicLibraryMod(id)
  getPublicLibraryRefRange = (lsID, category, range) => this.PublicLibrary.getPublicLibraryRefRange(lsID, category, range)
  getPublicLibraryModRange = (range) => this.PublicLibrary.getPublicLibraryModRange(range)
  getPublicLibraryRefLast = (dp) => this.PublicLibrary.getPublicLibraryRefLast(dp)
  getPublicLibraryModLast = (dp) => this.PublicLibrary.getPublicLibraryModLast(dp)
  deletePublicLibraryRef = (id) => this.PublicLibrary.deletePublicLibraryRef(id)
  deletePublicLibraryMod = (id) => this.PublicLibrary.deletePublicLibraryMod(id)
  replicatePubliclibrary = (data) => this.PublicLibrary.replicatePubliclibrary(data)
  replicateQueryPubliclibrary = (data) => this.PublicLibrary.replicateQueryPubliclibrary(data)
  updatePublicLibrary = (data) => this.PublicLibrary.updatePublicLibrary(data)

  savePeerLibraryRef = (data) => this.PeerLibrary.savePeerLibraryRef(data)
  savePeerLibraryMod = (data) => this.PeerLibrary.savePeerLibraryMod(data)
  getPeerLibraryRef = (id) => this.PeerLibrary.getPeerLibraryRef(id)
  getPeerLibraryMod = (id) => this.PeerLibrary.getPeerLibraryMod(id)
  getPeerLibraryRefRange = () => this.PeerLibrary.getPeerLibraryRefRange()
  getPeerLibraryModRange = () => this.PeerLibrary.getPeerLibraryModRange()
  getPeerLibraryRefLast = () => this.PeerLibrary.getPeerLibraryRefLast()
  getPeerLibraryModLast = () => this.PeerLibrary.getPeerLibraryModLast()
  getPeerLibModComputeModules = () => this.PeerLibrary.getPeerLibModComputeModules()
  deletePeerLibraryRef = (id) => this.PeerLibrary.deletePeerLibraryRef(id)
  deletePeerLibraryMod = (id) => this.PeerLibrary.deletePeerLibraryMod(id)

  saveKBLentry = (data) => this.Ledger.saveKBLentry(data)
  KBLentries = () => this.Ledger.KBLentries()
  peerLedgerProof = (dp) => this.Ledger.peerLedgerProof(dp)

  saveRepliatePubLibary = async function (data) {
    let updatePubLib = this.PublicLibrary.repPublicHolder[data.discoverykey]
    if (data.library === 'public') {
      await this.updatePublicLibrary(updatePubLib)
    } else if (data.library === 'cues') {
      await this.updateCuesLibrary(updatePubLib)
    }
    this.PublicLibrary.repPublicHolder[data.discoverykey] = []
  }

  addConfrimPublicLibrary = async function (data) {
    await this.updatePublicLibrary(this.PublicLibrary.confirmPubLibList[data.datastores].boardNXP)
    await this.updatePublicLibrary(this.PublicLibrary.confirmPubLibList[data.datastores].modules)
    await this.updatePublicLibrary(this.PublicLibrary.confirmPubLibList[data.datastores].refcontracts)
  }
}

export default HyperBee
