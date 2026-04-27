'use strict'
import b4a from 'b4a'

class OrgoModule {
  constructor(db, crypto) {
    this.db = db
    this.crypto = crypto
  }

  /**
   * save orgo
   * @method saveOrgo
   */
  saveOrgo = async function (orgoInfo) {
    await this.db.put(orgoInfo.key, orgoInfo.contract)
    return orgoInfo
  }

  /**
   * get one orgo by id
   * @method getOrgo
   */
  getOrgo = async function (key) {
    const nodeData = await this.db.get(key)
    return nodeData
  }

  /**
   * get all orgos
   * @method getOrgoHistory
   */
  getOrgoHistory = async function (lsID, category, key) {
    const { gt, lt } = this.crypto.getRange(lsID, category)

    const orgoHistory = await this.db.createReadStream({
      gt,
      lt,
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    let orgoData = []
    for await (const { key, value } of orgoHistory) {
      orgoData.push({ key, value })
    }
    return orgoData
  }

  /**
   * delete orgo
   * @method deleteOrgo
   */
  deleteOrgo = async function (orgo) {
    await this.db.del(orgo)
    let deleteInfo = {}
    deleteInfo.key = orgo
    return deleteInfo
  }

  /**
   * update orgo library from replication
   * @method updateOrgoModule
   */
  updateOrgoModule = async function (libContracts) {
    const { gt, lt } = this.crypto.getRange('ORGO')
    const batch = this.db.batch()
    for (const { key, value } of libContracts) {
      await batch.put(key, JSON.parse(value))
    }
    await batch.flush()
    return true
  }
}

export default OrgoModule
