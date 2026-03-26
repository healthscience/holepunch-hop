'use strict'

class SpacesModule {
  constructor(db) {
    this.db = db
  }

  /**
   * save space menu
   * @method saveSpaceHistory
   */
  saveSpaceHistory = async function (spaceContract) {
    await this.db.put(spaceContract.space.cueid, spaceContract)
    return spaceContract
  }

  /**
   * save space layout of bentobox
   * @method saveBentospace
   */
  saveBentospace = async function (spaceContract) {
    await this.db.put(spaceContract.cueid, spaceContract)
    return spaceContract
  }

  /**
   * lookup peer bentospace layout default
   * @method getBentospace
   */
  getBentospace = async function (key) {
    const nodeData = await this.db.get(key)
    return nodeData
  }

  /**
   * lookup bentospaces all
   * @method getAllBentospaces
   */
  getAllBentospaces = async function () {
    const spacesHistory = await this.db.createReadStream()
    let spacesData = []
    for await (const { key, value } of spacesHistory) {
      spacesData.push({ key, value })
    }    
    return spacesData
  }

  /**
   * delete space
   * @method deleteBentospace
   */
  deleteBentospace = async function (space) {
    await this.db.del(space.cueid)
    let deleteInfo = {}
    deleteInfo.spaceid = space.cueid
    return deleteInfo
  }

  /**
   * save space layout of bentobox (solo)
   * @method saveSolospace
   */
  saveSolospace = async function (spaceContract) {
    let key = 'startsolospaces'
    await this.db.put(key, spaceContract)
    return spaceContract
  }

  /**
   * lookup peer solospace layout default
   * @method getSolospace
   */
  getSolospace = async function () {
    let key = 'startsolospaces'
    const nodeData = await this.db.get(key)
    return nodeData
  }
}

export default SpacesModule
