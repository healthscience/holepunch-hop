'use strict'
import b4a from 'b4a'

class ProductsModule {
  constructor(db, crypto) {
    this.db = db
    this.crypto = crypto
  }

  /**
   * save product
   * @method saveProduct
   */
  saveProduct = async function (cuesInfo) {
    await this.db.put(cuesInfo.key, cuesInfo.data)
    return cuesInfo.data
  }

  /**
   * get one product by id
   * @method getProduct
   */
  getProduct = async function (key) {
    const nodeData = await this.db.get(key)
    return nodeData
  }

  /**
   * get all products
   * @method getProductHistory
   */
  getProductHistory = async function (lsID, category, key) {
    const { gt, lt } = this.crypto.getRange(lsID, category)

    const cuesHistory = await this.db.createReadStream({
      gt,
      lt,
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    let cuesData = []
    for await (const { key, value } of cuesHistory) {
      cuesData.push({ hexKey, value })
    }
    return cuesData
  }

  /**
   * delete product
   * @method deleteBentoProduct
   */
  deleteBentoProduct = async function (cue) {
    await this.db.del(cue.key)
    let deleteInfo = {}
    deleteInfo.spaceid = cue.key
    return deleteInfo
  }
}

export default ProductsModule
