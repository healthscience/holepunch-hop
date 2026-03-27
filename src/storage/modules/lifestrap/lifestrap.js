'use strict'
import b4a from 'b4a'
import { HOPKey } from '../../hop-key-util.js'

class LifestrapModule {
  constructor(db) {
    this.db = db
  }

  /**
   * save lifestrap
   * @method saveLifestrap
   */
  saveLifestrap = async function (lifestrapInfo) {
    await this.db.put(lifestrapInfo.hash, lifestrapInfo.contract)
    return lifestrapInfo.data
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
    const { gt, lt } = HOPKey.range(lsID, category)

    const lifestrapHistory = await this.db.createReadStream({
      gt,
      lt,
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    let lifestrapData = []
    for await (const { key, value } of lifestrapHistory) {
      let hexKey = key.toString('hex')
      lifestrapData.push({ hexKey, value })
    }
    return lifestrapData
  }

  /**
   * delete lifestrap
   * @method deleteLifestrap
   */
  deleteLifestrap = async function (lifestrap) {
    await this.db.del(lifestrap.lifestrapid)
    let deleteInfo = {}
    deleteInfo.spaceid = lifestrap.lifestrapid
    return deleteInfo
  }

  /**
   * update lifestrap library from replication
   * @method updateLifestrapLibrary
   */
  updateLifestrapModule = async function (libContracts) {
    const { gt, lt } = HOPKey.range('LS')
    const batch = this.db.batch()
    for (const { key, value } of libContracts) {
      await batch.put(key, JSON.parse(value))
    }
    await batch.flush()
    return true
  }
}

export default LifestrapModule
