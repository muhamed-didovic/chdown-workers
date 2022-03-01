const Scheduler = require('./Scheduler')
const sanitize = require('sanitize-filename')
const fs = require("fs-extra");

module.exports = class ArchiveScheduler extends Scheduler {

  async _parseNext(page, perPage) {
    // console.log('this._courses', this._courses.length);

    let index = page - 1;
    let archiveIndex = index*perPage

    // console.log('archiveIndex', archiveIndex);
    if (this._courses.length === 1 && !this._courses[0].urlMaterials[archiveIndex]) {
      return this._endParsing()

    }
    if (this._courses.length > 1 && !this._courses[index]) {
      return this._endParsing()

    }

    let course = this._courses.length === 1 ? this._courses[0] : this._courses[index]
    const downDir = this.getLastSegment(course.url)

    if (this._courses.length === 1){
      await this._downLessonArchive(course.urlMaterials[archiveIndex], downDir)
    } else {
      //download materials like code or zip archive of course
      course.urlMaterials.forEach((url) => this._downLessonArchive(url, downDir))
      /*if (course.urlMaterials.length) {
        course.urlMaterials.forEach((url) => this._downLessonArchive(url, downDir))
      }*/
    }
  }

}
