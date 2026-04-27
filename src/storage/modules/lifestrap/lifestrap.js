'use strict'
import b4a from 'b4a'

class LifestrapModule {
  constructor(db, crypto) {
    this.db = db
    this.crypto = crypto
  }

  /**
   * save lifestrap
   * @method saveLifestrap
   */
  saveLifestrap = async function (lifestrapInfo) {
    await this.db.put(lifestrapInfo.key, lifestrapInfo.contract)
    return lifestrapInfo
  }

  /**
   * get one lifestrap by id
   * @method getLifestrap
   */
  getLifestrap = async function (key) {
    const nodeData = await this.db.get(key)
    return nodeData
  }

  /**
   * get all lifestraps
   * @method getLifestrapHistory
   */
  getLifestrapHistory = async function (lsID, category, key) {
    const { gt, lt } = this.crypto.getRange(lsID, category)

    const lifestrapHistory = await this.db.createReadStream({
      // gt,
      // lt,
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    let lifestrapData = []
    for await (const { key, value } of lifestrapHistory) {
      lifestrapData.push({ key, value })
    }
    return lifestrapData
  }

  /**
   * delete lifestrap
   * @method deleteLifestrap
   */
  deleteLifestrap = async function (lifestrap) {
    await this.db.del(lifestrap)
    let deleteInfo = {}
    deleteInfo.key = lifestrap
    return deleteInfo
  }

  /**
   * update lifestrap library from replication
   * @method updateLifestrapLibrary
   */
  updateLifestrapModule = async function (libContracts) {
    const { gt, lt } = this.crypto.getRange('LS')
    const batch = this.db.batch()
    for (const { key, value } of libContracts) {
      await batch.put(key, JSON.parse(value))
    }
    await batch.flush()
    return true
  }
}

export default LifestrapModule
