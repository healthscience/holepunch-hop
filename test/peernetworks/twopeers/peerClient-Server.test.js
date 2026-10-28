import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupLowLevelTestPeer, teardownLowLevelTestPeer, TrackEvent } from '../helpers/ws-hop-connect.js';

describe('Isolated Module Peer Handshake & Topic Exchange', () => {
  let peer1, peer2;

  beforeAll(async () => {
    peer1 = await setupLowLevelTestPeer({
      storename: 'test-p1-core',
      passphrase: 'testbee20'
    });

    peer2 = await setupLowLevelTestPeer({
      storename: 'test-p2-core',
      passphrase: 'testbee'
    });
  }, 60000);

  afterAll(async () => {
    await teardownLowLevelTestPeer(peer1, 'test-p1-core');
    await teardownLowLevelTestPeer(peer2, 'test-p2-core');
  });

  it('executes invite generation, swarm connection, codename inform, and topic token exchange in isolation', async () => {
    const peer1Pubkey = peer1.swarmPubkey;
    expect(peer1Pubkey).toBeTruthy();
    TrackEvent('test-suite', 'peer1-pubkey-ready', { peer1Pubkey });

    const inviteBundle = await peer1.generateInvite('peer1-node');
    expect(inviteBundle).toBeDefined();
    TrackEvent('test-suite', 'invite-generated', inviteBundle);
    
    const hopInvite = 'hop:' + inviteBundle.bundle.publickey + inviteBundle.bundle.codename;

    // Listen for the exact actions observed in the trace logs
    const peer1RecordSaved = peer1.waitForMessage((msg) => msg.reftype === 'new-peer-topic', 45000);
    const peer2RecordAccepted = peer2.waitForMessage((msg) => msg.action === 'peer-record-formed-accept', 45000);

    await peer2.acceptInvite('peer2-node', hopInvite);

    const p1Confirm = await peer1RecordSaved;
    const p2Confirm = await peer2RecordAccepted;

    expect(p1Confirm).toBeDefined();
    expect(p2Confirm).toBeDefined();
    TrackEvent('test-suite', 'handshake-complete', { p1Confirm, p2Confirm });
  }, 60000);
});