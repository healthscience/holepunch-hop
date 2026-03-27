'use strict'
import b4a from 'b4a'
import { HOPKey } from '../hop-key-util.js'

class PeersModule {
  constructor(db) {
    this.db = db
  }

  /**
   * save peer
   * @method savePeer
   */
  savePeer = async function (peerInfo) {
    await this.db.put(peerInfo.publickey, peerInfo)
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
    console.log('getPeersHistory called with lsID:', lsID, 'category:', category, 'key:', key);
    if (lsID === undefined) {
      console.error('getPeersHistory: lsID is undefined!');
      console.trace();
    }
    const { gt, lt } = HOPKey.range(lsID, category)
    const peerHistory = await this.db.createReadStream({
      gt,
      lt,
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    let peerData = []
    for await (const { key, value } of peerHistory) {
      let hexKey = key.toString('hex')
      peerData.push({ hexKey, value })
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
