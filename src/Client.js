const { CookieJar } = require('tough-cookie')
const jarGot = require('jar-got')
const fs = require('fs-extra')
const path = require("path");
const cheerio = require('cheerio')
const json2md = require("json2md");

const downOverYoutubeDL = require("./helpers/downOverYoutubeDL")

const Bluebird = require('bluebird')
Bluebird.config({ longStackTraces: true })
global.Promise = Bluebird;

module.exports = class Client {
    static restore(saved) {
        return new Client(jarGot(CookieJar.deserializeSync(saved)))
    }

    constructor(got = jarGot()) {
        this._got = got
    }

    save() {
        return this._got.jar.serializeSync()
    }

    formatBytes = (bytes, decimals) => {
        if (bytes == 0) return '0 Bytes';
        let k     = 1024,
            dm    = decimals || 2,
            sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
            i     = Math.floor(Math.log(bytes)/Math.log(k));
        return parseFloat((bytes/Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    getFilesizeInBytes(filename) {
        return fs.existsSync(filename) ? fs.statSync(filename)["size"] : 0;
    }

    getLastSegment(url) {
        let parts = url.split('/');
        return parts.pop() || parts.pop(); // handle potential trailing slash
    };

    async attemptLogin(email, pwd) {

        const put = await this._got('https://coursehunter.net/api/auth/login', {
            'method': 'PUT',
            headers : {
                // "Cookie": "user_ident=4921da7b-0a69-4195-a1a5-0fca92fabbb6; CHUNTERS=bmfj3ul4051ba6rso310hiapak; accessToken=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiIsImp0aSI6IjRmMWcyM2ExMmFhIn0.eyJpc3MiOiJodHRwczpcL1wvY291cnNlaHVudGVyLm5ldCIsImF1ZCI6Imh0dHBzOlwvXC9jb3Vyc2VodW50ZXIubmV0IiwianRpIjoiNGYxZzIzYTEyYWEiLCJpYXQiOjE2MzY2NDQ5ODcsIm5iZiI6MTYzNjY0NTA0NywiZXhwIjoxNjM3MjQ5Nzg3LCJ1c2VyX2lkIjoiMjIwODMiLCJlX21haWwiOiJhYmhhZ3NhaW5AZ21haWwuY29tIn0.P-RJYUa2s2-lN9uuKxhWOUVQUgK8NUBcJ3d7vEnML_M; ch_quiz=a1d2bae713d864293b9220dc291dc3fe",
                'Content-Type': 'application/json',
            },
            body    : JSON.stringify({ 'e_mail': email, 'password': pwd })
        })
        // if login succeeds, it redirects.
        return put.statusCode === 302

        /*if (put.statusCode !== 200) {
          throw new Error('no 200 from response ')
        }
        return put.headers['set-cookie'][0] + '; accessToken=' + JSON.parse(put.body).token*/


        /*let res = await axios({
          url    : 'https://coursehunter.net/api/auth/login',
          method : 'put',
          headers: {
            'content-type'               : 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          data   : JSON.stringify({ e_mail: e_mail, password: password }),
        })

        if (res.data.token) return res.headers['set-cookie'][0] + '; accessToken=' + res.data.token;
        else throw new Error('not token from response ')*/
    }

    async getCourseId(course) {
        const { body } = await this._got(course.url)
        const $ = cheerio.load(body);
        return $('form input[name="course_id"]').attr("value")
    };

    async getLessons(page = 1, perPage = 10, json) {
        const courses = json

        if (!courses[page - 1]) {
            return []
        }

        const course = courses[page - 1];
        let courseId = await this.getCourseId(course)
        const { body: seriesList } = await this._got(`https://coursehunter.net/course/${courseId}/lessons`, { json: true })//&page=${page}&per_page=${perPage}

        return [{
            label  : course?.second_title,
            slug   : this.getLastSegment(course.url),
            lessons: formatLessons(seriesList)
        }]
    }

    async downArchive(url, downDir, fileName, codeFlag, zipFlag) {
        const downPath = path.join(downDir, fileName);

        if ((!codeFlag && url.includes('code')) || (!zipFlag && !url.includes('code'))) {//(parseInt(localFileSize) === parseInt(remoteFileSize)) ||
            //resolve()
            return Promise.resolve();
        } else {
            return await downOverYoutubeDL(url, downPath, downDir)
        }

    }

    async downNotes(course, downDir) {
        // await fs.ensureDir(downDir)
        const md = json2md([
            { h1: "Resources " },
            {
                link: [
                    ...(course.notes &&
                        [course.notes.map(c => ({
                            'title' : c.link,
                            'source': c.link
                        }))]
                    )
                ]
            }
        ])
        await fs.writeFile(path.join(downDir, `${course.url.split('/').pop()}.md`), md, 'utf8')//-${Date.now()}
    }

    async downSubtitle(signedUrl, downPath) {
        const response = await this._got.head(signedUrl)

        let localFileSize = this.getFilesizeInBytes(downPath);
        let remoteFileSize = response?.headers['content-length'] ?? 0

        const videoLogger = await fs.createWriteStream(`sizes_subtitle.txt`, { flags: 'a' })

        return new Promise((resolve, reject) => {
            videoLogger.write(`${new Date().toISOString()} Compare: ${this.formatBytes(parseInt(localFileSize))} - ${this.formatBytes(parseInt(remoteFileSize))}  => ${parseInt(localFileSize) === parseInt(remoteFileSize)} for file ${downPath} of ${signedUrl} \n`);
            if (parseInt(localFileSize) === parseInt(remoteFileSize)) {
                resolve()
            } else {
                this._got
                    .stream(signedUrl)
                    .on('error', err => {
                        reject(err)
                    })
                    .on('response', (resp) => {

                        if (parseInt(resp.statusCode) !== 404) {
                            /*videoLogger.write(`subtitle downloaded for ${signedUrl}\n`);
                            this._got.pipe(fs.createWriteStream(downPath));//`${downloadFolder}${path.sep}${videoName}.srt`//.vtt*/
                        } else {
                            reject()
                            //throw new Error (`Subtitle does not exist: ${downPath}`)
                            //ora(`Subtitle does not exist: ${downloadFolder}${path.sep}${videoName}.srt`).fail()
                        }

                    })
                    .pipe(fs.createWriteStream(downPath))
                    .on('error', reject)
                    .on('finish', resolve)

            }
        })
    }

    async downVideoBySigned(url, downDir, fileName) {
        const downPath = path.join(downDir, fileName)
        return await downOverYoutubeDL(url, downPath, downDir)
    }
}

function formatLessons(lessons) {
    return lessons
        .filter(lesson => lesson && lesson.file)
        .map((lesson, i) => {
            console.log('222222');
            const str = lesson.title.replace(
                /\s\|\s\d{2}:\d{2}:\d{2}/g,
                ""
            );
            const match = str.match(/\d+\.\s.*/g);
            return {
                order    : i + 1,
                id       : lesson.id,
                slug     : match && match.length ? match[0].toString() : str.toString(),
                mpdUrl   : lesson.file,
                signedUrl: lesson.file
            }
        })
}
