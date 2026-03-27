'use strict'
import b4a from 'b4a'

export const HOPKey = {
  /**
   * Create a key from parts using '!' as delimiter
   * @param {...string} parts
   * @returns {Buffer}
   */
  create: (...parts) => {
    return b4a.from(parts.join('!'))
  },

  /**
   * Calculate range boundaries for a prefix
   * @param {string|Buffer} prefix
   * @returns {{gt: Buffer, lt: Buffer}}
   */
  range: (prefix) => {
    const gt = b4a.from(prefix)
    const lt = b4a.concat([gt, b4a.from([0xff])])
    return { gt, lt }
  },

  /**
   * Decode a buffer key to string
   * @param {Buffer} key
   * @returns {string}
   */
  decode: (key) => {
    return b4a.toString(key, 'utf-8')
  }
}

export default HOPKey
