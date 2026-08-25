'use strict'

import crypto from 'crypto'

export class TopicTracker {
  constructor() {
    this.topics = new Map() // topicHex -> topicMeta
    this.sendTopics = []
    this.peerRoles = new Map()
  }

  registerRole(pubKey, roleData) {
    this.peerRoles.set(pubKey, roleData)
  }

  getRole(pubKey) {
    return this.peerRoles.get(pubKey)
  }

  addTopic(topicHex, meta) {
    this.topics.set(topicHex, meta)
  }

  getTopic(topicHex) {
    return this.topics.get(topicHex)
  }

  generateReconnectTopic(peerContract, codeName, localPubKey) {
    const topicHex = crypto.randomBytes(32).toString('hex')
    return {
      type: 'topic-reconnect',
      peercontract: peerContract,
      publickey: localPubKey,
      peerkey: localPubKey,
      prime: true,
      topic: topicHex,
      codename: codeName,
      data: topicHex
    }
  }

  findOriginalKey(topicHex, peerNetwork) {
    for (const peer of peerNetwork) {
      if (peer.value?.concept?.topic === topicHex) {
        return peer.value.publickey || peer.key?.toString('hex')
      }
    }
    return ''
  }
}