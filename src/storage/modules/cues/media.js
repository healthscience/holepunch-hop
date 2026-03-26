'use strict'
import b4a from 'b4a'

class MediaModule {
  constructor(db) {
    this.db = db
  }

  /**
   * save media
   * @method saveMedia
   */
  saveMedia = async function (mediaInfo) {
    await this.db.put(mediaInfo.cueid, mediaInfo.data)
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
  getMediaHistory = async function (typeKey, key) {
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
   * delete media
   * @method deleteBentomedia
   */
  deleteBentomedia = async function (media) {
    await this.db.del(media.id)
    let deleteInfo = {}
    deleteInfo.spaceid = media.id
    return deleteInfo
  }
}

export default MediaModule
