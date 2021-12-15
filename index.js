#!/usr/bin/env node

// const ora = (await import('ora')).default;
// const { default: Worker } = require('jest-worker')

const path = require('path')
const { Worker: JestWorker } = require('jest-worker');
const { range } = require('lodash')
// const fs = require("fs-extra")
const ora = require("ora");
const prompts = require("prompts");
const isValidPath = require("is-valid-path");
const meow = require("meow");
const scrape = require('ch-scrape');
const { CookieJar } = require("tough-cookie");

const { Client, AllScheduler, ArchiveScheduler } = require('./src')

const cpus = require('os').cpus().length
const logger = ora()
//const concurrency = Math.min(8, cpus)//8
// console.log('concurrency', concurrency);


/**
 * @param {Omit<import('prompts').PromptObject, 'name'>} question
 */
async function askOrExit(question) {
  const res = await prompts({ name: 'value', ...question }, { onCancel: () => process.exit(1) })
  return res.value
}

const cli = meow(`
    Usage
      $ coursehunters <?courseUrl>

    Options
      --email, -e 
      --password, -p
      --directory, -d
      --type, -t  source|course
      --code, -c 
      --zip, -z
      --concurrency, -c
      
    Examples
      $ coursehunters
      $ coursehunters test.json
      $ coursehunters -e user@gmail.com -p password -d path-to-directory -t source
`, {
  flags: {
    email      : {
      type : 'string',
      alias: 'e'
    },
    password   : {
      type : 'string',
      alias: 'p'
    },
    directory  : {
      type : 'string',
      alias: 'd'
    },
    type       : {
      type : 'string',
      alias: 't'
    },
    code       : {
      type   : 'boolean',
      alias  : 'c',
      default: true
    },
    zip        : {
      type   : 'boolean',
      alias  : 'z',
      default: false
    },
    concurrency: {
      type   : 'number',
      alias  : 'c',
      default: Math.min(8, cpus)
    },

  }
})

async function prompt({
  url = '',
  email = '',
  password = '',
  downDir = '',
  type = '',
  code = '',
  zip = '',
  subtitle = ''
}) {
  const { flags, input } = cli
  flags.directory = downDir;

  if (input.length === 0) {
    input.push(await askOrExit({
      type   : 'text',
      message: `Enter a reference file to scrape from (eg: ${path.resolve(process.cwd())}): `,
      //initial: './frontendmasters.json'
      initial: 'https://coursehunter.net/source/frontendmasters'
    }))
  }

  email = flags.email || await askOrExit({
    type    : 'text',
    message : 'Enter email',
    validate: value => value.length < 5 ? `Sorry, enter correct email` : true
  })

  password = flags.password || await askOrExit({
    type    : 'text',
    message : 'Enter password',
    validate: value => value.length < 5 ? `Sorry, password must be longer` : true
  })

  downDir = flags.directory || path.resolve(await askOrExit({
    type    : 'text',
    message : `Enter a directory to save (eg: ${path.resolve(process.cwd())})`,
    initial : path.resolve(process.cwd(), 'videos/'),
    validate: isValidPath
  }))

  code = await askOrExit({
    type    : 'toggle',
    name    : 'value',
    message : 'Download code if it exists?',
    initial : flags.code,
    active  : 'yes',
    inactive: 'no'
  })

  zip = await askOrExit({
    type    : 'toggle',
    name    : 'value',
    message : 'Download archive of the course if it exists?',
    initial : flags.zip,
    active  : 'yes',
    inactive: 'no'
  })
  return { url: input[0], email, password, downDir, type, code, zip, concurrency: flags.concurrency, subtitle };
}

(async () => {
  let workers;
  try {
    //get input from ch-scrape
    let inputs = await scrape.prompt();
    const { url, email, password, downDir, type, code, zip, concurrency, subtitle } = await prompt(inputs);

    //get courses in json from ch-scrape package
    const c = ora('get courses from ch-scrape..').succeed()
    let json = await scrape.run({ url, email, password, downDir, type, subtitle })
    c.succeed('get courses done')

    //prepare workers
    workers = new JestWorker(require.resolve('./src/worker'), { numWorkers: concurrency });
    const client = new Client()

    //const loginMsg = ora('attempting login..').start()
    //let token = await client.attemptLogin(email, password)
    /*if (!await client.attemptLogin(email, password)) {
      return loginMsg.fail('login failed. plz correct email, password.')
    }*/
    //loginMsg.succeed('login success.')

    // for worker
    const initMsg = ora(`preparing workers with concurrency: ${concurrency}..`).start()

    await Promise.all(
      range(concurrency)
        .map(_ => workers.init({
          saved    : client.save(),
          baseDir  : downDir, //path.resolve(process.cwd(), 'videos/')
          overwrite: true
        }))
    )

    initMsg.succeed('wake up workers.')

    if (json?.courses.length === 0) {
      throw new Error('No courses found!!!')
    }

    const lessonMsg = ora('start videos download..').start()
    //let filteredJson = json.courses.filter(course => !course?.done)

    const scheduler = new AllScheduler(workers, { concurrency, json, perPage: 1, subtitle })

    const interval = setInterval(async _ => {
      const stats = scheduler.stats
      lessonMsg.text = `videos downloading.. [${stats.completed}/${stats.totals}] -`// Course: ${stats?.video.join(', ')} Concurrency ${stats.page}
    }, 250)

    const count = await scheduler.run()
    clearInterval(interval)
    lessonMsg.succeed(`complete lesson download.. (${count})`)

    // code zip download
    if (code || zip) {
      const codeMsg = ora('start archive zip download..').start()
      const scheduler = new ArchiveScheduler(workers, { concurrency, json, perPage: 1, subtitle, code, zip })

      const interval = setInterval(_ => {
        const stats = scheduler.stats
        codeMsg.text = `code zip downloading.. [${stats.completed}/${stats.totals}]`
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
