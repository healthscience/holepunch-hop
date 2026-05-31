'use strict'

class PeersModule {
  constructor(db, crypto) {
    this.db = db
    this.crypto = crypto
  }

  /**
   * save peer
   * @method savePeer
   */
  savePeer = async function (peerInfo) {
    await this.db.put(peerInfo.hash, peerInfo.contract)
    return peerInfo
  }

  /**
   * get one peer by publickey
   * @method getPeer
   */
  getPeer = async function (key) {
    const nodeData = await this.db.get(key)
    return nodeData
  }

  /**
   * get all peers
   * @method getPeersHistory
   */
  getPeersHistory = async function (lsID, category, key) {
    //const { gt, lt } = this.crypto.getRange(lsID, category)
    let gt = Buffer.from(lsID, 'utf-8');
    let lt = gt + '\xff'
    const peerHistory = await this.db.createReadStream({
      gt,
      lt,
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    let peerData = []
    for await (const { key, value } of peerHistory) {
      peerData.push({ key, value })
    }    
    return peerData
  }

  /**
   * delete peer
   * @method deletePeer
   */
  deletePeer = async function (pubkey) {
    await this.db.del(pubkey)
    return { publickey: pubkey }
  }
}

export default PeersModule
