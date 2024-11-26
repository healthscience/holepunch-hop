'use strict'
/**
*  Manage HyperDrive  file datastore
*
* @class HypDrive
* @package    HypDrive
* @copyright  Copyright (c) 2022 James Littlejohn
* @license    http://www.gnu.org/licenses/old-licenses/gpl-3.0.html
* @version    $Id$
*/
import EventEmitter from 'events'
import fs from 'fs'
import Hyperdrive from 'hyperdrive'
import b4a from 'b4a'
import Fileparser from './fileParser.js'
import SqliteAdapter from './adapters/sqliteDatabase.js'
import csv from 'csv-parser'
import { DateTime, Interval } from 'luxon'
import * as chrono from 'chrono-node'

class HypDrive extends EventEmitter {

  constructor(core, swarm) {
    super()
    this.hello = 'hyperdrive'
    this.core = core
    this.swarm = swarm
    this.drive = {}
    this.fileUtility = new Fileparser('')
    this.AdapterSqlite = new SqliteAdapter()
    this.dataBase = {}
    // this.setupHyperdrive()
  }

    /**
   * pass on websocket to library
   * @method setWebsocket
   *
  */
  setWebsocket = function (ws) {
    this.wsocket = ws
  }

  /**
   * setup hyperdrive protocol
   * @method setupHyperdrive
   *
  */
  setupHyperdrive = async function () {
    // A local drive provides a Hyperdrive interface to a local directory
    // const local = new Localdrive('./hop-dir')

    // A Hyperdrive takes a Corestore because it needs to create many cores
    // One for a file metadata Hyperbee, and one for a content Hypercore
    this.drive = new Hyperdrive(this.core)
    await this.drive.ready()

    let startDrivePubkey = {}
    startDrivePubkey.type = 'hyperdrive-pubkey'
    startDrivePubkey.data =  b4a.toString(this.drive.key, 'hex')
    // this.wsocket.send(JSON.stringify(startDrivePubkey))
  }


  /**
   * hyperdrive stream write
   * @method hyperdriveWritestream 
   *
   */
  hyperdriveWritestream = async function (fileData) {
    /* let localthis = this
    const ws = this.drive.createWriteStream('/blob.txt')

    this.wsocketwrite('Hello, ')
    this.wsocketwrite('world!')
    this.wsocketend()

    this.wsocketon('close', function () {
      const rs = localthis.drive.createReadStream('/blob.txt')
      rs.pipe(process.stdout) // prints Hello, world!
    }) */
  }

  /**
   * produce list of files in folder
   * @method listFilesFolder 
   *
  */
  listFilesFolder = async function (folder) {
    const stream = await this.drive.list(folder) //  [options])
    return stream
  }

  /**
   * navigate folders and files
   * @method hyperdriveCSVmanager
   *
   */
  hyperdriveCSVmanager = async function (fileData) {
    // File writes
    let fileResponse = {}
    // file input management
    // protocol to save original file
    let newPathFile = await this.hyperdriveFilesave(fileData.data[0].type, fileData.data[0].name, fileData.data[0].content)

    // extract out the headers name for columns
    let headerSet = this.fileUtility.extractCSVHeaderInfo(fileData)
    //  csv to JSON convertion HOP protocol standard
    const parseData = await this.readCSVfile(newPathFile, headerSet)
    let jsonFiledata = this.fileUtility.convertJSON(fileData, headerSet, parseData, 'local', null)
    // save the json file
    let newPathFile2 = await this.hyperdriveFilesave(jsonFiledata.path, jsonFiledata.name, jsonFiledata.data)
    fileResponse.filename = newPathFile2
    fileResponse.header = headerSet
    fileResponse.data = jsonFiledata
    return fileResponse
  }

  /**
   * save to hyperdrive file
   * @method hyperdriveJSONsaveBlind 
   *
  */
  hyperdriveJSONsaveBlind = async function (name, data) {
    // simple JSON file to save from blind input form beebee
    let hyperdrivePath = 'json/' + name
    let confirmSave = await this.drive.put(hyperdrivePath, data)
    return confirmSave
  }

  /**
   * save csv data to hyperdrive file
   * @method saveCSVfilecontent 
   *
  */
  saveCSVfilecontent = async function (fData) {
    // extract header info first
    let headerInfo = this.fileUtility.webCSVparse(fData)
    let hyperdrivePath = 'csv/' + fData.data[0].name
    let confirmSave = await this.drive.put(hyperdrivePath, fData.data[0].content)
    let saveStatus = {}
    saveStatus.save = confirmSave
    saveStatus.headerinfo = headerInfo
    return saveStatus
  }


  /**
   * save csv data to hyperdrive file
   * @method saveSqliteFirst 
   *
  */
  saveSqliteFirst = async function (path, name, data) {
    let fileResponse = {}
    // file input management
    // protocol to save original file
    let newPathFile = await this.hyperdriveFilesave(path, name, data)
    // extract table and then table columns
    // extract out the headers name for columns
    const parseData = await this.SQLiteSetup(name)
    fileResponse.filename = name
    fileResponse.header = parseData.headers
    fileResponse.tables = parseData.tables
    return fileResponse
  }


  /**
   * blind sqlite lookup of data (maybe restricture no. of rows of data iniitally)
   * @method blindDataSqlite 
   *
  */
  blindDataSqlite = async function (dataInfo) {
     let parseData = await this.SQLiteQuery(dataInfo)
     return parseData
  }


  /**
   * save to hyperdrive file
   * @method hyperdriveFilesave 
   *
   */
  hyperdriveFilesave = async function (path, name, data) {
    // File writes
    let hyperdrivePath = path + '/' + name
    var dataUrl = data
    // var buffer = Buffer.from(dataUrl, 'base64')
    fs.writeFileSync('data.csv', dataUrl)
    if (path === 'text/csv') {
      await this.drive.put(hyperdrivePath, fs.readFileSync('data.csv', 'utf-8'))
      // now remove the temp file for converstion
      fs.unlink('data.csv', (err => {
        if (err) console.log(err);
        else {
          console.log('file deleted csv')
        }
      }))
    } else if (path === 'json') {
      await this.drive.put(hyperdrivePath, data)
    } else if (path === 'sqlite') {
      var dataUrl = data.split(",")[1]
      var buffer = Buffer.from(dataUrl, 'base64')
      fs.writeFileSync('tempsql.db', buffer)
      await this.drive.put(hyperdrivePath, fs.readFileSync('tempsql.db'))
      fs.unlink('tempsql.db', (err => {
        if (err) console.log(err);
        else {
          console.log('file deleted temp sqlite')
        }
      }))
    }
    return hyperdrivePath
  }


  /**
   * save a stream of file ie. large file
   * @method hyperdriveStreamSave 
   *
  */
  hyperdriveStreamSave = async function (path, data, first) {
    let ws
    if (first === true) {
      // await this.drive.del(path)
      ws = this.drive.createWriteStream(path)
      ws.write(data)
    }
    // use listener
    this.on('stream-update', (data) => {
      ws.write(data)
    })

    this.on('stream-complete', async (data) => {
      ws.end()
      ws.once('close', () => 
        console.log('stream-close'),
        await this.checkLargeList(path)
      )
    })

  }

  /**
   * check read the file if save large file
   * @method checkLargeList
   *
  */
  checkLargeList = async function (path) {
    let localthis = this
    let folder = 'test'
    let folderList = await this.listFilesFolder(folder)
    let dataDrive = []
    folderList.on('data', function(chunk) {
      dataDrive.push(chunk)
    })

    folderList.on('end', async function() {
      for (let file of dataDrive) {
        if (file.key === path) {
          await localthis.firstLineLargeCSV(path)
        }
      }
    })
  }

  /**
   * check read the file if save large file
   * @method checkLargeSave
   *
  */
  checkLargeSave = async function (path) {
    const rs = this.drive.createReadStream(path)
    for await (const chunk of rs) {
     console.log('rs', chunk.toString()) // => <Buffer ..>
    }
  }

  /**
   * check read the file if save large file
   * @method firstLineLargeCSV
   *
  */
  firstLineLargeCSV = async function (path) {
    let readFile = await this.readCSVfileStream(path)
    let makeString = readFile[0].toString()
    let csvFormat = makeString.split(/\r?\n/)
    let headerList = csvFormat[0].split(",");
    let largeMessage = {}
    largeMessage.type = 'library'
    largeMessage.action = 'PUT-stream'
    largeMessage.task = 'PUT-stream'
    largeMessage.save = true
    largeMessage.data = {}
    largeMessage.data.path = path
    largeMessage.data.columns = headerList
    this.emit('largefile-save', largeMessage)
  }

  /**
   * stream save update
   * @method streamSavedata 
   *
   */
  streamSavedata = async function (path, data) {
    this.emit('stream-update', data)
  }

  /**
   * stream save complete
   * @method streamSaveComplete 
   *
   */
  streamSaveComplete = async function (data) {
    this.emit('stream-update', data)
    this.emit('stream-complete', data)
  }

  /**
   * read file nav to folder
   * @method hyperdriveReadfile 
   *
   */
  hyperdriveReadfile = async function (path) {
    // File reads
    const entry = await this.drive.get(path)
    entry.on('data',  function(chunk) {
    })
    return true
  }

  /**
   * rebuidl file and give directory location
   * @method hyperdriveLocalfile
   *
  */
  hyperdriveLocalfile = async function (path) {
    // File reads to buffer and recreate file
    // const bufFromGet2 = await this.drive.get(path)
    const { value: entry } = await this.drive.entry(path)
    const blobs = await this.drive.getBlobs()
    const bufFromEntry = await blobs.get(entry.blob)
    let localFile = 'localdb'
    fs.writeFileSync(localFile, bufFromEntry)
    return localFile
  }

  /**
  *  set file path, read and make sqlite3 connect db
  * @method SQLiteSetup
  *
  */
  SQLiteSetup = async function (file) {
    // const stream = this.liveDataAPI.DriveFiles.listFilesFolder('sqlite/')
    let dbFile = await this.hyperdriveLocalfile('sqlite/' + file)
    let summarySQLinfo = await this.AdapterSqlite.newDatabase(dbFile)
    return summarySQLinfo
  }
  
  /**
  *  set file path, read and make sqlite3 connect db
  * @method SQLiteSourceSetup
  *
  */
  SQLiteSourceSetup = async function (data) {
    // const stream = this.liveDataAPI.DriveFiles.listFilesFolder('sqlite/')
    let dbFile = await this.hyperdriveLocalfile('sqlite/' + data.db)
    data.file = dbFile
    let summarySQLinfo = await this.AdapterSqlite.tableQuery(data)
    return summarySQLinfo
  }


  /**
  *  ask for device tables and info.
  * @method SQLiteDeviceSetup
  *
  */
  SQLiteDeviceSetup = async function (data) {
    // const stream = this.liveDataAPI.DriveFiles.listFilesFolder('sqlite/')
    let dbFile = await this.hyperdriveLocalfile('sqlite/' + data.db)
    data.file = dbFile
    let summaryTable = await this.AdapterSqlite.tableQuery(data)
    let summaryDevice = await this.AdapterSqlite.deviceQuery(data.table)
    let summarySQLinfo = {}
    summarySQLinfo.tables = summaryTable
    summarySQLinfo.devices = summaryDevice
    return summarySQLinfo
  }

  /**
  *  set file path, read and make sqlite3 connect db
  * @method SQLiteQuery
  *
  */
  SQLiteQuery = async function (dataInfo) {
     let timestampCol = ''
    // is the sqliite database sill accive?
    // const stream = this.liveDataAPI.DriveFiles.listFilesFolder('sqlite/')
    let dbFile = await this.hyperdriveLocalfile('sqlite/' + dataInfo.file.file)
    let queryData = await this.AdapterSqlite.queryTable(dataInfo)
    if (queryData.length > 0) {
      let contextKeys = Object.keys(queryData[0])
      timestampCol = contextKeys[dataInfo.context.timestamp]
      // now prepare into data and labels
      let blindData = {}
      let extractCol = []
      let extractLabel = []
      for (let rowi of queryData) {
    extractCol.push(rowi[dataInfo.context.name.name])
    // assume data column for now and parse to mills seconds
    let testCH1 = chrono.parseDate(rowi[timestampCol])
    let parseDate = testCH1 * 1000 // this.testDataExtact(testCH1)
    extractLabel.push(parseDate)
      }
      blindData.data = extractCol
      blindData.label = extractLabel
      return blindData
    } else {
      let blindData = {}
      blindData.data = []
      blindData.label = []
      return blindData
    }

  }


	/**
	* try to match to known time formats
	* @method testDataExtact
	*
	*/
	testDataExtact = function (sampleDate) {
	  let parseDate0 = DateTime.fromISO(sampleDate)
	  let parseDate1 = DateTime.fromHTTP(sampleDate)
	  let parseDate2 = DateTime.fromJSDate(sampleDate)
	  /* let parseDate3 = DateTime.fromFormat(sampleDate, "dd-MM-yyyy HH:MM")
	  let parseDate4 = DateTime.local(sampleDate)
	  // .fromJSDate(sampleDate) // .fromHTTP(sampleDate) //  fromFormat(sampleDate, "YYY-MM-DD ")  //.fromISO(sampleDate) // or DateTime. fromFormat("23-06-2019", "dd-MM-yyyy") .(splitRow[0])//  new Date(splitRow[0])
	   */
	  let millDate = parseDate2.toMillis()
	  return millDate
	}

  /**
  *  taken in csv file and read per line
  * @method readCSVfile
  *
  */
  readCSVfile = async function (fpath, headerSet) {
    // const rs2 = this.drive.createReadStream(fpath) // 'text/csv/testshed11530500.csv') // '/blob.txt')
    // rs2.pipe(process.stdout) // prints file content
    const rs = this.drive.createReadStream(fpath) // 'text/csv/testshed11530500.csv') // '/blob.txt')
    return new Promise((resolve, reject) => {
      const results = []
      // this.drive.createReadStream(fpath)
        rs.pipe(csv({ headers: headerSet.headerset, separator: headerSet.delimiter, skipLines: headerSet.dataline }))
        .on('data', (data) => results.push(data))
        .on('end', () => {
          resolve(results)
        })
    })
  }

  /**
  *  stream out line by line
  * @method readCSVfileStream
  *
  */
  readCSVfileStream = async function (fpath) {
    const rs = this.drive.createReadStream(fpath, { start: 0, end: 120 })
      return new Promise((resolve, reject) => {
      let results = []
        rs.on('data', (data) => results.push(data.toString()))
        rs.on('end', () => {
          resolve(results)
        })
    })
  }

  /**
   * replicate a hyperdrive
   * @method hyperdriveReplicate 
   *
  */
  hyperdriveReplicate = async function (type) {
    // Swarm on the network
    await this.client.replicate(this.drive)
    await new Promise(r => setTimeout(r, 3e3)) // just a few seconds
    await this.client.network.configure(this.drive, {announce: false, lookup: false})
  }

}

export default HypDrive