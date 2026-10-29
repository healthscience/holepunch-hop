import { describe, it, expect, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { setupLowLevelTestPeer, stopLowLevelTestPeer, teardownLowLevelTestPeer, TrackEvent } from '../helpers/ws-hop-connect.js';

describe('Persistent Peer Reconnection & State Reload', () => {
  const store1 = 'test-recon-p1';
  const store2 = 'test-recon-p2';

  afterAll(async () => {
    await teardownLowLevelTestPeer(null, store1);
    await teardownLowLevelTestPeer(null, store2);
  });

  it('establishes initial connection, closes the entire program without wiping storage, restarts, and reconnects', async () => {
    // Clean slate before test
    const p1Dir = path.join(os.homedir(), '.' + store1);
    const p2Dir = path.join(os.homedir(), '.' + store2);
    if (fs.existsSync(p1Dir)) fs.rmSync(p1Dir, { recursive: true, force: true });
    if (fs.existsSync(p2Dir)) fs.rmSync(p2Dir, { recursive: true, force: true });

    // -------------------------------------------------------------------------
    // Phase 1: Initial Start & Handshake
    // -------------------------------------------------------------------------
    console.log('[Test Phase 1] Starting initial peers...');
    let peer1 = await setupLowLevelTestPeer({ storename: store1 });
    let peer2 = await setupLowLevelTestPeer({ storename: store2 });

    const inviteBundle = await peer1.generateInvite('peer1-recon');
    expect(inviteBundle).toBeDefined();

    const hopInvite = 'hop:' + inviteBundle.bundle.publickey + inviteBundle.bundle.codename;

    const peer1RecordSaved = peer1.waitForMessage((msg) => {
      return msg.reftype === 'new-peer-topic';
    }, 45000);

    const peer2RecordAccepted = peer2.waitForMessage((msg) => {
      return msg.action === 'peer-record-formed-accept';
    }, 45000);

    await peer2.acceptInvite('peer2-recon', hopInvite);

    const p1RecordMsg = await peer1RecordSaved;
    const p1PeerRecord = {}
    p1PeerRecord.key = p1RecordMsg.data.key
    p1PeerRecord.value = p1RecordMsg.data
    const p2RecordMsg = await peer2RecordAccepted;
    const p2PeerRecord = {}
    p2PeerRecord.key = p2RecordMsg.data.key
    p2PeerRecord.value = p2RecordMsg.data

    const targetTopic = p1RecordMsg.data.concept.topic;

    expect(targetTopic).toBeDefined();

    TrackEvent('test-suite', 'phase1-handshake-complete', { status: 'success' });

    // -------------------------------------------------------------------------
    // Phase 2: Close Entire Program Instances (Storage Preserved on Disk)
    // -------------------------------------------------------------------------
    console.log('[Test Phase 2] Shutting down peer programs while preserving disk stores...');
    await stopLowLevelTestPeer(peer1);
    await stopLowLevelTestPeer(peer2);
    peer1 = null;
    peer2 = null;

    // -------------------------------------------------------------------------
    // Phase 3: Restart Both Program Instances from Persistent Storage
    // -------------------------------------------------------------------------
    peer1 = await setupLowLevelTestPeer({ storename: store1 });
    peer2 = await setupLowLevelTestPeer({ storename: store2 });

    // Set up robust matchers for reconnection verification
    const peer1Reconnect = peer1.waitForMessage((msg) => {
      return msg.action === 'peer-reconnected-verify' || (msg.data && msg.data.topic);
    }, 45000);

    const peer2Reconnect = peer2.waitForMessage((msg) => {
      return msg.action === 'peer-reconnected-verify' || (msg.data && msg.data.topic);
    }, 45000);

    peer1.hopWorker.Peers.setupConnectionBegin([p1PeerRecord]);
    peer2.hopWorker.Peers.setupConnectionBegin([p2PeerRecord]);

    const recon1 = await peer1Reconnect;
    const recon2 = await peer2Reconnect;

    expect(recon1).toBeDefined();
    expect(recon2).toBeDefined();
    expect(recon1.data.topic).toBe(recon2.data.topic)
    TrackEvent('test-suite', 'phase3-reconnection-complete', { recon1, recon2 });
  }, 90000);
});