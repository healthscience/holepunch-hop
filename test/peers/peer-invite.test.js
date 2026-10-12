import { describe, it, expect, beforeEach, vi } from 'vitest'
import NetworkPeers from '../../src/network/peers.js'

describe('Peers Codename Matching (Direct Loop & Schema Contract)', () => {
  let peers

  beforeEach(() => {
    vi.spyOn(NetworkPeers.prototype, '_setupSwarm').mockImplementation(() => {})

    peers = new NetworkPeers({
      getPublicManifest: () => ({})
    })
  })

  it('setRole and matchCodename return exact protocol schema', () => {
    const invitePayload = {
      pubkey: '4a8f9c1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      codename: 'delta-echo',
      name: 'peer-alpha'
    }

    peers.setRole(invitePayload)

    const match = peers.matchCodename(invitePayload.pubkey)

    expect(match).toEqual({
      publickey: invitePayload.pubkey,
      role: { send: 'prime', invite: invitePayload },
      codename: 'delta-echo',
      name: 'peer-alpha'
    })
  })

  it('matchPeersCodename locates role by inviteCode and returns exact payload', () => {
    const invitePayload = {
      pubkey: '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff',
      codename: 'whiskey-tango',
      name: 'peer-bravo'
    }

    peers.setRole(invitePayload)

    const networkIncomingData = {
      peerkey: '99887766554433221100ffeeddccbbaa99887766554433221100ffeeddccbbaa',
      inviteCode: 'whiskey-tango'
    }

    const match = peers.matchPeersCodename(networkIncomingData)

    expect(match).toEqual({
      publickey: networkIncomingData.peerkey,
      role: { send: 'prime', invite: invitePayload },
      codename: 'whiskey-tango',
      name: 'peer-bravo'
    })
  })
})