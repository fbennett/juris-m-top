'use strict';

var fs = require('fs');
var path = require('path');
var lunr = require('lunr');
var yaml = require('js-yaml');
var marked = require('marked');
var scriptDir = path.dirname(require.main.filename);
var utils = require(path.join(scriptDir, 'lib', 'utils'));
var c = require(path.join(scriptDir, 'lib', 'siteConfig'));
var p = require(path.join(scriptDir, 'lib', 'sitePaths'));
var NewsEngine = require(path.join(scriptDir, 'lib', 'newsEngine'));
var nunjucks = require('nunjucks');
var contentPage = require(path.join(scriptDir, 'lib', 'contentPage'));

nunjucks.configure({
    lstripBlocks: true,
    trimBlocks: true
});
nunjucks.configure(p.templates, { autoescape: true });

var pagedirs = new p.getRelative(['events']);

var newsEngine = new NewsEngine();

newsEngine.setEntryFuncPre(function (rawEntry, params) {
    return rawEntry;
});

newsEngine.setSessionFunc(function (rawEntry, rawSession, seq, params) {
    rawSession.date = params.daterStart.humanDate;
    rawSession.startNews = params.daterStart.humanTime;
    rawSession.endNews = params.daterEnd.humanTime;
    rawSession.ymdDate = params.daterStart.ymdDate;
    return rawSession;
});

newsEngine.setEntryFuncPost(function (rawEntry, entrySessions, params) {
    if (rawEntry.category === "Event") {
        rawEntry.overview = marked(rawEntry.overview);
        if (!rawEntry.summary && rawEntry.presenter && rawEntry.title) {
            rawEntry.title = rawEntry.title.trim();
            var names = {
                loong: [],
                shrt: []
            }
            var presenters = rawEntry.presenter;
            for (var i=0,ilen=presenters.length;i<ilen;i++) {
                var longVer = [];
                var shortVer = [];
                var presenter = presenters[i];
                if (presenter.name) {
                    longVer.push(presenter.name);
                    shortVer.push(presenter.name);
                }
                if (presenter.post) {
                    longVer.push(presenter.post);
                }
                longVer = longVer.join(', ');
                shortVer = shortVer.join(', ');
                names.loong.push(longVer);
                names.shrt.push(shortVer);
            }
            for (var key of ["loong", "shrt"]) {
                var tail = names[key].slice(-2);
                tail = tail.join(' and ');
                var lead = names[key].slice(0, -2);
                lead.push(tail);
                names[key] = lead.join(', ');
            }
            rawEntry.names = names;
            rawEntry.labelPlural = false;
            if (!rawEntry.type) {
                rawEntry.type = " lecture";
            }
            rawEntry.type = rawEntry.type.replace(/s$/, '');
            rawEntry.isSingular = true;
            rawEntry.isPlural = false;
            rawEntry.isPluralLabel = false;
            rawEntry.isSingularLabel = false;
            rawEntry.label = rawEntry.type;
            if (entrySessions && "object" === typeof entrySessions && entrySessions.length) {
                rawEntry.category = "Event";
                var dates = {};
                for (var session of entrySessions) {
                    dates[session.ymdDate] = session.date;
                }
                var dateList = Object.keys(dates).map(function(key) {
                    return {
                        key: key,
                        date: dates[key]
                    }
                });
                dateList.sort(function(a,b){
                    if (a.key > b.key) {
                        return 1;
                    } else if (a.key < b.key) {
                        return -1;
                    } else {
                        return 0;
                    }
                });
                if (dateList.length > 1) {
                    rawEntry.isSingular = false;
                    rawEntry.isPlural = true;
                }
                rawEntry.sortDate = dateList[0].key;
                rawEntry.startDate = dateList[0].date;
                rawEntry.endDate = dateList[dateList.length - 1].date;
                if (entrySessions.length > 1) {
                    if (rawEntry.type.toLowerCase() !== 'workshop') {
                        rawEntry.label = rawEntry.type + "s";
                        rawEntry.isSingularLabel = true;
                    } else {
                        rawEntry.isSingularLabel = true;
                    }
                } else {
                    rawEntry.isSingularLabel = true;
                }
            }
        }
        rawEntry.summary = nunjucks.render("newsFeedSummary.atom", rawEntry);
        rawEntry.summaryMD = marked(rawEntry.summary);
        rawEntry.sessions = entrySessions;
    }
    return rawEntry;
});

newsEngine.setRunFunc(function (entries, sessions) {
    var events = [];
    var announcements = [];
    for (var entry of entries) {
        entry.toppath = pagedirs.toppath;
        var fileName = entry.fn + ".html";
        if (entry.category === "Event") {
            entry.pageTitle = "GSL Nagoya University: Event";
            var entryPage = nunjucks.render("newsItem.html", entry);
            fs.writeFileSync(path.join(p.builddir, 'events', fileName), entryPage);
            events.push(entry);
        } else {
            if (entry.deadline && entry.deadline.date) {
                var d = this.dater(entry.deadline.date);
                if (d) {
                    entry.deadline.date = d.humanDate;
                }
            }
            announcements.push(entry);
        }
    }

    for (var event of events) {
        event.sortDate = '9999-99-99';
        for (var key in event) {
            if (!key.match(/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]/)) continue;
            if (key < event.sortDate) {
                event.sortDate = key;
            }
        }
    }
    events.sort(function(a,b){
        if (a.sortDate > b.sortDate) {
            return -1;
        } else if (a.sortDate < b.sortDate) {
            return 1;
        } else {
            return 0;
        }
    });

    // Filter events older than one month from the front-page view
    var todayDate = new Date();
    todayDate.setDate(todayDate.getDate() - 30);
    var month = "" + (todayDate.getMonth()+1);
    while (month.length < 2) {
        month = "0" + month;
    }
    var day = "" + todayDate.getDay();
    while (day.length < 2) {
        day = "0" + day;
    }
    var today = todayDate.getFullYear()+"-"+month+"-"+day;
    var events = events.filter(function(elem, idx, arr){
        if (elem.sortDate >= today) {
            return true;
        } else {
            return false;
        }
    })

    var data = {
        embedEvents: {
            events: events
        },
        embedAnnouncements: {
            announcements: announcements
        }
    }
    var tmplPath = path.join(p.content, 'index.md');
    var tmpl = fs.readFileSync(tmplPath).toString();
    contentPage(tmpl, p.builddir, 'index.md', data);
});

module.exports = newsEngine;
