import { describe, it, expect, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { setupLowLevelTestPeer, stopLowLevelTestPeer, teardownLowLevelTestPeer, TrackEvent } from '../helpers/ws-hop-connect.js';

describe('Two-Then-Three Sequential Invite & Reconnection Workflows', () => {
  const store1 = 'test-t2t-p1';
  const store2 = 'test-t2t-p2';
  const store3 = 'test-t2t-p3';

  afterAll(async () => {
    await teardownLowLevelTestPeer(null, store1);
    await teardownLowLevelTestPeer(null, store2);
    await teardownLowLevelTestPeer(null, store3);
  });

  it('establishes peer 1-2 and 1-3, restarts all three, with peer 3 generating invites for peer 1 and 2 to accept', async () => {
    [store1, store2, store3].forEach((s) => {
      const dir = path.join(os.homedir(), '.' + s);
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    });

    // -------------------------------------------------------------------------
    // Phase 1: Initial Connections (Peer 1 to Peer 2 & Peer 3)
    // -------------------------------------------------------------------------
    console.log('[Test Phase 1] Starting initial peers...');
    let peer1 = await setupLowLevelTestPeer({ storename: store1 });
    let peer2 = await setupLowLevelTestPeer({ storename: store2 });
    let peer3 = await setupLowLevelTestPeer({ storename: store3 });

    const invite1to2 = await peer1.generateInvite('p1-p2-link');
    const invite1to3 = await peer1.generateInvite('p1-p3-link');

    const hopInvite1to2 = 'hop:' + invite1to2.bundle.publickey + invite1to2.bundle.codename;
    const hopInvite1to3 = 'hop:' + invite1to3.bundle.publickey + invite1to3.bundle.codename;

    const p1Rec2 = peer1.waitForMessage((msg) => msg.reftype === 'new-peer-topic' && msg.data?.concept?.name === 'p1-p2-link', 60000);
    const p1Rec3 = peer1.waitForMessage((msg) => msg.reftype === 'new-peer-topic' && msg.data?.concept?.name === 'p1-p3-link', 60000);
    const p2Acc = peer2.waitForMessage((msg) => msg.action === 'peer-record-formed-accept', 60000);
    const p3Acc = peer3.waitForMessage((msg) => msg.action === 'peer-record-formed-accept', 60000);

    await peer2.acceptInvite('p2-client', hopInvite1to2);
    await peer3.acceptInvite('p3-client', hopInvite1to3);

    await p1Rec2;
    await p1Rec3;
    await p2Acc;
    await p3Acc;

    console.log('[Test Phase 1] Initial connections established successfully.');

    // -------------------------------------------------------------------------
    // Phase 2: Close All Instances (Storage Preserved)
    // -------------------------------------------------------------------------
    console.log('[Test Phase 2] Shutting down all peer programs...');
    await stopLowLevelTestPeer(peer1);
    await stopLowLevelTestPeer(peer2);
    await stopLowLevelTestPeer(peer3);
    peer1 = null;
    peer2 = null;
    peer3 = null;

    // -------------------------------------------------------------------------
    // Phase 3: Bring Back All Three and Have Peer 3 Connect to Peer 1 & Peer 2
    // -------------------------------------------------------------------------
    console.log('[Test Phase 3] Restarting all peers...');
    peer1 = await setupLowLevelTestPeer({ storename: store1 });
    peer2 = await setupLowLevelTestPeer({ storename: store2 });
    peer3 = await setupLowLevelTestPeer({ storename: store3 });

    const p1Replicated = peer1.waitForMessage((msg) => msg.action === 'osmosis-replication-complete', 60000);
    const p2Replicated = peer2.waitForMessage((msg) => msg.action === 'osmosis-replication-complete', 60000);
    const p3Replicated = peer3.waitForMessage((msg) => msg.action === 'osmosis-replication-complete', 60000);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Peer 3 generates unique invites for Peer 1 and Peer 2
    const invite3to1 = await peer3.generateInvite('p3-invite-to-p1');
    const invite3to2 = await peer3.generateInvite('p3-invite-to-p2');

    const hopInvite3to1 = 'hop:' + invite3to1.bundle.publickey + invite3to1.bundle.codename;
    const hopInvite3to2 = 'hop:' + invite3to2.bundle.publickey + invite3to2.bundle.codename;

    // Peer 1 and Peer 2 accept Peer 3's invites
    await peer1.acceptInvite('p1-accept-p3', hopInvite3to1);
    await peer2.acceptInvite('p2-accept-p3', hopInvite3to2);

    const res1 = await p1Replicated;
    const res2 = await p2Replicated;
    const res3 = await p3Replicated;

    expect(res1).toBeDefined();
    expect(res2).toBeDefined();
    expect(res3).toBeDefined();

    TrackEvent('test-suite', 'phase3-two-then-three-invite-flow-complete', { res1, res2, res3 });
    console.log('[Test Phase 3] Two-then-three workflow via Peer 3 invites completed successfully.');

    await new Promise((resolve) => setTimeout(resolve, 2000));
    await stopLowLevelTestPeer(peer1);
    await stopLowLevelTestPeer(peer2);
    await stopLowLevelTestPeer(peer3);
  }, 180000);
});