import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Corestore from 'corestore'
import Hyperswarm from 'hyperswarm'
import Hyperbee from 'hyperbee'
import b4a from 'b4a'
import hashObject from 'object-hash'
import path from 'path'
import os from 'os'
import goodbye from 'graceful-goodbye'
import BeeWorker from '../../../src/storage/bees.js'

// Get the path to the test data directory
const testDataPath = path.join(__dirname, 'data')

describe('Hyperbee Ledger Tests', () => {
  let store
  let swarm
  let bee

  beforeAll(async () => {
    console.log('start of before each')
    store = new Corestore(os.homedir() + '/.test-ledger-store')
    swarm = new Hyperswarm()
    // make replication possible
    swarm.on('connection', conn => store.replicate(conn))
    goodbye(() => swarm.destroy())

    // Additional wait for full initialization
    await new Promise((resolve) => setTimeout(resolve, 4000))
    console.log('wait afoter')
    // Create BeeWorker instance
    bee = new BeeWorker(store, swarm)
    // await bee.setupHyperbee()  vitest have issues starting so many core at once
    const core5 = store.get({ name: 'kbledger' })
    bee.dbKBledger = new Hyperbee(core5, {
      keyEncoding: 'utf-8',
      valueEncoding: 'json'
    })
    await bee.dbKBledger.ready()
    await new Promise((resolve) => setTimeout(resolve, 2000))
  })

  afterAll(async () => {
    console.log('Cleaning up test environment')
    // await swarm.destroy()
    await bee.dbKBledger.close()
    bee = null
    store = null
    // swarm = null
  }, 20000) // 20 second timeout for cleanup

  it('should perform basic Hyperbee operations', async () => {
    // Test data
    console.log('start of test')
    const testHash = 'test-hash'
    const testData = { message: 'Hello Hyperbee!' }

    // 1. Put data
    await bee.dbKBledger.put(testHash, testData)
    
    // 2. Get data
    const result = await bee.dbKBledger.get(testHash)
    expect(result.value).toEqual(testData)

    // 3. Batch operations with 32-byte keys
    let res1 = { bbid: '1212121212', data: { value: [1, 2, 3] }}
    let res2 = { bbid: '3232323232', data: { value: [4, 5, 6] }}
    const batch = bee.dbKBledger.batch()
    const key1 = hashObject(res1)
    const key2 = hashObject(res2)
    await batch.put(key1, res1)
    await batch.put(key2, res2)
    await batch.flush()

    // 4. CreateReadStream
    const stream = bee.dbKBledger.createReadStream()
    const entries = []
    for await (const entry of stream) {
      entries.push(entry)
    }
    expect(entries.length).toBeGreaterThan(0)

    // 5. Check version
    expect(bee.dbKBledger.version).toBeGreaterThan(0)

    // 6. Verify batch operations
    const result1 = await bee.dbKBledger.get(key1)
    expect(result1.key).toEqual(key1)
    const result2 = await bee.dbKBledger.get(key2)
    expect(result2.key).toEqual(key2)
  })

  it('should handle key value operations', async () => {
    // Test data
    console.log('start of test2')
    let res1 = { bbid: '1212121212', data: { value: [1, 2, 3] }}
    let res2 = { bbid: '3232323232', data: { value: [4, 5, 6] }}
    const key1 = hashObject(res1)
    const key2 = hashObject(res2)

    // Put multiple values
    await bee.dbKBledger.put(key1, res1)
    await bee.dbKBledger.put(key2, res2)

    // Get values
    const result1 = await bee.dbKBledger.get(key1)
    const result2 = await bee.dbKBledger.get(key2)
    expect(result1.value.data.value[0]).toEqual(1)
    expect(result2.value.data.value[0]).toEqual(4)

    // Delete value
    await bee.dbKBledger.del(key1)
    const deletedResult = await bee.dbKBledger.get(key1)
    expect(deletedResult).toBeNull()
    console.log('end of test2')
  })
})