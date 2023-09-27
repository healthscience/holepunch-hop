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
import csv from 'csv-parser'

class HypDrive extends EventEmitter {

  constructor(core, swarm) {
    super()
    this.hello = 'hyperdrive'
    this.core = core
    this.swarm = swarm
    this.drive = {}
    this.fileUtility = new Fileparser('')
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
    let localthis = this
    const ws = this.drive.createWriteStream('/blob.txt')

    this.wsocketwrite('Hello, ')
    this.wsocketwrite('world!')
    this.wsocketend()

    this.wsocketon('close', function () {
      const rs = localthis.drive.createReadStream('/blob.txt')
      rs.pipe(process.stdout) // prints Hello, world!
    })
  }

  /**
   * produce list of files in folder
   * @method listFilesFolder 
   *
  */
  listFilesFolder = function (folder) {
    const stream = this.drive.list('') //  [options])
    // console.log(stream)
    // Handle stream events --> data, end, and error
    let dataDrive = []
    stream.on('data', function(chunk) {
      dataDrive.push(chunk)
    })

    stream.on('end', function(chunk) {
      // console.log('stream at end')
      // console.log(dataDrive)
    })
  }

  /**
   * navigate folders and files
   * @method hyperdriveFolderFiles 
   *
   */
  hyperdriveFolderFiles = async function (fileData) {
    // File writes
    let fileResponse = {}

    // file input management
    // protocol to save original file
    let newPathFile = await this.hyperdriveFilesave(fileData.data.type, fileData.data.name, fileData.data.path)

    // extract out the headers name for columns
    let headerSet = this.fileUtility.extractCSVHeaderInfo(fileData)
    // let drivePath = fileData.data.type
    // hyperdrive 10 old
    // await this.drive.promises.mkdir(drivePath)
    // make a subfolder not sure for now
    // await this.drive.promises.mkdir('/stuff/things')
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
   * @method hyperdriveFilesave 
   *
  */
  hyperdriveJSONsaveBlind = async function (name, data) {
    // simple JSON file to save from blind input form beebee
    let hyperdrivePath = 'json/' + name
    let confirmSave = await this.drive.put(hyperdrivePath, data)
    return confirmSave
  }

  /**
   * save to hyperdrive file
   * @method hyperdriveFilesave 
   *
   */
  hyperdriveFilesave = async function (path, name, data) {
    // File writes
    let hyperdrivePath = path + '/' + name
    var dataUrl = data.split(",")[1]
    var buffer = Buffer.from(dataUrl, 'base64')
    fs.writeFileSync('data.csv', buffer)
    if (path === 'text/csv') {
      await this.drive.put(hyperdrivePath, fs.readFileSync('data.csv', 'utf-8'))
      // now remove the temp file for converstion
      fs.unlink('data.csv', (err => {
        if (err) console.log(err);
        else {
          console.log('file deleted csv');
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
          console.log('file deleted temp sqlite');
        }
      }))
    }


    return hyperdrivePath
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
    console.log('path in')
    console.log(path)
    // File reads to buffer and recreate file
    // const bufFromGet2 = await this.drive.get(path)
    const { value: entry } = await this.drive.entry(path)
    const blobs = await this.drive.getBlobs()
    const bufFromEntry = await blobs.get(entry.blob)

    let localFile = 'localdb'
    // fs.writeFileSync(localFile, bufFromGet2)
    fs.writeFileSync(localFile, bufFromEntry)
    return localFile
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
      //this.drive.createReadStream(fpath)
        rs.pipe(csv({ headers: headerSet.headerset, separator: headerSet.delimiter, skipLines: headerSet.dataline }))
        .on('data', (data) => results.push(data))
        .on('end', () => {
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