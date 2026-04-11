'use strict'

class ChatModule {
  constructor(db, crypto) {
    this.db = db
    this.crypto = crypto
  }

  /**
   * save chat history
   * @method saveBentochat
   */
  saveBentochat = async function (chatData) {
    await this.db.put(chatData.key, chatData.contract)
    return true
  }

  /**
   * delete chat item
   * @method deleteBentochat
   */
  deleteBentochat = async function (chat) {
    await this.db.del(chat.key)
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
    const { gt, lt } = this.crypto.getRange(lsID, category)

    const chathistoryData = this.db.createReadStream({
      gt,
      lt,
      keyEncoding: 'binary',
      valueEncoding: 'json'
    })
    let chatData = []
    for await (const { key, value } of chathistoryData) {
      chatData.push({ key, value })
    }
    return chatData
  }
}

export default ChatModule
