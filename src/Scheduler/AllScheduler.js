const Scheduler = require('./Scheduler')
const sanitize = require('sanitize-filename')
const fs = require('fs-extra')

module.exports = class AllScheduler extends Scheduler {

    async _parseNext(page, perPage) {

        let index = page - 1;
        let videoIndex = index*perPage
        if (this._courses.length === 1 && !this._courses[0].chapters[videoIndex]) {
            // this._page = videoIndex;
            return this._endParsing()

        }
        if (this._courses.length > 1 && !this._courses[index]) {
            return this._endParsing()
        }

        if (this._courses.length > 1) {
            await this.downAll(index);
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
        course?.chapters?.forEach((lesson, index) => {
            this.sanitizeAndDownload(course, index, downDir, lesson);
        })
    }

    async sanitizeAndDownload(course, index, downDir, lesson) {
        await fs.ensureDir(downDir)
        await Promise.all([
            (async () => {
                //download subtitle
                let subtitleName = sanitize(`${course.names[index]}.srt`)
                if (this._subtitle && course?.subtitles && course?.subtitles.length > 0 && !!course?.subtitles[index]) {
                    await this._downLessonSubtitle(course.subtitles[index], downDir, subtitleName)
                }
            })(),
            (async () => {
                //download video
                let filename = sanitize(`${course.names[index]}.mp4`)
                await this._downLessonVideo(lesson, downDir, filename)
            })(),
            (async () => {
                //download notes
                if (course.notes.length > 0) {
                    await this._downNotes(course, downDir)
                }
            })(),
        ])
    }
}
