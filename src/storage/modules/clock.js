'use strict'
import b4a from 'b4a'
import { HOPKey } from '../hop-key-util.js'

class ClockModule {
  constructor(db) {
    this.db = db
  }

  /**
   * save clock entry
   * @method saveHeliClock
   */
  saveHeliClock = async function (clockEntry) {
    await this.db.put(clockEntry.id, clockEntry)
    return clockEntry
  }

  /**
   * delete clock item
   * @method deleteHeliClock
   */
  deleteHeliClock = async function (entry) {
    await this.db.del(entry.id)
    let deleteInfo = {}
    deleteInfo.id = entry.id
    return deleteInfo
  }

  /**
   * lookup clock entry
   * @method getHeliClock
   */
  getHeliClock = async function (key) {
    const nodeData = await this.db.get(key)
    return nodeData
  }

  /**
   * lookup range of heli clock history
   * @method getHeliClockHistory
   */
  getHeliClockHistory = async function (lsID, category, range) {
    const { gt, lt } = HOPKey.range(lsID, category)

    const clockhistoryData = this.db.createReadStream({
      gt,
      lt,
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    let clockData = []
    for await (const { key, value } of clockhistoryData) {
      let hexKey = key.toString('hex')
      clockData.push({ hexKey, value })
    }
    return clockData
  }
}

export default ClockModule
