'use strict'
import b4a from 'b4a'

class MarkersModule {
  constructor(db, crypto) {
    this.db = db
    this.crypto = crypto
  }

  /**
   * save marker
   * @method saveMarker
   */
  saveMarker = async function (cuesInfo) {
    await this.db.put(cuesInfo.key, cuesInfo.data)
    return cuesInfo.data
  }

  /**
   * get one marker by id
   * @method getMarker
   */
  getMarker = async function (key) {
    const nodeData = await this.db.get(key)
    return nodeData
  }

  /**
   * get all markers
   * @method getMarkerHistory
   */
  getMarkerHistory = async function (lsID, category, key) {
    const { gt, lt } = this.crypto.getRange(lsID, category)

    const cuesHistory = await this.db.createReadStream({
      gt,
      lt,
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    let cuesData = []
    for await (const { key, value } of cuesHistory) {
      cuesData.push({ key, value })
    }
    return cuesData
  }

  /**
   * delete marker
   * @method deleteBentoMarker
   */
  deleteBentoMarker = async function (cue) {
    await this.db.del(cue.key)
    let deleteInfo = {}
    deleteInfo.spaceid = cue.key
    return deleteInfo
  }
}

export default MarkersModule
