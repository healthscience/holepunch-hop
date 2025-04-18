import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn } from 'child_process'
import path from 'path'
import HolepunchWorker from '../src/index.js'

// Set global test timeout to 10 seconds
const testTimeout = 10000;

describe('holepunch initialization', () => {
  let hopProcess
  let holepunch

  beforeAll(async () => {
    // Start HOP server
    const baseHOPStepsUp = path.join(__dirname, '..')
    hopProcess = spawn('npm', ['run', 'start'], { stdio: 'inherit', cwd: baseHOPStepsUp })

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Initialize HolepunchWorker
    holepunch = new HolepunchWorker('test-instance')
    await holepunch.startHolepunch()
    // Additional wait for full initialization
    await new Promise((resolve) => setTimeout(resolve, 2000))
  })

  afterAll(async () => {
    // Clean up HolepunchWorker
    // Stop HOP server
    if (hopProcess) {
      hopProcess.kill()
    }
  })

  it('should have initialized store', () => {
    expect(holepunch.store).toBeDefined()
  })

  it('should have initialized swarm', () => {
    expect(holepunch.swarm).toBeDefined()
  })

  it('should have initialized BeeData', () => {
    expect(holepunch.BeeData).toBeDefined()
  })
})