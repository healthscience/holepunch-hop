'use strict'

class LedgerModule {
  constructor(db) {
    this.db = db
  }

  /**
   * save kbledger entry
   * @method saveKBLentry
   */
  saveKBLentry = async function (ledgerEntry) {
    await this.db.put(ledgerEntry.data, ledgerEntry.hash)
  }

  /**
   * get all kbl entries
   * @method KBLentries
   */
  KBLentries = async function () {
    const nodeData = this.db.createReadStream()
    let ledgerData = []
    for await (const { key, value } of nodeData) {
      ledgerData.push({ key, value })
    }
    return ledgerData
  }

  /**
   * lookup coherence ledger per results id
   * @method peerLedgerProof
   */
  peerLedgerProof = async function (dataPrint) {
    const ledgerData = await this.db.get(dataPrint.resultuuid)
    return ledgerData
  }
}

export default LedgerModule
