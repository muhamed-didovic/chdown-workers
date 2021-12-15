const { range } = require('lodash')
// const Defer = require('p-state-defer').default
const { Deferred } = require('p-state-defer')

module.exports = class Scheduler {
  constructor(workers, { concurrency, json, perPage = 10, subtitle = false, code = false, zip = false } = {}) {
    this._workers = workers
    this._concurrency = concurrency
    this._json = json

    //flags for different options
    this._subtitle = subtitle
    this._code = code
    this._zip = zip

    // for parsing
    this._perPage = perPage
    this._page = 0
    this._parsedPages = 0
    this._endPage = false

    // for stats
    this._completed = 0
    this._totals = 0
    this._deffer = new Deferred()
  }

  get stats() {
    return {
      completed: this._completed,
      totals   : this._totals,
      page     : this._page
    }
  }

  /*async run () {
    for (const _ of range(this._concurrency)) {
      await this._next();
    }
    return this._deffer.promise
  }*/
  run() {
    range(this._concurrency).forEach(_ => this._next())
    return this._deffer.promise
  }

  async _next() {
    try {
      await this._parseNext(++this._page, this._perPage)
      this._parsedPages++
      this._endPage ? this.resolveIfDone() : this._next()
    } catch (err) {
      this._deffer.reject(err)
    }
  }

  resolveIfDone() {
    if (this._endPage
      && this._page === this._parsedPages
      && this._totals === this._completed) {
      this._deffer.resolve(this._completed)
    }
  }

  _parseNext() {
    throw new Error('needs implement!')
  }

  _endParsing() {
    if (!this._endPage) this._endPage = true
  }

  async _downLessonVideo(url, downDir, fileName) {//{ signedUrl, mpdUrl }
    this._totals++
    await this._workers.downLessonVideo(url, downDir, fileName)//{ signedUrl, mpdUrl }
    this._completed++
    this.resolveIfDone()
  }

  async _downLessonSubtitle(subtitle, downDir, subtitleName) {
    await this._workers.downSubtitleFile(subtitle, downDir, subtitleName)
  }

  async _downLessonArchive(url, downDir) {
    this._totals++
    await this._workers.downArchive(url, downDir, this._code, this._zip)
    this._completed++
    this.resolveIfDone()
  }

  getLastSegment(url) {
    let parts = url.split('/');
    return parts.pop() || parts.pop(); // handle potential trailing slash
  }
}
