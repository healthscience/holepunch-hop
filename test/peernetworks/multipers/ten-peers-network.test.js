import { describe, it, expect, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { setupLowLevelTestPeer, stopLowLevelTestPeer, teardownLowLevelTestPeer, TrackEvent } from '../helpers/ws-hop-connect.js';

describe('Ten-Peer Network Tests (Low-Level Harness)', () => {
  const peerCount = 10;
  const stores = Array.from({ length: peerCount }, (_, i) => `test-10p-${i + 1}`);

  afterAll(async () => {
    // Teardown all 10 peers concurrently with an extended hook timeout
    await Promise.all(stores.map((store) => teardownLowLevelTestPeer(null, store)));
  }, 60000);

  it('establishes and verifies a ten-peer network topology using test harness workers', async () => {
    // Clean slate for all 10 store directories
    stores.forEach((s) => {
      const dir = path.join(os.homedir(), '.' + s);
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    });

    console.log('[Test Phase 1] Starting ten test peers...');
    const peers = [];
    for (let i = 0; i < peerCount; i++) {
      const peer = await setupLowLevelTestPeer({ storename: stores[i] });
      peers.push(peer);
    }

    expect(peers.length).toBe(peerCount);
    for (const peer of peers) {
      expect(peer.swarmPubkey).toBeDefined();
    }

    TrackEvent('test-suite', 'ten-peers-startup-complete', { count: peerCount });
    console.log('[Test Phase 1] All ten peers started successfully.');

    // -------------------------------------------------------------------------
    // Phase 2: Establish Ring/Mesh Connections across the 10 peers
    // -------------------------------------------------------------------------
    console.log('[Test Phase 2] Connecting peers in a ring topology...');
    
    for (let i = 0; i < peerCount; i++) {
      const currentPeer = peers[i];
      const nextPeerIndex = (i + 1) % peerCount;
      const targetPeer = peers[nextPeerIndex];

      const invite = await currentPeer.generateInvite(`ring-link-${i}-${nextPeerIndex}`);
      const hopInvite = 'hop:' + invite.bundle.publickey + invite.bundle.codename;

      const recordWait = currentPeer.waitForMessage(
        (msg) => msg.reftype === 'new-peer-topic' && msg.data?.concept?.name === `ring-link-${i}-${nextPeerIndex}`,
        60000
      );
      const acceptWait = targetPeer.waitForMessage(
        (msg) => msg.action === 'peer-record-formed-accept',
        60000
      );

      await targetPeer.acceptInvite(`client-${i}-${nextPeerIndex}`, hopInvite);

      await recordWait;
      await acceptWait;
    }

    TrackEvent('test-suite', 'ten-peers-ring-complete', { status: 'success' });
    console.log('[Test Phase 2] Ten-peer ring connections established successfully.');

    // Allow background replication streams to settle before stopping
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // -------------------------------------------------------------------------
    // Phase 3: Teardown and Cleanup
    // -------------------------------------------------------------------------
    console.log('[Test Phase 3] Shutting down all ten peer instances...');
    await Promise.all(peers.map((peer) => stopLowLevelTestPeer(peer)));
    console.log('[Test Phase 3] Teardown complete.');
  }, 300000); // 5-minute timeout for 10-node orchestration
});