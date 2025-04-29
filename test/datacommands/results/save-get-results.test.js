import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Corestore from 'corestore'
import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'
import path from 'path'
import os from 'os'
import goodbye from 'graceful-goodbye'
import BeeWorker from '../../../src/bees.js'

// Get the path to the test data directory
const testDataPath = path.join(__dirname, 'data')

describe('Hyperbee Operations Tests', () => {
  let store
  let swarm
  let bee

  beforeEach(async () => {
    console.log('start of before each')
    // Create corestore instance
    store = new Corestore(os.homedir() + '/test-bee-store')
    // Create swarm instance
    swarm = new Hyperswarm()
    // make replication possible
    swarm.on('connection', conn => store.replicate(conn))
    goodbye(() => swarm.destroy())

    // put a pause in here for holepunch to fully to live
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Create BeeWorker instance
    bee = new BeeWorker(store, swarm)

    // put a pause in here for holepunch to fully to live
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('after pause')
    // Wait for initialization to complete
    await bee.setupHyperbee()
  })

  afterEach(async () => {
    // Clean up
    if (store) {
      await store.close()
    }
    if (swarm) {
      await swarm.destroy()
    }
  })

  it('should perform basic Hyperbee operations', async () => {
    // Test data
    /* const testHash = 'test-hash'
    const testData = { message: 'Hello Hyperbee!' }

    // 1. Put data
    await bee.dbKBledger.put(testHash, testData)
    
    // 2. Get data
    const result = await bee.dbKBledger.get(testHash)
    expect(result.value).toEqual(testData)

    // 3. Batch operations with 32-byte keys
    const batch = bee.dbKBledger.batch()
    const key1 = b4a.random(32).toString('hex')
    const key2 = b4a.random(32).toString('hex')
    await batch.put(key1, { value: 1 })
    await batch.put(key2, { value: 2 })
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
    expect(result1.value).toEqual({ value: 1 })
    const result2 = await bee.dbKBledger.get(key2)
    expect(result2.value).toEqual({ value: 2 })
    */
  })
/*
  it('should handle key value operations', async () => {
    // Test data
    const key1 = b4a.random(32).toString('hex')
    const value1 = { id: 1, name: 'Test 1' }
    const key2 = b4a.random(32).toString('hex')
    const value2 = { id: 2, name: 'Test 2' }

    // Put multiple values
    await bee.dbKBledger.put(key1, value1)
    await bee.dbKBledger.put(key2, value2)

    // Get values
    const result1 = await bee.dbKBledger.get(key1)
    const result2 = await bee.dbKBledger.get(key2)
    expect(result1.value).toEqual(value1)
    expect(result2.value).toEqual(value2)

    // Delete value
    await bee.dbKBledger.del(key1)
    const deletedResult = await bee.dbKBledger.get(key1)
    expect(deletedResult).toBeNull()
  }) */
})