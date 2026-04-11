'use strict'
import b4a from 'b4a'

class MediaModule {
  constructor(db, crypto) {
    this.db = db
    this.crypto = crypto
  }

  /**
   * save media
   * @method saveMedia
   */
  saveMedia = async function (mediaInfo) {
    await this.db.put(mediaInfo.key, mediaInfo.data)
    return mediaInfo.data
  }

  /**
   * get one media by id
   * @method getMedia
   */
  getMedia = async function (key) {
    const nodeData = await this.db.get(key)
    return nodeData
  }

  /**
   * get all media
   * @method getMediaHistory
   */
  getMediaHistory = async function (lsID, category, key) {
    const { gt, lt } = this.crypto.getRange(lsID, category)

    const cuesHistory = await this.db.createReadStream({
      gt,
      lt,
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    let cuesData = []
    for await (const { key, value } of cuesHistory) {
      cuesData.push({ key, value })
    }    
    return cuesData
  }

  /**
   * delete media
   * @method deleteBentomedia
   */
  deleteBentomedia = async function (media) {
    await this.db.del(media.key)
    let deleteInfo = {}
    deleteInfo.spaceid = media.key
    return deleteInfo
  }
}

export default MediaModule
