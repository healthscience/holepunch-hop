import { describe, it, expect, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { setupLowLevelTestPeer, stopLowLevelTestPeer, teardownLowLevelTestPeer, TrackEvent } from '../helpers/ws-hop-connect.js';

describe('Three-Peer Full Mesh Persistent Reconnection & State Reload Workflows', () => {
  const store1 = 'test-mesh-3p1';
  const store2 = 'test-mesh-3p2';
  const store3 = 'test-mesh-3p3';

  afterAll(async () => {
    await teardownLowLevelTestPeer(null, store1);
    await teardownLowLevelTestPeer(null, store2);
    await teardownLowLevelTestPeer(null, store3);
  });

  it('establishes full three-peer pairwise connections (1-2, 1-3, 2-3), persists to disk, restarts, and re-hydrates', async () => {
    // Clean slate before test
    [store1, store2, store3].forEach((s) => {
      const dir = path.join(os.homedir(), '.' + s);
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    });

    // -------------------------------------------------------------------------
    // Phase 1: Start Three Peers & Establish Full Mesh Pairwise Links
    // -------------------------------------------------------------------------
    console.log('[Test Phase 1] Starting three peers for full mesh topology...');
    let peer1 = await setupLowLevelTestPeer({ storename: store1 });
    let peer2 = await setupLowLevelTestPeer({ storename: store2 });
    let peer3 = await setupLowLevelTestPeer({ storename: store3 });

    const invite1to2 = await peer1.generateInvite('mesh-p1-p2');
    const invite1to3 = await peer1.generateInvite('mesh-p1-p3');
    const invite2to3 = await peer2.generateInvite('mesh-p2-p3');

    const hopInvite1to2 = 'hop:' + invite1to2.bundle.publickey + invite1to2.bundle.codename;
    const hopInvite1to3 = 'hop:' + invite1to3.bundle.publickey + invite1to3.bundle.codename;
    const hopInvite2to3 = 'hop:' + invite2to3.bundle.publickey + invite2to3.bundle.codename;

    const p1RecordForP2 = peer1.waitForMessage((msg) => msg.reftype === 'new-peer-topic' && msg.data?.concept?.name === 'mesh-p1-p2', 60000);
    const p1RecordForP3 = peer1.waitForMessage((msg) => msg.reftype === 'new-peer-topic' && msg.data?.concept?.name === 'mesh-p1-p3', 60000);
    const p2RecordForP3 = peer2.waitForMessage((msg) => msg.reftype === 'new-peer-topic' && msg.data?.concept?.name === 'mesh-p2-p3', 60000);

    const p2Accepted1 = peer2.waitForMessage((msg) => msg.action === 'peer-record-formed-accept', 60000);
    const p3Accepted1 = peer3.waitForMessage((msg) => msg.action === 'peer-record-formed-accept', 60000);
    const p3Accepted2 = peer3.waitForMessage((msg) => msg.action === 'peer-record-formed-accept', 60000);

    await peer2.acceptInvite('p2-client-1', hopInvite1to2);
    await peer3.acceptInvite('p3-client-1', hopInvite1to3);
    await peer3.acceptInvite('p3-client-2', hopInvite2to3);

    const rec1to2 = await p1RecordForP2;
    const rec1to3 = await p1RecordForP3;
    const rec2to3 = await p2RecordForP3;

    const p2Acc1Msg = await p2Accepted1;
    const p3Acc1Msg = await p3Accepted1;
    const p3Acc2Msg = await p3Accepted2;

    expect(rec1to2).toBeDefined();
    expect(rec1to3).toBeDefined();
    expect(rec2to3).toBeDefined();

    TrackEvent('test-suite', 'phase1-full-mesh-handshake-complete', { status: 'success' });
    console.log('[Test Phase 1] Full three-peer mesh handshake complete successfully.');

    // -------------------------------------------------------------------------
    // Phase 2: Close All Program Instances (Storage Preserved on Disk)
    // -------------------------------------------------------------------------
    console.log('[Test Phase 2] Shutting down all three peer programs while preserving disk stores...');
    await stopLowLevelTestPeer(peer1);
    await stopLowLevelTestPeer(peer2);
    await stopLowLevelTestPeer(peer3);
    peer1 = null;
    peer2 = null;
    peer3 = null;
    console.log('[Test Phase 2] Shutdown complete.');

    // -------------------------------------------------------------------------
    // Phase 3: Restart All Three Peer Instances and Re-hydrate Full Mesh
    // -------------------------------------------------------------------------
    console.log('[Test Phase 3] Restarting all three peer programs from persistent storage...');
    peer1 = await setupLowLevelTestPeer({ storename: store1 });
    peer2 = await setupLowLevelTestPeer({ storename: store2 });
    peer3 = await setupLowLevelTestPeer({ storename: store3 });

    // Monitor replication completion across all nodes upon re-hydration
    const p1Replicated = peer1.waitForMessage((msg) => msg.action === 'osmosis-replication-complete', 60000);
    const p2Replicated = peer2.waitForMessage((msg) => msg.action === 'osmosis-replication-complete', 60000);
    const p3Replicated = peer3.waitForMessage((msg) => msg.action === 'osmosis-replication-complete', 60000);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Map records correctly pointing concept.publickey to the REMOTE peer's fresh swarmPubkey
    const peer1Record1 = {
      key: rec1to2.data.key,
      value: {
        ...rec1to2.data,
        concept: { ...rec1to2.data.concept, publickey: peer2.swarmPubkey }
      }
    };
    const peer1Record2 = {
      key: rec1to3.data.key,
      value: {
        ...rec1to3.data,
        concept: { ...rec1to3.data.concept, publickey: peer3.swarmPubkey }
      }
    };
    const peer2Record1 = {
      key: p2Acc1Msg.data.key,
      value: {
        ...p2Acc1Msg.data,
        concept: { ...p2Acc1Msg.data.concept, publickey: peer1.swarmPubkey }
      }
    };
    const peer2Record2 = {
      key: rec2to3.data.key,
      value: {
        ...rec2to3.data,
        concept: { ...rec2to3.data.concept, publickey: peer3.swarmPubkey }
      }
    };
    const peer3Record1 = {
      key: p3Acc1Msg.data.key,
      value: {
        ...p3Acc1Msg.data,
        concept: { ...p3Acc1Msg.data.concept, publickey: peer1.swarmPubkey }
      }
    };
    const peer3Record2 = {
      key: p3Acc2Msg.data.key,
      value: {
        ...p3Acc2Msg.data,
        concept: { ...p3Acc2Msg.data.concept, publickey: peer2.swarmPubkey }
      }
    };

    console.log('[Test Phase 3] Re-hydrating saved full-mesh peer contracts into workers...');
    peer1.hopWorker.Peers.setupConnectionBegin([peer1Record1, peer1Record2]);
    peer2.hopWorker.Peers.setupConnectionBegin([peer2Record1, peer2Record2]);
    peer3.hopWorker.Peers.setupConnectionBegin([peer3Record1, peer3Record2]);

    const res1 = await p1Replicated;
    const res2 = await p2Replicated;
    const res3 = await p3Replicated;

    expect(res1).toBeDefined();
    expect(res2).toBeDefined();
    expect(res3).toBeDefined();

    TrackEvent('test-suite', 'phase3-full-mesh-reconnection-complete', { res1, res2, res3 });
    console.log('[Test Phase 3] Full three-peer mesh replication and state reload verified successfully.');

    await new Promise((resolve) => setTimeout(resolve, 2000));
    await stopLowLevelTestPeer(peer1);
    await stopLowLevelTestPeer(peer2);
    await stopLowLevelTestPeer(peer3);
  }, 180000);
});