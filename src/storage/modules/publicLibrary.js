'use strict'
import Hyperbee from 'hyperbee'
import b4a from 'b4a'

class PublicLibraryModule {
  constructor(dbRef, dbMod, store, swarm, emit) {
    this.dbRef = dbRef
    this.dbMod = dbMod
    this.store = store
    this.swarm = swarm
    this.emit = emit
    this.repPublicHolder = {}
    this.confirmPubLibList = {}
  }

  /**
   * save pair in keystore public network library ref
   * @method savePubliclibraryRef
   */
  savePubliclibraryRef = async function (refContract) {
    await this.dbRef.put(refContract.data.hash, refContract.data.contract)
    return refContract.data.contract
  }

  /**
   * save pair in keystore public network library mod
   * @method savePubliclibraryMod
   */
  savePubliclibraryMod = async function (refContract) {
    await this.dbMod.put(refContract.data.hash, refContract.data.contract)
    return refContract.data.contract
  }

  /**
   * lookup specific result UUID from public library ref
   * @method getPublicLibraryRef
   */
  getPublicLibraryRef = async function (contractID) {
    const nodeData = await this.dbRef.get(contractID)
    return nodeData
  }

  /**
   * lookup specific result UUID from public library mod
   * @method getPublicLibraryMod
   */
  getPublicLibraryMod = async function (contractID) {
    const nodeData = await this.dbMod.get(contractID)
    return nodeData
  }

  /**
   * lookup range query of db public library ref
   * @method getPublicLibraryRefRange
   */
  getPublicLibraryRefRange = async function (typeKey, range) {
    const prefix = typeKey;
    const gt = b4a.from(prefix);
    const lt = b4a.concat([b4a.from(prefix), b4a.from([0xff])]);

    const streamData = this.dbRef.createReadStream({
      gt,
      lt,
      keyEncoding: 'binary',
      valueEncoding: 'json'
    });

    let contractData = []
    for await (const { key, value } of streamData) {
      let hexKey = key.toString('hex')
      contractData.push({ hexKey, value })
    }
    return contractData
  }

  /**
   * lookup range query of db public library mod
   * @method getPublicLibraryModRange
   */
  getPublicLibraryModRange = async function (range) {
    const nodeData = this.dbMod.createReadStream()
    let contractData = []
    for await (const { key, value } of nodeData) {
      let hexKey = key.toString('hex')
      contractData.push({ hexKey, value })
    }
    return contractData
  }

  /**
   * return the last entry into db public library ref
   * @method getPublicLibraryRefLast
   */
  getPublicLibraryRefLast = async function (dataPrint) {
    const nodeData = this.dbRef.createHistoryStream({ reverse: true, limit: 1 })
    return nodeData
  }

  /**
   * return the last entry into db public library mod
   * @method getPublicLibraryModLast
   */
  getPublicLibraryModLast = async function (dataPrint) {
    const nodeData = this.dbMod.createHistoryStream({ reverse: true, limit: 1 })
    return nodeData
  }

  /**
   * delete nxp ref contract public library ref
   * @method deletePublicLibraryRef
   */
  deletePublicLibraryRef = async function (nxpID) {
    let deleteInfo = {}
    let deleteStatus = await this.dbRef.del(nxpID)
    deleteInfo.success = deleteStatus
    deleteInfo.nxp = nxpID
    return deleteInfo
  }

  /**
   * delete nxp ref contract public library mod
   * @method deletePublicLibraryMod
   */
  deletePublicLibraryMod = async function (nxpID) {
    let deleteInfo = {}
    let deleteStatus = await this.dbMod.del(nxpID)
    deleteInfo.success = deleteStatus
    deleteInfo.nxp = nxpID
    return deleteInfo
  }

  /**
   * repicate the publiclibrary peer to peer
   * @method replicatePubliclibrary
   */
  replicatePubliclibrary = async function (dataIn) {
    const coreRep = this.store.get({ key: b4a.from(dataIn.discoverykey, 'hex') })
    const beePlib = new Hyperbee(coreRep, {
      keyEncoding: 'utf-8',
      valueEncoding: 'utf-8'
    })
    await coreRep.ready()
    this.swarm.join(coreRep.discoveryKey, { server: false, client: true })
    await coreRep.update()

    const nodeData = beePlib.createReadStream()
    let resData = []
    for await (const { key, value } of nodeData) {
      resData.push({ key, value })
    }
    if (resData.length > 0) {
      this.repPublicHolder[dataIn.discoverykey] = resData
      this.emit('publib-replicate-notification', { data: { text: 'public library replication complete', publib: dataIn.discoverykey }})
    } else {
      this.emit('publib-replicate-notification', { data: { text: 'no data received', publib: dataIn.discoverykey }})
    }
  }

  /**
   * repicate the publiclibrary peer to peer (query)
   * @method replicateQueryPubliclibrary
   */
  replicateQueryPubliclibrary = async function (dataIn) {
    const coreRep = this.store.get({ key: b4a.from(dataIn.data.data.datastores, 'hex') })
    const beePlib = new Hyperbee(coreRep, {
      keyEncoding: 'utf-8',
      valueEncoding: 'utf-8'
    })
    await coreRep.ready()
    this.swarm.join(coreRep.discoveryKey, { server: false, client: true })
    await coreRep.update()

    const boardNXPcontract = await beePlib.get(dataIn.data.data.boardID)
    let unString = JSON.parse(boardNXPcontract.value)
    let moduleContracts = []
    for (let mod of unString.modules) {
      let modC = await beePlib.get(mod)
      moduleContracts.push(modC)
    }
    let referenceContracts = []
    for (let modRef of moduleContracts) {
      let unString = JSON.parse(modRef.value)
      if (unString.style === 'packaging') {
        for (let ref of unString.info.value.concept.tablestructure) {
          if (ref?.refcontract) {
            let refC = await beePlib.get(ref.refcontract)
            referenceContracts.push(refC)
          }
        }
      } else if (unString.style === 'question') {
        let questRef = {}
        questRef.key = unString.info.key
        questRef.value = JSON.stringify(unString.info.value)
        referenceContracts.push(questRef)
      }
    }
    if (moduleContracts.length > 0) {
      let holderConfirm = {}
      holderConfirm.boardNXP = [boardNXPcontract]
      holderConfirm.modules = moduleContracts
      holderConfirm.refcontracts = referenceContracts
      this.confirmPubLibList[dataIn.data.data.datastores] = holderConfirm
      this.emit('publibbeebee-notification', dataIn)
    }
  }

  /**
   * update public library from peers public library
   * @method updatePublicLibrary
   */
  updatePublicLibrary = async function (libContracts) {
    const batch = this.dbMod.batch() // Note: original code used this.dbPublicLibrary which seemed to map to Mod in some contexts but was ambiguous. Based on savePubliclibraryMod, I'll use dbMod.
    for (const { key, value } of libContracts) {
      await batch.put(key, JSON.parse(value))
    }
    await batch.flush()
    return true
  }
}

export default PublicLibraryModule
