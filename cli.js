const path = require('path')
const prompts = require("prompts");
const isValidPath = require("is-valid-path")
const meow = require("meow")
const fs = require("fs-extra")
const cpus = require('os').cpus().length

/**
 * @param {Omit<import('prompts').PromptObject, 'name'>} question
 */
async function askOrExit(question) {
    const res = await prompts({ name: 'value', ...question }, { onCancel: () => process.exit(1) })
    return res.value
}

const folderContents = async (folder) => {
    const options = [];
    await fs.readdir(folder, function (err, files) {
        //handling error
        if (err) {
            return console.log('Unable to scan directory: ' + err);
        }
        //listing all files using forEach
        files.forEach(function (file) {
            options.push({
                title: file,
                value: path.join(folder, file)
            });
        });
    });
    return options;
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
      $ coursehunters -e user@gmail.com -p password -d path-to-directory -t source`, {
    flags: {
        email      : { type: 'string', alias: 'e' },
        password   : { type: 'string', alias: 'p' },
        directory  : { type: 'string', alias: 'd' },
        type       : { type: 'string', alias: 't' },
        code       : { type: 'boolean', alias: 'c', default: true },
        zip        : { type: 'boolean', alias: 'z', default: false },
        concurrency: { type: 'number', alias: 'c', default: Math.min(8, cpus) },

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

    const fileChoices = await folderContents(path.resolve(process.cwd(), 'json'))
    const file = await askOrExit({
        type   : 'confirm',
        message: 'Do you want download from a file',
        initial: false
    })

    const filePath = await askOrExit({
        type    : file ? 'autocomplete' : null,
        message : `Enter a file path eg: ${path.resolve(process.cwd(), 'json/*.json')} `,
        choices : fileChoices,
        validate: isValidPath
    })

    return {
        ...(filePath && { courses: require(filePath) }),
        ...(filePath && { fileName: path.resolve(filePath) })
    };
    /*const { flags, input } = cli
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
    return { url: input[0], email, password, downDir, type, code, zip, concurrency: flags.concurrency, subtitle };*/
}

module.exports = prompt;
