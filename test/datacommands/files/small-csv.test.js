import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Corestore from 'corestore'
import fs from 'fs'
import path from 'path'
import os from 'os'
import Hyperswarm from 'hyperswarm'
import goodbye from 'graceful-goodbye'
import b4a from 'b4a'
import DriveWorker from '../../../src/storage/drive.js'

// Get the path to the test data directory
const testDataPath = path.join(__dirname, 'data')
const testCSVPath = path.join(testDataPath, 'jan3-bitcoin.csv')

describe('CSV File Operations Tests', () => {
  let store
  let swarm
  let clientDrive

  beforeEach(async () => {

    store = new Corestore(os.homedir() + '/.test-file-store')
    swarm = new Hyperswarm()
    // make replication possible
    swarm.on('connection', conn => store.replicate(conn))
    goodbye(() => swarm.destroy())

    // Create HypDrive instance
    clientDrive = new DriveWorker(store, swarm)

    // Initialize drive
    await clientDrive.setupHyperdrive()
  })

  afterEach(async () => {
    // Clean up
  })

  it('should save and retrieve small CSV file', async () => {
    // 1. Read the actual CSV file
    const csvContent = fs.readFileSync(testCSVPath, 'utf-8')
    const csvFileName = path.basename(testCSVPath)

    // 2. Save CSV file
    await clientDrive.hyperdriveFilesave('text/csv', csvFileName, csvContent)

    // 3. Verify file is saved
    const clientFileContent = await clientDrive.drive.get('text/csv/' + csvFileName)
    expect(clientFileContent.toString()).toBe(csvContent)

    // 4. Verify file metadata
    const fileInfo = await clientDrive.drive.entry('text/csv/' + csvFileName)
    expect(fileInfo).toBeDefined()
    expect(fileInfo.value.blob).toBeDefined()
    expect(fileInfo.value.blob.byteLength).toBe(csvContent.length)

    // 5. Verify file structure (headers)
    const fileLines = csvContent.split('\n')
    const headers = fileLines[0].split(',')
    expect(headers.length).toBeGreaterThan(0)
    expect(headers[0]).toBeDefined()

    // 6. Verify specific 2015 entry
    const entry2015 = fileLines[7] // 7th line (0-indexed)
    expect(entry2015).toBe('2015-01-03 01:30,PST,287.1,47370,bitcoin,0')

    // 7. Verify specific values in 2015 entry
    const entryValues = entry2015.split(',')
    expect(entryValues[0]).toBe('2015-01-03 01:30')
    expect(entryValues[1]).toBe('PST')
    expect(entryValues[2]).toBe('287.1')
    expect(entryValues[3]).toBe('47370')
    expect(entryValues[4]).toBe('bitcoin')
    expect(entryValues[5]).toBe('0')
  })
})