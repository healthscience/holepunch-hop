'use strict'
import b4a from 'b4a'

class ModelsModule {
  constructor(db, crypto) {
    this.db = db
    this.crypto = crypto
  }

  /**
   * save model
   * @method saveModel
   */
  saveModel = async function (modelInfo) {
    await this.db.put(modelInfo.key, modelInfo.data)
    return modelInfo.data
  }

  /**
   * get one model by id
   * @method getModel
   */
  getModel = async function (key) {
    const nodeData = await this.db.get(key)
    return nodeData
  }

  /**
   * get all models
   * @method getModelHistory
   */
  getModelHistory = async function (lsID, category, key) {
    const { gt, lt } = this.crypto.getRange(lsID, category)

    const modelHistory = await this.db.createReadStream({
      gt,
      lt,
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    let modelData = []
    for await (const { key, value } of modelHistory) {
      modelData.push({ key, value })
    }
    return modelData
  }

  /**
   * delete model
   * @method deleteBentoModel
   */
  deleteBentoModel = async function (model) {
    await this.db.del(model.key)
    let deleteInfo = {}
    deleteInfo.id = model.key
    return deleteInfo
  }
}

export default ModelsModule
