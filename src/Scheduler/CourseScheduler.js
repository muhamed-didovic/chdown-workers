const Scheduler = require('./Scheduler')
const sanitize = require('sanitize-filename')

module.exports = class CourseScheduler extends Scheduler {

    async _parseNext(page, perPage) {

        let index = page - 1;
        let videoIndex = index*perPage


        if (!this._json.courses[0].chapters[videoIndex]) {
            return this._endParsing()
        }

        const course = this._json.courses[0]
        const downDir = this.getLastSegment(course.url)
        let url = course.chapters[videoIndex]
        let filename = sanitize(`${course.names[videoIndex]}.mp4`)
        let subtitleName = sanitize(`${course.names[videoIndex]}.srt`)
        // console.log('video', video, 'filename', filename, '!!course.subtitles[videoIndex]', !!course.subtitles[videoIndex]);

        //download subtitle
        if (!!course.subtitles[videoIndex] && this._subtitle) {
            // console.log('subtitle: ', course.subtitles[videoIndex]);
            await this._downLessonSubtitle(course.subtitles[videoIndex], downDir, subtitleName)
        }

        await this._downLessonVideo(url, downDir, filename)
    }

}
