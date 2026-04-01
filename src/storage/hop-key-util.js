import b4a from 'b4a'

export const HOPKey = {
  // Helper to ensure we have a 32-byte ID, no matter what is passed in
  _toID: (input) => {
    if (!input) return b4a.alloc(32)
    let buf = b4a.isBuffer(input) ? input : b4a.from(input, 'hex')
    // If it's a 42-byte content key (lifestrap!...), slice the last 32
    return buf.length > 32 ? buf.slice(buf.length - 32) : buf
  },

  /**
   * 1. Create a Content Key (Always Binary)
   * Result: [category_utf8] + [!] + [32_bytes_binary]
   */
  createContent: (category, hash) => {
    const prefix = b4a.from(category + '!')
    const hashBuf = HOPKey._toID(hash)
    return b4a.concat([prefix, hashBuf])
  },

  stitch: (lsID, itemHash) => {
      // 1. Force the lsID to a clean 64-char Hex String
      // We strip the 'lifestrap!' prefix if it's there
      const idHex = b4a.isBuffer(lsID) 
        ? b4a.toString(lsID.length > 32 ? lsID.slice(lsID.length - 32) : lsID, 'hex')
        : lsID.replace('lifestrap!', '');

      // 2. Force the itemHash to a clean 64-char Hex String
      const itemHex = b4a.isBuffer(itemHash) 
        ? b4a.toString(itemHash, 'hex') 
        : itemHash;
      
      // 3. Return a clean Buffer made from a clean Hex String
      // No raw binary bits are trapped inside the string here!
      return b4a.from(`${idHex}!link!${itemHex}`);
    },

  /**
   * 3. Create a Range (Always Binary)
   */
  range: (lsID, subCategory = 'link') => {
    const idBuf = HOPKey._toID(lsID)
    const sep = b4a.from('!')
    const subBuf = b4a.from(subCategory)
    
    const gt = b4a.concat([idBuf, sep, subBuf, sep])
    const lt = b4a.concat([gt, b4a.from([0xff])])
    return { gt, lt }
  }
}