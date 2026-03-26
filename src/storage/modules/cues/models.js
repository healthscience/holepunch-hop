'use strict'
import b4a from 'b4a'

class ModelsModule {
  constructor(db) {
    this.db = db
  }

  /**
   * save model
   * @method saveModel
   */
  saveModel = async function (modelInfo) {
    await this.db.put(modelInfo.id, modelInfo.data)
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
  getModelHistory = async function (typeKey, key) {
    const prefix = typeKey;
    const gt = b4a.from(prefix);
    const lt = b4a.concat([b4a.from(prefix), b4a.from([0xff])]);

    const modelHistory = await this.db.createReadStream({
      gt,
      lt,
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    let modelData = []
    for await (const { key, value } of modelHistory) {
      let hexKey = key.toString('hex')
      modelData.push({ hexKey, value })
    }
    return modelData
  }

  /**
   * delete model
   * @method deleteBentoModel
   */
  deleteBentoModel = async function (model) {
    await this.db.del(model.id)
    let deleteInfo = {}
    deleteInfo.id = model.id
    return deleteInfo
  }
}

export default ModelsModule
