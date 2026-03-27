'use strict'
import b4a from 'b4a'
import { HOPKey } from '../../hop-key-util.js'

class BoxesModule {
  constructor(db) {
    this.db = db
  }

  /**
   * save box
   * @method saveBentoBox
   */
  saveBentoBox = async function (boxInfo) {
    await this.db.put(boxInfo.id, boxInfo.data)
    return boxInfo.data
  }

  /**
   * get one box by id
   * @method getBentoBox
   */
  getBentoBox = async function (key) {
    const nodeData = await this.db.get(key)
    return nodeData
  }

  /**
   * get all boxes
   * @method getBentoBoxHistory
   */
  getBentoBoxHistory = async function (lsID, category, key) {
    const { gt, lt } = HOPKey.range(lsID, category)

    const boxHistory = await this.db.createReadStream({
      gt,
      lt,
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    let boxData = []
    for await (const { key, value } of boxHistory) {
      let hexKey = key.toString('hex')
      boxData.push({ hexKey, value })
    }
    return boxData
  }

  /**
   * delete box
   * @method deleteBentoBox
   */
  deleteBentoBox = async function (box) {
    await this.db.del(box.id)
    let deleteInfo = {}
    deleteInfo.id = box.id
    return deleteInfo
  }
}

export default BoxesModule
