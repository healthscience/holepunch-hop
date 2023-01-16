import assert from 'assert'
import HolepunchData from '../src/index.js'

describe('holepunch hypercore bee drive peers setup', function () {
  it('hello from holepunch', async function () {
    let dataAPI = new HolepunchData()
    assert.equal(dataAPI.hello, 'holepunch')
    await dataAPI.testCoreStore()
    await dataAPI.readHypercoreTest()
    assert.equal(dataAPI.readcore.toString('utf8'), 'data data in hypercore')
    // console.log('back from bees')
    // console.log(dataAPI.BeeData)
    // console.log('back from drive')
    // console.log(dataAPI.DriveFiles)
  })
})