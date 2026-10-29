import path from 'path';
import fs from 'fs';
import os from 'os';
import EventEmitter from 'events';
import HolepunchWorker from '../../../src/index.js';
import { createInviteBundle } from './inviteUtility.js';

export function TrackEvent(storename, eventName, data) {
  // console.log(`[TrackEvent:${storename}] [${eventName}]`, JSON.stringify(data, null, 2));
}

class MockWebSocket extends EventEmitter {
  constructor() {
    super();
    this.sentMessages = [];
  }
  send(data) {
    this.sentMessages.push(data);
    try {
      const parsed = JSON.parse(data);
      this.emit('message-dispatched', parsed);
    } catch (e) {
      this.emit('message-dispatched', data);
    }
  }
}

export async function setupLowLevelTestPeer(options) {
  const { storename } = options;
  
  const hopWorker = new HolepunchWorker(storename);
  const mockWs = new MockWebSocket();
  hopWorker.setWebsocket(mockWs);

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

  mockWs.on('message-dispatched', (msg) => {
    if (msg.action === 'network-keys' && msg.data?.publickey) {
      swarmPubkey = msg.data.publickey;
    }
    trackAndRecord('ws-message', msg);
  });

  hopWorker.Peers.on('peer-network', (msg) => {
    if (msg.action === 'network-keys' && msg.data?.publickey) {
      swarmPubkey = msg.data.publickey;
    }
    trackAndRecord('peer-network', msg);
  });

  hopWorker.on('peer-record-save', (msg) => {
    trackAndRecord('peer-record-saved', { ...msg, action: 'peer-record-saved' });
  });

  hopWorker.Peers.on('peer-record-formed-accept', (record) => {
    trackAndRecord('peer-record-formed-accept', { action: 'peer-record-formed-accept', data: record });
  });

  hopWorker.Peers.on('peer-reconnected', (data) => {
    trackAndRecord('peer-reconnected', { action: 'peer-reconnected-verify', data });
  });

  hopWorker.Peers.on('peer-disconnect', (data) => trackAndRecord('peer-disconnect', data));

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
    await new Promise((resolve) => setTimeout(resolve, 500));
    return true;
  };

  return {
    hopWorker,
    mockWs,
    get swarmPubkey() { 
      return swarmPubkey || hopWorker.swarm?.keyPair?.publicKey?.toString('hex'); 
    },
    waitForMessage,
    send,
    generateInvite,
    acceptInvite
  };
}

export async function stopLowLevelTestPeer(peerInstance) {
  if (peerInstance?.hopWorker) {
    const worker = peerInstance.hopWorker;
    if (worker.swarm && typeof worker.swarm.destroy === 'function') {
      try { await worker.swarm.destroy(); } catch (e) {}
    }
    if (worker.store && typeof worker.store.close === 'function') {
      try { await worker.store.close(); } catch (e) {}
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 3000));
}

export async function teardownLowLevelTestPeer(peerInstance, storename) {
  await stopLowLevelTestPeer(peerInstance);

  if (storename) {
    const storePath = path.join(os.homedir(), storename.startsWith('.') ? storename : `.${storename}`);
    if (fs.existsSync(storePath)) {
      fs.rmSync(storePath, { recursive: true, force: true });
    }
  }
}