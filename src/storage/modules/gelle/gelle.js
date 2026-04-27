'use strict'
import b4a from 'b4a'

class GelleModule {
  constructor(db, crypto) {
    this.db = db
    this.crypto = crypto
  }

  /**
   * save gelle
   * @method saveGelle
   */
  saveGelle = async function (gelleInfo) {
    await this.db.put(gelleInfo.key, gelleInfo.contract)
    return gelleInfo
  }

  /**
   * get one gelle by id
   * @method getGelle
   */
  getGelle = async function (key) {
    const nodeData = await this.db.get(key)
    return nodeData
  }

  /**
   * get all gelles
   * @method getGelleHistory
   */
  getGelleHistory = async function (lsID, category, key) {
    const { gt, lt } = this.crypto.getRange(lsID, category)

    const gelleHistory = await this.db.createReadStream({
      gt,
      lt,
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    let gelleData = []
    for await (const { key, value } of gelleHistory) {
      gelleData.push({ key, value })
    }
    return gelleData
  }

  /**
   * delete gelle
   * @method deleteGelle
   */
  deleteGelle = async function (gelle) {
    await this.db.del(gelle)
    let deleteInfo = {}
    deleteInfo.key = gelle
    return deleteInfo
  }

  /**
   * update gelle library from replication
   * @method updateGelleModule
   */
  updateGelleModule = async function (libContracts) {
    const { gt, lt } = this.crypto.getRange('GELLE')
    const batch = this.db.batch()
    for (const { key, value } of libContracts) {
      await batch.put(key, JSON.parse(value))
    }
    await batch.flush()
    return true
  }
}

export default GelleModule
