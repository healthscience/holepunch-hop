'use strict'

class ExoCueModule {
  constructor(db, crypto) {
    this.db = db
    this.crypto = crypto
  }

  /**
   * save ExoCue
   * @method saveExoCue
   */
  saveExoCue = async function (ExoCueInfo) {
    await this.db.put(ExoCueInfo.hash, ExoCueInfo.contract)
    return ExoCueInfo
  }

  /**
   * get one ExoCue by id
   * @method getExoCue
   */
  getExoCue = async function (key) {
    const nodeData = await this.db.get(key)
    return nodeData
  }

  /**
   * get all ExoCues
   * @method getExoCueHistory
   */
  getExoCueHistory = async function (lsID, category, key) {
    const { gt, lt } = this.crypto.getRange(lsID, category)

    const ExoCueHistory = await this.db.createReadStream({
      gt,
      lt,
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    let ExoCueData = []
    for await (const { key, value } of ExoCueHistory) {
      ExoCueData.push({ key, value })
    }
    return ExoCueData
  }

  /**
   * delete ExoCue
   * @method deleteExoCue
   */
  deleteExoCue = async function (ExoCue) {
    await this.db.del(ExoCue)
    let deleteInfo = {}
    deleteInfo.key = ExoCue
    return deleteInfo
  }

  /**
   * update ExoCue library from replication
   * @method updateExoCueModule
   */
  updateExoCueModule = async function (libContracts) {
    const { gt, lt } = this.crypto.getRange('ExoCue')
    const batch = this.db.batch()
    for (const { key, value } of libContracts) {
      await batch.put(key, JSON.parse(value))
    }
    await batch.flush()
    return true
  }
}

export default ExoCueModule
