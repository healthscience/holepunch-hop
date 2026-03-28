import b4a from 'b4a'

export const HOPKey = {
  /**
   * 1. Create a Primary Content Key
   * Stored once at the 'Root' level of the peer's Bee.
   * Format: category!hash (e.g., 'msg!d6c5e5...')
   */
  createContent: (category, hash) => {
    return b4a.from(`${category}!${hash}`)
  },

  /**
   * 2. Create a Stitching (Link) Key
   * Connects a piece of content to a specific Life-Strap.
   * Format: LS_ID!link!item_hash
   */
  stitch: (lsID, itemHash) => {
    return b4a.from(`${lsID}!link!${itemHash}`)
  },

  /**
   * 3. Create a Range for a Life-Strap
   * Can query the whole strap or just the 'links' inside it.
   */
  range: (lsID, subCategory = '') => {
    // If subCategory is 'link', it pulls only the stitches
    const prefix = subCategory ? `${lsID}!${subCategory}!` : `${lsID}!`
    const gt = b4a.from(prefix)
    const lt = b4a.concat([gt, b4a.from([0xff])])
    return { gt, lt }
  },

  /**
   * 4. Decode for BentoBoxDS
   */
  decode: (keyBuffer) => {
    return b4a.toString(keyBuffer, 'utf-8')
  },

  /**
   * 5. Parse a Link Key
   * Extracts the original Item Hash from a Stitching Key.
   */
  parseLink: (linkKeyStr) => {
    const parts = linkKeyStr.split('!')
    return {
      lsID: parts[0],
      type: parts[1], // 'link'
      itemHash: parts[2]
    }
  }
}
