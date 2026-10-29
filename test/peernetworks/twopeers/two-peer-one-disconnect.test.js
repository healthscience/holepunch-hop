import { describe, it, expect, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { setupLowLevelTestPeer, stopLowLevelTestPeer, teardownLowLevelTestPeer, TrackEvent } from '../helpers/ws-hop-connect.js';

describe('Persistent Peer Disconnection & Unilateral Reconnection Workflows', () => {
  const store1 = 'test-recon-p1';
  const store2 = 'test-recon-p2';

  afterAll(async () => {
    await teardownLowLevelTestPeer(null, store1);
    await teardownLowLevelTestPeer(null, store2);
  });

  it('Scenario 2: Peer 1 stays online, Peer 2 closes down and auto-reconnects on launch', async () => {
    const p1Dir = path.join(os.homedir(), '.' + store1);
    const p2Dir = path.join(os.homedir(), '.' + store2);
    if (fs.existsSync(p1Dir)) fs.rmSync(p1Dir, { recursive: true, force: true });
    if (fs.existsSync(p2Dir)) fs.rmSync(p2Dir, { recursive: true, force: true });

    let peer1 = await setupLowLevelTestPeer({ storename: store1 });
    let peer2 = await setupLowLevelTestPeer({ storename: store2 });

    const inviteBundle = await peer1.generateInvite('peer1-recon-s2');
    const hopInvite = 'hop:' + inviteBundle.bundle.publickey + inviteBundle.bundle.codename;

    const peer1RecordSaved = peer1.waitForMessage((msg) => msg.reftype === 'new-peer-topic', 45000);
    const peer2RecordAccepted = peer2.waitForMessage((msg) => msg.action === 'peer-record-formed-accept', 45000);

    await peer2.acceptInvite('peer2-recon-s2', hopInvite);

    const p1RecordMsg = await peer1RecordSaved;
    const p2RecordMsg = await peer2RecordAccepted;

    const p2PeerRecord = { key: p2RecordMsg.data.key, value: p2RecordMsg.data };

    // -------------------------------------------------------------------------
    // Shut down only Peer 2 while Peer 1 remains online
    // -------------------------------------------------------------------------
    console.log('[Scenario 2] Shutting down Peer 2 while Peer 1 remains online...');
    await stopLowLevelTestPeer(peer2);
    peer2 = null;

    // -------------------------------------------------------------------------
    // Set up listeners for replication / re-sync confirmation upon Peer 2 return
    // -------------------------------------------------------------------------
    const peer1Replicated = peer1.waitForMessage((msg) => {
      return msg.action === 'osmosis-replication-complete' || msg.action === 'peer-reconnected-verify';
    }, 60000);

    // Restart Peer 2 from disk storage
    console.log('[Scenario 2] Restarting Peer 2 from disk...');
    peer2 = await setupLowLevelTestPeer({ storename: store2 });

    const peer2Replicated = peer2.waitForMessage((msg) => {
      return msg.action === 'osmosis-replication-complete' || msg.action === 'peer-reconnected-verify';
    }, 60000);

    // Give the restarted worker a brief moment to stabilize stores before re-hydrating
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log('[Scenario 2] Re-hydrating Peer 2 state...');
    peer2.hopWorker.Peers.setupConnectionBegin([p2PeerRecord]);

    const res1 = await peer1Replicated;
    const res2 = await peer2Replicated;

    expect(res1).toBeDefined();
    expect(res2).toBeDefined();
    
    TrackEvent('test-suite', 'scenario2-unilateral-reconnect-complete', { res1, res2 });
    console.log('[Scenario 2] Unilateral restart replication and reconnection verified successfully.');

    // Graceful closing delay to let background streams settle before teardown
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await stopLowLevelTestPeer(peer1);
    if (peer2) await stopLowLevelTestPeer(peer2);
  }, 120000);
});