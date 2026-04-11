'use strict'
import b4a from 'b4a'

class LearnModule {
  constructor(db, crypto) {
    this.db = db
    this.crypto = crypto
  }

  /**
   * save learn session
   * @method saveBeeBeeLearn
   */
  saveBeeBeeLearn = async function (teachSession) {
    await this.db.put(teachSession.key, teachSession.session)
    return teachSession.session
  }

  /**
   * delete learn item
   * @method deleteBeeBeeLearn
   */
  deleteBeeBeeLearn = async function (key) {
    await this.db.del(key)
    let deleteInfo = {}
    deleteInfo.id = key
    return deleteInfo
  }

  /**
   * lookup peer teach session layout default
   * @method getBeeBeeLearn
   */
  getBeeBeeLearn = async function (key) {
    const nodeData = await this.db.get(key)
    return nodeData
  }

  /**
   * lookup range save learn @teach history
   * @method getBeeBeeLearnHistory
   */
  getBeeBeeLearnHistory = async function (lsID, category, range) {
    const { gt, lt } = this.crypto.getRange(lsID, category)

    const teachHistoryData = this.db.createReadStream({
      gt,
      lt,
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    let teachData = []
    for await (const { key, value } of teachHistoryData) {
      teachData.push({ key, value })
    }
    return teachData
  }
}

export default LearnModule
