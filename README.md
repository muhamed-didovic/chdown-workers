# Download from coursehunter.net
[![npm](https://badgen.net/npm/v/chdown-workers)](https://www.npmjs.com/package/chdown-workers)

## Install
```sh
npm i -g chdown-workers
```

#### without Install
```sh
npx chdown-workers
```

## CLI
```sh
Usage
    $ chdown-workers <?CourseUrl|SourceUrl|CategoryUrl>

Options
    --email, -e         Your email.
    --password, -p      Your password.
    --directory, -d     Directory to save.
    --type, -t          source|course Type of download.
    --code, -c          Option to download code zip
    --zip, -z           Option to download source archive

Examples
    $ chdown-workers
    $ chdown-workers https://coursehunter.net/course/intermediate-typescript/ -t course
    $ chdown-workers -e user@gmail.com -p password -d path-to-directory -t source
```

## License
MIT
