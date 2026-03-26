'use strict'
import b4a from 'b4a'

class ChatModule {
  constructor(db) {
    this.db = db
  }

  /**
   * save chat history
   * @method saveBentochat
   */
  saveBentochat = async function (chatHistory) {
    await this.db.put(chatHistory.chat.chatid, chatHistory)
    return chatHistory
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
  getBentochatHistory = async function (typeKey, range) {
    const prefix = typeKey;
    const gt = b4a.from(prefix);
    const lt = b4a.concat([b4a.from(prefix), b4a.from([0xff])]);

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
