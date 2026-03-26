'use strict'
import b4a from 'b4a'

class ProductsModule {
  constructor(db) {
    this.db = db
  }

  /**
   * save product
   * @method saveProduct
   */
  saveProduct = async function (cuesInfo) {
    await this.db.put(cuesInfo.cueid, cuesInfo.data)
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
  getProductHistory = async function (typeKey, key) {
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
   * delete product
   * @method deleteBentoProduct
   */
  deleteBentoProduct = async function (cue) {
    await this.db.del(cue.id)
    let deleteInfo = {}
    deleteInfo.spaceid = cue.id
    return deleteInfo
  }
}

export default ProductsModule
