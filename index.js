#!/usr/bin/env node

// const ora = (await import('ora')).default;
// const { default: Worker } = require('jest-worker')

const { Worker: JestWorker } = require('jest-worker');
const { range } = require('lodash')
const scrape = require('ch-scrape');
const prompt = require('./cli')
const { Client, AllScheduler, ArchiveScheduler } = require('./src')

const ora = require("ora");
const logger = ora();
//const concurrency = Math.min(8, cpus)//8

(async () => {
    let workers;
    try {

        let inputs = await scrape.prompt();

        //get local file if user want
        let json = await prompt(inputs);
        console.log('inputs', inputs);

        if (!Object.keys(json).length) {
            //get input from ch-scrape

            //get courses in json from ch-scrape package
            const c = ora('get courses from ch-scrape..').succeed()
            // let json = await scrape.run({ url, email, password, downDir, type, subtitle })
            json = await scrape.run(inputs)
            c.succeed('get courses done')
        }

        //prepare workers
        workers = new JestWorker(require.resolve('./src/worker'), { numWorkers: inputs.concurrency });
        const client = new Client()

        //const loginMsg = ora('attempting login..').start()
        //let token = await client.attemptLogin(email, password)
        /*if (!await client.attemptLogin(email, password)) {
          return loginMsg.fail('login failed. plz correct email, password.')
        }*/
        //loginMsg.succeed('login success.')

        // for worker
        const initMsg = ora(`preparing workers with concurrency: ${inputs.concurrency}..`).start()

        await Promise.all(
            range(inputs.concurrency)
                .map(_ => workers.init({
                    saved    : client.save(),
                    baseDir  : inputs.downDir, //path.resolve(process.cwd(), 'videos/')
                    overwrite: true
                }))
        )

        initMsg.succeed('wake up workers.')

        if (json?.courses.length === 0) {
            throw new Error('No courses found!!!')
        }

        //videos download
        if (inputs.videos) {
            const lessonMsg = ora('start videos download..').start()
            const scheduler = new AllScheduler(workers, { ...json, perPage: 1, ...inputs })
            const interval = setInterval(async _ => {
                const stats = scheduler.stats
                lessonMsg.text = `videos downloading.. [${stats.completed}/${stats.totals}] -`// Course: ${stats?.video.join(', ')} Concurrency ${stats.page}
            }, 250)
            const count = await scheduler.run()
            clearInterval(interval)
            lessonMsg.succeed(`complete lesson download.. (${count})`)
        }

        // code and archive download
        if (inputs.code || inputs.zip) {
            const codeMsg = ora('start archive zip download..').start()
            const scheduler = new ArchiveScheduler(workers, { ...json, perPage: 1, ...inputs })

            const interval = setInterval(_ => {
                const stats = scheduler.stats
                codeMsg.text = `code and archive downloading.. [${stats.completed}/${stats.totals}]`
            }, 250)

            const count = await scheduler.run()
            clearInterval(interval)

            codeMsg.succeed(`complete zip download.. (${count})`)
        }

        logger.succeed('All done!! good bye~')
    } catch (err) {
        console.error('MAIN ERROR:', err);
        logger.fail('unknown error occurred! T-T')
        process.exit(1)
    } finally {
        await workers.end()
    }
})()
