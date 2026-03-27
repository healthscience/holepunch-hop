'use strict'
import b4a from 'b4a'
import { HOPKey } from '../../hop-key-util.js'

class ResearchModule {
  constructor(dbResearch, dbBesearch) {
    this.dbResearch = dbResearch
    this.dbBesearch = dbBesearch
  }

  /**
   * save research
   * @method saveResearch
   */
  saveResearch = async function (cuesInfo) {
    await this.dbResearch.put(cuesInfo.cueid, cuesInfo.data)
    return cuesInfo.data
  }

  /**
   * get one research by id
   * @method getResearch
   */
  getResearch = async function (key) {
    const nodeData = await this.dbResearch.get(key)
    return nodeData
  }

  /**
   * get all research
   * @method getResearchHistory
   */
  getResearchHistory = async function (lsID, category, key) {
    const { gt, lt } = HOPKey.range(lsID, category)

    const cuesHistory = await this.dbResearch.createReadStream({
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
   * delete research
   * @method deleteBentoResearch
   */
  deleteBentoResearch = async function (cue) {
    await this.dbResearch.del(cue.id)
    let deleteInfo = {}
    deleteInfo.spaceid = cue.id
    return deleteInfo
  }

  /**
   * save besearch
   * @method saveBesearch
   */
  saveBesearch = async function (cuesInfo) {
    await this.dbBesearch.put(cuesInfo.id, cuesInfo.data)
    return cuesInfo.data
  }

  /**
   * get one besearch by id
   * @method getBesearch
   */
  getBesearch = async function (key) {
    const nodeData = await this.dbBesearch.get(key)
    return nodeData
  }

  /**
   * get all Besearch
   * @method getBesearchHistory
   */
  getBesearchHistory = async function (lsID, category, key) {
    const { gt, lt } = HOPKey.range(lsID, category)

    const cuesHistory = await this.dbBesearch.createReadStream({
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
   * delete besearch
   * @method deleteBentoBesearch
   */
  deleteBentoBesearch = async function (cue) {
    await this.dbBesearch.del(cue.id)
    let deleteInfo = {}
    deleteInfo.spaceid = cue.id
    return deleteInfo
  }
}

export default ResearchModule
