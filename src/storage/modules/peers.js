'use strict'
import b4a from 'b4a'

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
  getPeersHistory = async function (typeKey, key) {
    console.log('getPeersHistory called with typeKey:', typeKey, 'key:', key);
    if (typeKey === undefined) {
      console.error('getPeersHistory: typeKey is undefined!');
      console.trace();
    }
    const prefix = typeKey;
    const gt = b4a.from(prefix);
    const lt = b4a.concat([b4a.from(prefix), b4a.from([0xff])]);
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
