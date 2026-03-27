'use strict'
import b4a from 'b4a'
import { HOPKey } from '../../hop-key-util.js'

class MarkersModule {
  constructor(db) {
    this.db = db
  }

  /**
   * save marker
   * @method saveMarker
   */
  saveMarker = async function (cuesInfo) {
    await this.db.put(cuesInfo.cueid, cuesInfo.data)
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
   * delete marker
   * @method deleteBentoMarker
   */
  deleteBentoMarker = async function (cue) {
    await this.db.del(cue.id)
    let deleteInfo = {}
    deleteInfo.spaceid = cue.id
    return deleteInfo
  }
}

export default MarkersModule
