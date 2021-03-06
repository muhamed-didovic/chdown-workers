// @ts-check
const fileSize = require('promisify-remote-file-size')
const { formatBytes } = require('./writeWaitingInfo');
const { createLogger, isCompletelyDownloaded } = require('./fileChecker');
const path = require('path')
const fs = require('fs-extra')
const Promise = require('bluebird')
const youtubedl = require("youtube-dl-wrap")
const colors = require('colors');

const pRetry = require('@byungi/p-retry').pRetry
// const pDelay = require('@byungi/p-delay').pDelay

const getFilesizeInBytes = filename => {
    return fs.existsSync(filename) ? fs.statSync(filename)["size"] : 0;
};

const download = (url, dest, {
    localSizeInBytes,
    remoteSizeInBytes,
    downFolder,
    logger,
    errorsLogger
}) => new Promise((resolve, reject) => {
    const videoLogger = createLogger(downFolder);
    // fs.removeSync(dest) // not supports overwrite..

    // console.log(`to be processed by youtube-dl... ${dest.split('/').pop()} Found:${localSizeInBytes}/${remoteSizeInBytes}`)
    const youtubeDlWrap = new youtubedl()
    let youtubeDlEventEmitter = youtubeDlWrap
        .exec([url, "-o", path.toNamespacedPath(dest)])
        /*.on("progress", (progress) => {
            ms.update(dest, { text: `Downloading: ${progress.percent}% of ${progress.totalSize} at ${progress.currentSpeed} in ${progress.eta} | ${dest.split('/').pop()} Found:${localSizeInBytes}/${remoteSizeInBytes}` })
        })*/
        // .on("youtubeDlEvent", (eventType, eventData) => console.log(eventType, eventData))
        .on("error", (error) => {
            errorsLogger.write(`${new Date().toISOString()} Error with url: ${url} ERROR: ${error.message}\n`);
            /*fs.unlink(dest, (err) => {
                return reject(error);
            });*/
            return reject(error);

        })
        .on("close", () => {
            logger.write(`End download ytdl: ${dest} compare L/R:${localSizeInBytes}/${remoteSizeInBytes} - Local in bytes:${formatBytes(getFilesizeInBytes(dest))} \n`);
            videoLogger.write(`${dest} Size:${getFilesizeInBytes(dest)}\n`);
            return resolve();
        })

});

const downloadVideo = async (url, dest, {
    localSizeInBytes,
    remoteSizeInBytes,
    downFolder,
    logger,
    errorsLogger
}) => {
    try {
        await pRetry(
            async () => await download(url, dest,
                {
                    localSizeInBytes,
                    remoteSizeInBytes,
                    downFolder,
                    logger,
                    errorsLogger
                }),
            {
                retries        : 3,
                onFailedAttempt: error => {
                    console.log(`Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`);
                    // 1st request => Attempt 1 failed. There are 4 retries left.
                    // 2nd request => Attempt 2 failed. There are 3 retries left.
                    // ???
                }
            })
    } catch (e) {
        console.log('eeee', e);
        //ms.remove(dest, { text: `Issue with downloading` });
        errorsLogger.write(`Issue with downloading:: ${e.message}\n`);
        //reject(e)
    }
}


/**
 * @param url
 * @param {import("fs").PathLike} dest
 * @param downFolder
 */
module.exports = async (url, dest, downFolder) => {
    url = encodeURI(url)
    const errorsLogger = await fs.createWriteStream(`errors.txt`, { flags: 'a' })
    const logger = await fs.createWriteStream(`sizes.txt`, { flags: 'a' })
    let isDownloaded = false;
    let remoteFileSize = 0;
    try {
        remoteFileSize = await fileSize(url); //await fileSize(encodeURI(url));
    } catch (err) {
        if (err.message === 'Received invalid status code: 404') {
            errorsLogger.write(`${new Date().toISOString()} ERROR WITH THE URL ${url}, Error message: ${err.message} \n`);
            return Promise.resolve();
        }
    }
    let localSize = getFilesizeInBytes(`${dest}`)
    let localSizeInBytes = formatBytes(getFilesizeInBytes(`${dest}`))
    isDownloaded = isCompletelyDownloaded(downFolder, dest)
    // console.log(`Checking ${localSizeInBytes}/${formatBytes(remoteFileSize)} isCompletelyDownloaded: ${isDownloaded} for ${dest}`);
    // ms.update(dest, { text: `Checking size over file: ${formatBytes(remoteFileSize)} isCompletelyDownloaded: ${isDownloaded} for ${dest}` });
    // fs.writeFileSync(`${dest}.json`, JSON.stringify(info, null, 2), 'utf8');
    // console.log(`locale/remote comparison:`, localSize , remoteFileSize,  isDownloaded);
    if (remoteFileSize === localSize || isDownloaded) {
        //ms.succeed(dest, { text: `Video already downloaded: ${dest.split('/').pop()} - ${localSizeInBytes}/${formatBytes(remoteFileSize)}` });
        // console.log(`Video already downloaded: ${dest.split('/').pop()} - ${localSizeInBytes}/${formatBytes(remoteFileSize)}`);
        // ms.remove(dest);
        // console.log(`Video already downloaded: ${dest.split('/').pop()} - ${localSizeInBytes}/${formatBytes(remoteFileSize)}`.blue);
        // downloadBars.create(100, 100, { eta: 0, filename: dest })
        return Promise.resolve();
    } else {
        logger.write(`${new Date().toISOString()} Compare materials: ${localSizeInBytes} - ${formatBytes(parseInt(remoteFileSize))}  => ${parseInt(localSize) === parseInt(remoteFileSize)} for file ${dest.split('/').pop()} of ${url} \n`);
        // ms.update(dest, { text: `${index} Start download video: ${dest.split('/').pop()} - ${localSizeInBytes}/${formatBytes(remoteFileSize)} ` });
        // console.log(`${index} Start ytdl download: ${dest.split('/').pop()} - ${localSizeInBytes}/${formatBytes(remoteFileSize)} `);
        return await download(url, dest, {
            localSizeInBytes,
            remoteSizeInBytes: formatBytes(remoteFileSize),
            downFolder,
            logger,
            errorsLogger
        });
    }
}

