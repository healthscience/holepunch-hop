'use strict'

class OverlayModule {
  constructor(db, crypto) {
    console.log('Overlay HP')
    console.log(db)
    this.db = db
    this.crypto = crypto
  }

  /**
   * save Overlay
   * @method saveOverlay
   */
  saveOverlay = async function (OverlayInfo) {
    await this.db.put(OverlayInfo.hash, OverlayInfo.contract)
    return OverlayInfo
  }

  /**
   * get one Overlay by id
   * @method getOverlay
   */
  getOverlay = async function (key) {
    const nodeData = await this.db.get(key)
    return nodeData
  }

  /**
   * get all Overlays
   * @method getOverlayHistory
   */
  getOverlayHistory = async function (lsID, category, key) {
    const { gt, lt } = this.crypto.getRange(lsID, category)

    const OverlayHistory = await this.db.createReadStream({
      gt,
      lt,
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    let OverlayData = []
    for await (const { key, value } of OverlayHistory) {
      OverlayData.push({ key, value })
    }
    return OverlayData
  }

  /**
   * delete Overlay
   * @method deleteOverlay
   */
  deleteOverlay = async function (Overlay) {
    await this.db.del(Overlay)
    let deleteInfo = {}
    deleteInfo.key = Overlay
    return deleteInfo
  }

  /**
   * update Overlay library from replication
   * @method updateOverlayModule
   */
  updateOverlayModule = async function (libContracts) {
    const { gt, lt } = this.crypto.getRange('Overlay')
    const batch = this.db.batch()
    for (const { key, value } of libContracts) {
      await batch.put(key, JSON.parse(value))
    }
    await batch.flush()
    return true
  }
}

export default OverlayModule