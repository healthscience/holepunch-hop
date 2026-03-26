'use strict'
import b4a from 'b4a'

class PeerLibraryModule {
  constructor(dbRef, dbMod) {
    this.dbRef = dbRef
    this.dbMod = dbMod
  }

  /**
   * save pair in keystore db peer library ref
   * @method savePeerLibraryRef
   */
  savePeerLibraryRef = async function (refContract) {
    await this.dbRef.put(refContract.data.hash, refContract.data.contract)
    return refContract.data.contract
  }

  /**
   * save pair in keystore db peer library mod
   * @method savePeerLibraryMod
   */
  savePeerLibraryMod = async function (refContract) {
    await this.dbMod.put(refContract.data.hash, refContract.data.contract)
    return refContract.data.contract
  }

  /**
   * lookup al peer library ref entries
   * @method getPeerLibraryRef
   */
  getPeerLibraryRef = async function (contractID) {
    const nodeData = await this.dbRef.get(contractID)
    return nodeData
  }

  /**
   * lookup al peer library mod entries
   * @method getPeerLibraryMod
   */
  getPeerLibraryMod = async function (contractID) {
    const nodeData = await this.dbMod.get(contractID)
    return nodeData
  }

  /**
   * lookup al peer library ref range
   * @method getPeerLibraryRefRange
   */
  getPeerLibraryRefRange = async function () {
    const nodeData = await this.dbRef.createReadStream()
    let contractData = []
    for await (const { key, value } of nodeData) {
      let hexKey = key.toString('hex')
      contractData.push({ hexKey, value })
    }
    return contractData
  }

  /**
   * lookup al peer library mod range
   * @method getPeerLibraryModRange
   */
  getPeerLibraryModRange = async function () {
    const nodeData = await this.dbMod.createReadStream()
    let contractData = []
    for await (const { key, value } of nodeData) {
      let hexKey = key.toString('hex')
      contractData.push({ hexKey, value })
    }
    return contractData
  }

  /**
   * lookup al peer library ref Last entry
   * @method getPeerLibraryRefLast
   */
  getPeerLibraryRefLast = async function () {
    const nodeData = await this.dbRef.createHistoryStream({ reverse: true, limit: 1 })
    return nodeData
  }

  /**
   * lookup al peer library mod Last entry
   * @method getPeerLibraryModLast
   */
  getPeerLibraryModLast = async function () {
    const nodeData = await this.dbMod.createHistoryStream({ reverse: true, limit: 1 })
    return nodeData
  }

  /**
   * filter peer library mod to get compute modules with a key
   * @method getPeerLibModComputeModules
   */
  getPeerLibModComputeModules = async function () {
    const moduleData = await this.dbMod.createHistoryStream({ reverse: true, limit: 10 })
    return moduleData
  }

  /**
   * delete nxp ref contract from peer library ref
   * @method deletePeerLibraryRef
   */
  deletePeerLibraryRef = async function (nxpID) {
    let deleteInfo = {}
    let deleteStatus = await this.dbRef.del(nxpID)
    deleteInfo.success = deleteStatus
    deleteInfo.nxp = nxpID
    return deleteInfo
  }

  /**
   * delete nxp ref contract from peer library mod
   * @method deletePeerLibraryMod
   */
  deletePeerLibraryMod = async function (nxpID) {
    let deleteInfo = {}
    let deleteStatus = await this.dbMod.del(nxpID)
    deleteInfo.success = deleteStatus
    deleteInfo.nxp = nxpID
    return deleteInfo
  }
}

export default PeerLibraryModule
