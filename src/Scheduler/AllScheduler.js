const Scheduler = require('./Scheduler')
const sanitize = require('sanitize-filename')
const { curry } = require("lodash");

module.exports = class AllScheduler extends Scheduler {

  async _parseNext(page, perPage) {

    let index = page - 1;
    let videoIndex = index*perPage
    if (this._courses.length === 1 && !this._courses[0].chapters[videoIndex]) {
      return this._endParsing()

    }
    if (this._courses.length > 1 && !this._courses[index]) {
      return this._endParsing()
    }

    if (this._courses.length > 1) {
      this.downAll(index);
    } else {
      await this.downOne(videoIndex);
    }
  }

  async downOne(videoIndex) {
    const course = this._courses[0]
    const downDir = this.getLastSegment(course.url)
    let url = course.chapters[videoIndex]
    await this.sanitizeAndDownload(course, videoIndex, downDir, url);
  }

  async downAll(index) {
    const course = this._courses[index]
    const downDir = this.getLastSegment(course.url)
    course.chapters.forEach((lesson, index) => {
      this.sanitizeAndDownload(course, index, downDir, lesson);
    })
  }

  async sanitizeAndDownload(course, index, downDir, lesson) {
    let filename = sanitize(`${course.names[index]}.mp4`)
    let subtitleName = sanitize(`${course.names[index]}.srt`)

    //download subtitle
    if (this._subtitle && course?.subtitles && course?.subtitles.length > 0 && !!course?.subtitles[index]) {
      await this._downLessonSubtitle(course.subtitles[index], downDir, subtitleName)
    }

    //download video
    await this._downLessonVideo(lesson, downDir, filename)
  }
}
