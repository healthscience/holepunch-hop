'use strict'
/**
*  Adapter utility for sqlite database
*
*
* @class SqliteAdapter
* @package    holepunch-hop
* @copyright  Copyright (c) 2024 James Littlejohn
* @license    http://www.gnu.org/licenses/old-licenses/gpl-3.0.html
* @version    $Id$
*/
import EventEmitter from 'events'
import sqlite3 from 'sqlite3'

class SqliteAdapter extends EventEmitter {

  constructor(options) {
    super()
    this.dataBase = {}
  }

  /**
  * setup new sqlite Database
  * @method newDatabase
  *
  */
  newDatabase = async function (db) {
    let newSqlite = {}
    this.createDbConnection(db)
     // ask for tables 
    let tables = await this.discoverTables()
    // let header = await this.discoverColumns()
    newSqlite.tables = tables
    // newSqlite.headers = header
    return newSqlite
  }

  /**
  * discover colum names in a table
  * @method tableQuery
  *
  */
  tableQuery = async function (data) {
    let newSqlite = {}
    this.createDbConnection(data.file)
     // ask for tables 
    let headers = await this.discoverColumns(data.table)
    newSqlite.headers = headers
    return newSqlite
  }

  /**
  * setup sqlite db and get tables and columns
  * @method createDbConnection
  *
  */
  createDbConnection = function (db) {
    this.dataBase = new sqlite3.Database(db, (error) => {
      if (error) {
        return console.error(error.message)
      }
    })
    console.log("Connection with SQLite has been established")
  }


  /**
  * setup sqlite db and get tables and columns
  * @method discoverTables
  *
  */
  discoverTables = async function () {
    // tables available
    let tables = []
    const res = await new Promise((resolve, reject) => {
      let sqlTable = `SELECT name FROM sqlite_master WHERE type='table'`

      this.dataBase.all(sqlTable, [], (err, rows) => {
      if (err) {
        reject(err)
      }
        rows.forEach((row) => {
	  tables.push(row)
        })
       resolve(tables)
      })
    })
    return res
  }

  /**
  * setup sqlite db and get tables and columns
  * @method discoverColumns
  *
  */
  discoverColumns = async function (table) {  
    // columns in table
    let header = []
    const res = await new Promise((resolve, reject) => {
	    let sqlTableCols = `PRAGMA table_info('` + table + `')`
	    this.dataBase.all(sqlTableCols, [], (err, rows) => {
	      if (err) {
		reject(err)
	      }
	      rows.forEach((row) => {
		      header.push(row)
	      })
	      resolve(header)
	    })
	})
    return res
  }

  /**
  * query a table for data
  * @method queryTable
  *
  */
  queryTable = async function (table) {
    // columns in table
    let data = []
    const res = await new Promise((resolve, reject) => {
	    let sqlQuery = `SELECT * FROM MI_BAND_ACTIVITY_SAMPLE WHERE DEVICE_ID = 3 ORDER BY TIMESTAMP DESC LIMIT 1400` // AND TIMESTAMP BETWEEN 1627677840 AND 1627678380`

	    this.dataBase.all(sqlQuery, [], (err, rows) => {
	      if (err) {
		reject(err)
	      }
	      rows.forEach((row) => {
		data.push(row)
	      })
	      resolve(data)
	    })
	})
    return res
  }

  /**
  * query device table
  * @method deviceQuery
  *
  */
  deviceQuery = async function (table) {
    let data = []
    const res = await new Promise((resolve, reject) => {
	    let sqlQuery = `SELECT * FROM ` + table

	    this.dataBase.all(sqlQuery, [], (err, rows) => {
	      if (err) {
		reject(err)
	      }
	      rows.forEach((row) => {
		data.push(row)
	      })
	      resolve(data)
	    })
	})
    return res
  }

}

export default SqliteAdapter