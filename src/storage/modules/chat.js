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
  saveDialoguechat = async function (chatData) {
    await this.db.put(chatData.hash, chatData.contract)
    return true
  }

  /**
   * delete chat item
   * @method deleteBentochat
   */
  deleteDialoguechat = async function (chat) {
    await this.db.del(chat.key)
    let deleteInfo = {}
    deleteInfo.id = chat.id
    return deleteInfo
  }

  /**
   * lookup peer bentospace layout default
   * @method getBentochat
   */
  getDialoguechat = async function (key) {
    const nodeData = await this.db.get(key)
    return nodeData
  }

  /**
   * lookup range save chat history
   * @method getDialoguechatHistory
   */
  getDialoguechatHistory = async function (lsID, category, range) {
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
