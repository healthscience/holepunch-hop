'use strict'
import b4a from 'b4a'

class LensglueModule {
  constructor(db, crypto) {
    this.db = db
    this.crypto = crypto
  }

  /**
   * save lensglue
   * @method saveLensglue
   */
  saveLensglue = async function (lensglueInfo) {
    await this.db.put(lensglueInfo.key, lensglueInfo.contract)
    return lensglueInfo
  }

  /**
   * get one lensglue by id
   * @method getLensglue
   */
  getLensglue = async function (key) {
    const nodeData = await this.db.get(key)
    return nodeData
  }

  /**
   * get all lensglues
   * @method getLensglueHistory
   */
  getLensglueHistory = async function (lsID, category, key) {
    const { gt, lt } = this.crypto.getRange(lsID, category)

    const lensglueHistory = await this.db.createReadStream({
      gt,
      lt,
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    let lensglueData = []
    for await (const { key, value } of lensglueHistory) {
      lensglueData.push({ key, value })
    }

    return lensglueData
  }

  /**
   * delete lensglue
   * @method deleteLensglue
   */
  deleteLensglue = async function (lensglue) {
    await this.db.del(lensglue)
    let deleteInfo = {}
    deleteInfo.key = lensglue
    return deleteInfo
  }

  /**
   * update lensglue library from replication
   * @method updateLensglueModule
  */
  updateLensglueModule = async function (libContracts) {
    const { gt, lt } = this.crypto.getRange('LENSGLUE')
    const batch = this.db.batch()
    for (const { key, value } of libContracts) {
      await batch.put(key, JSON.parse(value))
    }
    await batch.flush()
    return true
  }
}

export default LensglueModule
