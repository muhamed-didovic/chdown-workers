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
  --all, -a         Get all courses.
  --email, -e       Your email. 
  --password, -p    Your password.
  --directory, -d   Directory to save.
  --type, -t        source|course Type of download.
  --videos, -v      Include videos if available. 
  --subtitle, -s    Include subtitles if available.
  --zip, -z         Include archive if available.
  --code, -c        Include code if available.
  --lang, -l        Include courses of certain language ('en', 'ru' or 'both')
  --concurrency, -cc

Examples
    $ chdown-workers
    $ chdown-workers https://coursehunter.net/course/intermediate-typescript/ -t course
    $ chdown-workers [-e user@mail.com] [-p password] [-t source-or-course] [-d path-to-directory] [-cc concurrency-number]
```

## License

MIT
