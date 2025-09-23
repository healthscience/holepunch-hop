'use strict'
/**
*  standard time inputs
*
*
* @class TimeConvertor
* @package    holepunch-hop
* @copyright  Copyright (c) 2024 James Littlejohn
* @license    http://www.gnu.org/licenses/old-licenses/gpl-3.0.html
* @version    $Id$
*/
import EventEmitter from 'events'
import { DateTime, Interval } from 'luxon'
import * as chrono from 'chrono-node'

class TimeConvertor extends EventEmitter {

  constructor(options) {
    super()
  }

  /**
  * try to match to known time formats
  * @method testDataExtact
  *
  */
  testDataExtact = function (sampleDate) {
    console.log('time adopter')
    console.log(sampleDate)
    let parseDate0 = DateTime.fromISO(sampleDate)
    let parseDate1 = DateTime.fromHTTP(sampleDate)
    let parseDate2 = DateTime.fromJSDate(sampleDate)
    /* let parseDate3 = DateTime.fromFormat(sampleDate, "dd-MM-yyyy HH:MM")
    console.log(parseDate3)
    let parseDate4 = DateTime.local(sampleDate)
    console.log(parseDate4)
    // .fromJSDate(sampleDate) // .fromHTTP(sampleDate) //  fromFormat(sampleDate, "YYY-MM-DD ")  //.fromISO(sampleDate) // or DateTime. fromFormat("23-06-2019", "dd-MM-yyyy") .(splitRow[0])//  new Date(splitRow[0])
    // console.log(parseDate) */
    let millDate = parseDate2.toMillis()
    console.log(millDate)
    return millDate
  }

}

export default TimeConvertor