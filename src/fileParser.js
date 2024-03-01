'use strict'
import atob from 'atob'

/**
*  FileParser
*
*
* @class FileParser
* @package    network library
* @copyright  Copyright (c) 2022 James Littlejohn
* @license    http://www.gnu.org/licenses/old-licenses/gpl-3.0.html
* @version    $Id$
*/

import fs from 'fs'
import os from 'os'
import util from 'util'
import events from 'events'
import axios from 'axios'
import csv from 'csv-parser'
import crypto from 'crypto'

var FileParser = function (path) {
  events.EventEmitter.call(this)
  this.storepath = path
}

/**
* inherits core emitter class within this class
* @method inherits
*/
util.inherits(FileParser, events.EventEmitter)

/**
* local json file extract header for auto complete
* @method extractJSONfile
*
*/
FileParser.prototype.localJSONfile = async function (o, ws) {
  let headerSet = this.extractJSONkeys(o)
  // data back to peer
  let fileFeedback = {}
  fileFeedback.success = true
  fileFeedback.path = this.storepath + '/json/' + o.data.name + '.json'
  fileFeedback.columns = headerSet
  let storeFeedback = {}
  storeFeedback.type = 'file-save'
  storeFeedback.action = 'library'
  storeFeedback.data = fileFeedback
  ws.send(JSON.stringify(storeFeedback))
}


/**
* web json file for saving
* @method webJSONfile
*
*/
FileParser.prototype.webJSONfile = async function (o, ws) {
  // then prepare file for HOP i.e. convert to json
  const lines = JSON.parse(reader.result)
  localthis.linesLimit = lines
  // data back to peer
  /* let fileFeedback = {}
  fileFeedback.success = true
  fileFeedback.path = this.storepath + '/json/' + fileName + '.json'
  fileFeedback.columns = headerSet.splitwords
  let storeFeedback = {}
  storeFeedback.type = 'json-file-save'
  storeFeedback.action = 'library'
  storeFeedback.data = fileFeedback
  ws.send(JSON.stringify(storeFeedback)) */
}

/**
* local file parser save etc
* @method localFileParse
*
*/
FileParser.prototype.localFileParse = async function (o, ws) {
  // then prepare file for HOP i.e. convert to json
  // file input management
  // extract out the headers name for columns
  let headerSet = this.extractCSVHeaderInfo(o)
  // protocol should be to save original file
  let newPathFile = this.saveOriginalProtocol(o)
  //  csv to JSON convertion and save into HOP
  // const praser = readStream(newPathcsv, headerSet, delimiter, dataline)
  const parser = await this.readFileStream(newPathFile, headerSet)
  this.convertJSON(o, headerSet, parser, 'local', null)
}

/**
* csv content files from web
* @method webCSVparse
*
*/
FileParser.prototype.webCSVparse = function (fData) {
  // match name row number
  let lcounter = 0
  let match = ''
  fData.data[0].content.split(/\r?\n/).forEach(line =>  {
    lcounter++
    if (lcounter === (parseInt(fData.data[0].info.cnumber) +1 )) {
    match = line
    }
  })

  let headerInfo = this.extractCSVheaders(fData.data[0], match)
  return headerInfo
  /*
  let dataWeb = await axios.get(content.websource)
    .catch(function (error) {
        // handle error
        console.log(error)
      })
  const dataSource = dataWeb.data
  let lcounter = 0
  let match = []
  dataSource.split(/\r\n|\n/).forEach(line =>  {
    lcounter++
    if (lcounter === (parseInt(content.info.cnumber) +1 )) {
      match = line
    }
  })
  */
  // create new file name hash of source url
  // const hashURL = crypto.createHash('sha256').update(content.websource).digest('hex')
  // const fileNewName = hashURL + '.csv'
  // localthis.linesLimit = lines.slice(0, 30)
  // let headerInfo = this.extractCSVheaders(content, match)
  // let newPathFile = localthis.saveOriginalProtocolWeb(content, dataSource, fileNewName)
  // const praser = await localthis.readFileStream(newPathFile, headerInfo)
  // this.convertJSON(o, ws, headerInfo, praser, 'web', fileNewName)
}

/**
* TEMP blind csv content files from web
* @method TEMPwebCSVparse
*
*/
FileParser.prototype.TEMPwebCSVparse = function (fData) {
  // match name row number
  let lcounter = 0
  let match = ''
  let extractLabel = []
  let extractCol = []
  fData.content.forEach(line =>  {
    lcounter++
    if (lcounter === parseInt(fData.info.cnumber)) {
     match = line
    }
    if (lcounter > 1) {
      let splitRow = line.split(',')
      // let pairData = {}
      // pairData.timestamp = splitRow[2]
      // pairData.price = splitRow[5]
      // console.log(pairData)
      if (splitRow[2] !== undefined) {
        extractCol.push(splitRow[fData.context.id])
        extractLabel.push(splitRow[2])
      }
    }
  })
  // extract out price and time
  let extractedPair = {}
  extractedPair.label = extractLabel
  extractedPair.data = extractCol
  return extractedPair

}

/**
* read csv headers and extract info
* @method extractCSVHeaderInfo
*
*/
FileParser.prototype.extractCSVHeaderInfo = function (o) {
  let match = ''
  let lcounter = 0
  // if local peer setup then file path is available
  if (o.data.web === 'weblocal') {
    const dataURI = o.data.path
    const dataCSV = atob(dataURI.split(',')[1]);
    dataCSV.split(/\r?\n/).forEach(line =>  {
      lcounter++
      if (lcounter === (parseInt(o.data.info.cnumber) +1 )) {
        match = line
      }
    })
  } else {
    //let filePathCSV = o.data[0].content // fs.existsSync(os.homedir() + this.storepath + '/csv/') + o.data.name
    const allFileContents = o.data[0].content // fs.readFileSync(filePathCSV, 'utf-8')
    allFileContents.split(/\r?\n/).forEach(line =>  {
      lcounter++
      if (lcounter === (parseInt(o.data[0].info.cnumber) +1 )) {
      match = line
      }
    })
    let headerInfo = this.extractCSVheaders(o, match)
    return headerInfo
  }
}

/**
* read JSON row and extact keys
* @method extractJSONkeys
*
*/
FileParser.prototype.extractJSONkeys = function (o) {
  let jsonKeys = []
  // if local peer setup then file path is available
  if (o.data.web === 'weblocal') {
    const dataURI = o.data.path
    const dataCSV = atob(dataURI.split(',')[1])
    const toJSON = JSON.parse(dataCSV)
    jsonKeys = Object.keys(toJSON[0])
  } else {
    // let filePathCSV = fs.existsSync(os.homedir() + this.storepath + '/csv/') + o.data.name
    const allFileContents = fs.readFileSync(filePathCSV, 'utf-8')
    allFileContents.split(/\r?\n/).forEach(line =>  {
      lcounter++
      if (lcounter === (parseInt(o.data.info.cnumber) +1 )) {
        jsonKeys = line
      }
    })
  }
  return jsonKeys
}

/**
*
* @method extractCSVheaders
*
*/
FileParser.prototype.extractCSVheaders = function (data, lineData) {
  let delimiter = ''
  if (data.info.delimiter === 'tab') {
    delimiter = "\t"
  } else if (data.info.delimiter === ';') {
    delimiter = ";"
  } else {
    delimiter = ","
  }
  let splitWords = lineData.split(delimiter)
  const headerSet = splitWords
  let dataline = parseInt(data.info.dataline)

  let headerInfo = {}
  headerInfo.headerset = headerSet
  headerInfo.splitwords = splitWords
  headerInfo.delimiter = delimiter
  headerInfo.dataline = dataline
  return headerInfo
}

/**
*
* @method readFileStream
*
*/
FileParser.prototype.readFileStream = async function (fpath, headerSet) {
  // function readStream (fpath, headerSet, delimiter, startno) {
  return new Promise((resolve, reject) => {
    const results = []
    fs.createReadStream(fpath)
      .pipe(csv({ headers: headerSet.headerset, separator: headerSet.delimiter, skipLines: headerSet.dataline }))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results)
      })
  })
}

/**
*
* @method convertJSON
*
*/
FileParser.prototype.convertJSON = function (o, headerSet, results, source, newFilename) {
  const localthis = this
  let fileName = ''
  if (source !== 'web') {
    fileName = o.data[0].name
  } else {
    fileName = newFilename
  }
  const datacolumn = o.data[0].info.datename
  const flowList = []
  for (const rs of results) {
    // console.log(rs)
    let timeLength = 0
    // what length is date number?  Need to make ms time standard to convert
    if (rs[datacolumn].length === 10) {
      // console.log('not ms time add 000')
      timeLength = rs[datacolumn] * 1000
    } else {
      // console.log('assume ms time ')
      timeLength = rs[datacolumn]
    }
    const dateFormat = new Date(timeLength)
    // console.log(dateFormat)
    const msDate = dateFormat.getTime()
    // console.log(msDate)
    rs[datacolumn] = msDate / 1000
    flowList.push(rs)
  }
  const jsonFlow = JSON.stringify(flowList)
  let fileJSONbundle = {}
  fileJSONbundle.path = 'json'
  fileJSONbundle.name = fileName + '.json'
  fileJSONbundle.data = jsonFlow
  return fileJSONbundle
}

/**
* data protocol save
* @method saveFileProtocol
*
*/
FileParser.prototype.saveFileProtocol = function (o) {
  console.log('return to hyperspace protocol')
}


/**
* keep copy of source entering network library
* @method saveOriginalProtocol
*
*/
FileParser.prototype.saveOriginalProtocol = function (o) {
  // protocol should be to save original file to safeNetwork / IPFS etc. peers choice
  let newPathcsv = os.homedir() + this.storepath + '/csv/' + o.data.name
  if (o.data.web === 'weblocal') {
    const dataURI = o.data.path
    const dataCSV = atob(dataURI.split(',')[1])
    fs.writeFile(newPathcsv, dataCSV, function (err, data) {
      if (err) {
        return console.log(err)
      }
    })
  } else {
    fs.rename(o.data.path, newPathcsv, function (err) {
      if (err) throw err
      console.log('File Renamed.')
    })
  }
  return newPathcsv
}

/**
* keep copy of source entering network library from web
* @method saveOriginalProtocolWeb
*
*/
FileParser.prototype.saveOriginalProtocolWeb = function (o, data, fileNewName) {
  // protocol should be to save original file to safeNetwork / IPFS etc. peers choice
  let newPathcsv = os.homedir() + this.storepath + '/csv/' + fileNewName
  fs.writeFile(newPathcsv, data, function (err, data) {
    if (err) {
      return console.log(err)
    }
  })
  return newPathcsv
}

export default FileParser