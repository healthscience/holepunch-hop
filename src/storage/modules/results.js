'use strict'

class ResultsModule {
  constructor(db) {
    this.db = db
  }

  /**
   * save HOPresults
   * @method saveHOPresults
   */
  saveHOPresults = async function (refContract) {
    await this.db.put(refContract.hash, refContract.data)
    return refContract.data
  }

  /**
   * get all results
   * @method peerResults
   */
  peerResults = async function () {
    const nodeData = this.db.createReadStream()
    let resData = []
    for await (const { key, value } of nodeData) {
      resData.push({ key, value })
    }
    return resData
  }

  /**
   * lookup results per dataprint hash
   * @method peerResultsItem
   */
  peerResultsItem = async function (key) {
    const resultData = await this.db.get(key)
    return resultData
  }

  /**
   * delete results
   * @method deleteResultsItem
   */
  deleteResultsItem = async function (key) {
    const resultData = await this.db.del(key)
    return resultData
  }
}

export default ResultsModule
