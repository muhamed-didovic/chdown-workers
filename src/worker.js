const autobind = require('auto-bind')
const fs = require('fs-extra')
const Client = require("./Client");
const path = require("path");
const ytdl = require('ytdl-run')

class Worker {
    constructor() {
        this._client = null
        this._overwrite = true
        this._baseDir = null

        autobind(this)
    }

    init({ saved, overwrite, baseDir }) {
        this._client = Client.restore(saved)
        this._overwrite = overwrite
        this._baseDir = baseDir
    }

    getLessons(page, perpage, json) {
        return this._client.getLessons(page, perpage, json)
    }

    async downArchive(url, downDir, codeFlag, zipFlag) {
        let fileName = url.split('/');
        fileName = (fileName.includes('materials') ? 'code-' : '') + fileName[fileName.length - 1];
        downDir = path.join(this._baseDir, downDir)

        // const downPath = path.join(downDir, fileName)
        await fs.ensureDir(downDir)

        try {
            await this._client.downArchive(url.replace('//vsss', '//vss'), downDir, fileName, codeFlag, zipFlag)
        } catch (err) {
            throw err
        }
    }

    async downSubtitleFile(url, downDir, fileName) {
        downDir = path.join(this._baseDir, downDir)
        const downPath = path.join(downDir, fileName)
        await fs.ensureDir(downDir)

        try {
            await this._client.downSubtitle(url, downPath)
        } catch (err) {
            throw err
        }
    }

    async downLessonVideo(url, downDir, fileName) {//{ signedUrl, mpdUrl }
        // const pathLogger = await fs.createWriteStream(`path.txt`, { flags: 'a' })
        // pathLogger.write(`Path for fileName: ${fileName}, downDir: ${downDir}, _baseDir: ${this._baseDir}\n`)

        downDir = path.join(this._baseDir, downDir)
        const downPath = path.join(downDir, fileName)

        //if (!this._overwrite && await fs.pathExists(downPath)) return

        await fs.ensureDir(downDir)
        // const videoLogger = await fs.createWriteStream(`${downDir}${path.sep}videos.txt`, { flags: 'a' }) //fs.ensureFile(`${downDir}${path.sep}videos.txt`)
        // const logger = await fs.createWriteStream(`${downDir}${path.sep}logger.txt`, { flags: 'a' })

        /*if (await findNotExistingVideo(logger, fileName, downDir)) {
          logger.write(`File exist in logger: ${fileName}\n`)
          return
        }*/

        try {
            // videoLogger.write(`signedUrl: ${signedUrl} - mpdUrl ${mpdUrl}\n`);
            // if (!signedUrl) throw new Error('to be processed by youtube-dl..')
            if (!url) throw new Error('No url provided..')
            // videoLogger.write(`1Prosli smo exception\n`);
            await this._client.downVideoBySigned(url, downDir, fileName)

            // logger.write(`Downloaded normally, file: ${fileName}\n`)
        } catch (err) {
            //await fs.remove(downPath) // not supports overwrite..
            //await ytdl([mpdUrl, '-o', path.toNamespacedPath(downPath)])
            // videoLogger.write(`${fileName}\n`);
            // logger.write(`Downloaded over ytdl, file: ${fileName}\n`)
            throw err
        }
    }
}

module.exports = new Worker()
