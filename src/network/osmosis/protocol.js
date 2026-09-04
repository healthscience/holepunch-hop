'use strict'

import Protomux from 'protomux'
import c from 'compact-encoding'

/**
 * Custom compact-encoding schema for high-frequency hop-osmosis synchronization.
 * Keeps payload weight minimal for rapid thermodynamic state-sorting.
 */
const osmosisSchema = {
  preencode (state, m) {
    c.uint.preencode(state, m.action)        // 0: pulse, 1: align, 2: chaos-agitate
    c.float64.preencode(state, m.heliAngle)  // Solar orbital angle for coherence ledger
    c.float32.preencode(state, m.entropy)    // Current entropy/gradient float
    c.buffer.preencode(state, m.ecsVector)   // Raw state geometry for safeflow-ecs
  },
  encode (state, m) {
    c.uint.encode(state, m.action)
    c.float64.encode(state, m.heliAngle)
    c.float32.encode(state, m.entropy)
    c.buffer.encode(state, m.ecsVector)
  },
  decode (state) {
    return {
      action: c.uint.decode(state),
      heliAngle: c.float64.decode(state),
      entropy: c.float32.decode(state),
      ecsVector: c.buffer.decode(state)
    }
  }
}

/**
 * Handles Protomux channel multiplexing and automated discovery exchange.
 */
export class PeerProtocol {
  constructor(conn, options = {}) {
    this.conn = conn
    this.publicKey = options.publicKey
    this.onMessage = options.onMessage || (() => {})
    this.onOsmosis = options.onOsmosis || (() => {})
    this.localManifest = options.localManifest
    this.mux = Protomux.from(conn)
    this.channel = null
    this.controlHandler = null
    this.osmosisHandler = null

    this._setupChannel()
  }

  _setupChannel() {
    // Check if the channel already exists on this Protomux instance
    for (const ch of this.mux) {
      if (ch.protocol === 'holepunch-hop') {
        this.channel = ch
        break
      }
    }

    // Create the channel if it does not exist yet
    if (!this.channel) {
      this.channel = this.mux.createChannel({ protocol: 'holepunch-hop' })
    }

    if (!this.channel) return

    // Register message handlers if they haven't been attached yet
    if (!this.controlHandler) {
      try {
        this.controlHandler = this.channel.addMessage({
          encoding: c.json,
          onmessage: (data) => this.onMessage(this.publicKey, data)
        })
      } catch (err) {
        // Handler already registered on this channel
      }
    }

    if (!this.osmosisHandler) {
      try {
        this.osmosisHandler = this.channel.addMessage({
          encoding: osmosisSchema,
          onmessage: (data) => this.onOsmosis(this.publicKey, data)
        })
      } catch (err) {
        // Handler already registered on this channel
      }
    }

    this.channel.open()

    // Automatically exchange local public library manifest
    if (this.localManifest) {
      this.sendControl({
        type: 'public-library',
        action: 'auto-announce',
        data: this.localManifest
      })
    }
  }

  sendControl(payload) {
    if (this.channel && this.controlHandler) {
      this.controlHandler.send(payload)
    }
  }

  sendOsmosis(heliAngle, entropy, ecsVectorBuffer, action = 0) {
    if (this.channel && this.osmosisHandler) {
      this.osmosisHandler.send({
        action,
        heliAngle,
        entropy,
        ecsVector: ecsVectorBuffer
      })
    }
  }
}