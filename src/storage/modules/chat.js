'use strict'
import b4a from 'b4a'
import { HOPKey } from '../hop-key-util.js'

class ChatModule {
  constructor(db) {
    this.db = db
  }

  /**
   * save chat history
   * @method saveBentochat
   */
  saveBentochat = async function (chatData) {
    await this.db.put(chatData.hash, chatData)
    return true
  }

  /**
   * delete chat item
   * @method deleteBentochat
   */
  deleteBentochat = async function (chat) {
    await this.db.del(chat.chatid)
    let deleteInfo = {}
    deleteInfo.chatid = chat.chatid
    return deleteInfo
  }

  /**
   * lookup peer bentospace layout default
   * @method getBentochat
   */
  getBentochat = async function (key) {
    const nodeData = await this.db.get(key)
    return nodeData
  }

  /**
   * lookup range save chat history
   * @method getBentochatHistory
   */
  getBentochatHistory = async function (lsID, category, range) {
    const { gt, lt } = HOPKey.range(lsID, category)

    const chathistoryData = this.db.createReadStream({
      gt,
      lt,
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    let chatData = []
    for await (const { key, value } of chathistoryData) {
      let hexKey = key.toString('hex')
      chatData.push({ hexKey, value })
    }
    return chatData
  }
}

export default ChatModule
