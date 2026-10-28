import path from 'path';
import fs from 'fs';
import os from 'os';
import HolepunchWorker from '../../../src/index.js';
import { createInviteBundle } from './inviteUtility.js';

// Proper standalone TrackEvent utility function exported for tests
export function TrackEvent(storename, eventName, data) {
  console.log(`[TrackEvent:${storename}] [${eventName}]`, JSON.stringify(data, null, 2));
}

export async function setupLowLevelTestPeer(options) {
  const { storename } = options;
  
  const hopWorker = new HolepunchWorker(storename);
  await hopWorker.ready;
  await hopWorker.startStores();

  const eventHistory = [];
  let messageWaiters = [];
  let swarmPubkey = '';

  const checkWaiters = (msg) => {
    messageWaiters = messageWaiters.filter((waiter) => {
      if (waiter.conditionFn(msg)) {
        waiter.resolve(msg);
        return false;
      }
      return true;
    });
  };

  const trackAndRecord = (eventName, msg) => {
    TrackEvent(storename, eventName, msg);
    eventHistory.push(msg);
    checkWaiters(msg);
  };

  // 1. Native Event Listeners using TrackEvent
  hopWorker.Peers.on('peer-network', (msg) => {
    if (msg.action === 'network-keys' && msg.data?.publickey) {
      swarmPubkey = msg.data.publickey;
    }
    trackAndRecord('peer-network', msg);
  });

  hopWorker.on('peer-record-save', (msg) => {
    trackAndRecord('peer-record-saved', { action: 'peer-record-saved', ...msg });
  });

  hopWorker.Peers.on('peer-record-formed-accept', (record) => {
    trackAndRecord('peer-record-formed-accept', { action: 'peer-record-formed-accept', data: record });
  });

  // Additional low-level network and session tracers
  hopWorker.Peers.on('peer-reconnected', (data) => trackAndRecord('peer-reconnected', data));
  hopWorker.Peers.on('peer-disconnect', (data) => trackAndRecord('peer-disconnect', data));

  // 2. Swarm Connection & Discovery Diagnostics
  if (hopWorker.swarm) {
    hopWorker.swarm.on('connection', (conn, info) => {
      const peerId = info.publicKey ? info.publicKey.toString('hex') : 'unknown';
      console.log(`[Swarm:${storename}] Connection established -> Peer ID: ${peerId} | Is Client: ${info.client}`);
      
      conn.on('close', () => console.log(`[Swarm:${storename}] Connection closed with Peer ID: ${peerId}`));
      conn.on('error', (err) => console.error(`[Swarm:${storename}] Connection error with Peer ID ${peerId}:`, err.message));
    });
  }

  // Trigger network keys broadcast
  if (hopWorker.Peers && typeof hopWorker.Peers.networkKeys === 'function') {
    hopWorker.Peers.networkKeys();
  }

  const waitForMessage = (conditionFn, timeoutMs = 60000) => {
    return new Promise((resolve, reject) => {
      const historicalMatch = eventHistory.find((msg) => {
        try { return conditionFn(msg); } catch { return false; }
      });
      if (historicalMatch) return resolve(historicalMatch);

      const timer = setTimeout(() => {
        messageWaiters = messageWaiters.filter((w) => w.resolve !== resolveWrapper);
        reject(new Error(`Timeout (${timeoutMs}ms) waiting for isolated worker event`));
      }, timeoutMs);

      const resolveWrapper = (msg) => {
        clearTimeout(timer);
        resolve(msg);
      };

      messageWaiters.push({ conditionFn, resolve: resolveWrapper });
    });
  };

  const send = async (messageHOP) => {
    console.log(`[Send:${storename}] Routing networkPath:`, JSON.stringify(messageHOP));
    await hopWorker.networkPath(messageHOP);
  };

  const generateInvite = async (peerName) => {
    if (!swarmPubkey && hopWorker.swarm?.keyPair?.publicKey) {
      swarmPubkey = hopWorker.swarm.keyPair.publicKey.toString('hex');
    }

    const { bundle, base64String } = await createInviteBundle(peerName, swarmPubkey);
    await send({
      type: 'network',
      action: 'share',
      task: 'peer-share-codename',
      privacy: 'private',
      data: bundle
    });
    return { bundle, base64String };
  };

  const acceptInvite = async (peerName, base64InviteCode) => {
    await send({
      type: 'network',
      action: 'share',
      task: 'peer-share-invite',
      privacy: 'private',
      data: {
        publickey: base64InviteCode,
        name: peerName,
        longterm: true,
        topic: '',
        settopic: false,
        live: false
      }
    });
    return true;
  };

  return {
    hopWorker,
    get swarmPubkey() { 
      return swarmPubkey || hopWorker.swarm?.keyPair?.publicKey?.toString('hex'); 
    },
    waitForMessage,
    send,
    generateInvite,
    acceptInvite
  };
}

export async function teardownLowLevelTestPeer(peerInstance, storename) {
  if (peerInstance?.hopWorker?.swarm) {
    await peerInstance.hopWorker.swarm.destroy();
  }

  if (storename) {
    const storePath = path.join(os.homedir(), storename.startsWith('.') ? storename : `.${storename}`);
    if (fs.existsSync(storePath)) {
      fs.rmSync(storePath, { recursive: true, force: true });
    }
  }
}