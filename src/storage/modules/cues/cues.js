'use strict'
import b4a from 'b4a'
import { HOPKey } from '../../hop-key-util.js'

class CuesModule {
  constructor(db) {
    this.db = db
  }

  /**
   * save cues
   * @method saveCues
   */
  saveCues = async function (cuesInfo) {
    await this.db.put(cuesInfo.hash, cuesInfo.contract)
    return cuesInfo.data
  }

  /**
   * get one cue by id
   * @method getCues
   */
  getCues = async function (key) {
    const nodeData = await this.db.get(key)
    return nodeData
  }

  /**
   * get all cuees
   * @method getCuesHistory
   */
  getCuesHistory = async function (lsID, category, key) {
    const { gt, lt } = HOPKey.range(lsID, category)

    const cuesHistory = await this.db.createReadStream({
      gt,
      lt,
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    let cuesData = []
    for await (const { key, value } of cuesHistory) {
      let hexKey = key.toString('hex')
      cuesData.push({ hexKey, value })
    }
    return cuesData
  }

  /**
   * delete cue
   * @method deleteBentocue
   */
  deleteBentocue = async function (cue) {
    await this.db.del(cue.cueid)
    let deleteInfo = {}
    deleteInfo.spaceid = cue.cueid
    return deleteInfo
  }

  /**
   * update cues library from replication
   * @method updateCuesLibrary
   */
  updateCuesModule = async function (libContracts) {
    const { gt, lt } = HOPKey.range('CUE')
    const batch = this.db.batch()
    for (const { key, value } of libContracts) {
      await batch.put(key, JSON.parse(value))
    }
    await batch.flush()
    return true
  }
}

export default CuesModule
