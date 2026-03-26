'use strict'
import b4a from 'b4a'

class CuesModule {
  constructor(db) {
    this.db = db
  }

  /**
   * save cues
   * @method saveCues
   */
  saveCues = async function (cuesInfo) {
    await this.db.put(cuesInfo.cueid, cuesInfo.data)
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
  getCuesHistory = async function (typeKey, key) {
    const prefix = typeKey;
    const gt = b4a.from(prefix);
    const lt = b4a.concat([b4a.from(prefix), b4a.from([0xff])]);

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
  updateCuesLibrary = async function (libContracts) {
    const batch = this.db.batch()
    for (const { key, value } of libContracts) {
      await batch.put(key, JSON.parse(value))
    }
    await batch.flush()
    return true
  }
}

export default CuesModule
