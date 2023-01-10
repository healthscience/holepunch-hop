import assert from 'assert'
import HolepunchData from '../src/index.js'

describe('holepunch hypercore bee drive peers setup', function () {
  it('hello from holepunch', function () {
    let dataAPI = new HolepunchData()
    assert.equal(dataAPI.hello, 'holepunch')
  })
})