'use strict';

var fs = require('fs');
var path = require('path');
var yaml = require('js-yaml');
var marked = require('marked');
var scriptDir = path.dirname(require.main.filename);
var utils = require(path.join(scriptDir, 'lib', 'utils'));
var c = require(path.join(scriptDir, 'lib', 'siteConfig'));
var p = require(path.join(scriptDir, 'lib', 'sitePaths'));
var NewsEngine = require(path.join(scriptDir, 'lib', 'newsEngine'));
var nunjucks = require('nunjucks');

nunjucks.configure({
    lstripBlocks: true,
    trimBlocks: true
});
nunjucks.configure(p.templates, { autoescape: true });

var newsEngine = new NewsEngine();

/*
 * title
 * updated
 * author.name
 * category
 * contributors (name)
 * rights
 * subtitle
 * entry.names.shrt
 * entry.sessions
 *   session.date
 *   session.startNews
 *   session.endNews
 *   session.title
 *   session.place
 * entry.title
 * entry.category
 * entry.id * entry.updated
 * entry.overview (html)

 * entry.fn
 * entry.summary
 * entry.summaryMD (html)
 */

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
            rawEntry.isPlural = false;
            rawEntry.isPluralLabel = false;
            rawEntry.isSingular = false;
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
    var data = {
        title: c.siteTitle,
        subtitle: "Announcements and news of upcoming events",
        author: {
            name: c.siteMaintainer
        },
        category: [
            "Events",
            "Announcements"
        ],
        contributors: null,
        rights: c.rights,
        selfLink: c.urlBase + '/news.atom'
    };
    var updated = null;
    for (var entry of entries) {
        if (!updated || entry.updated > updated) {
            updated = entry.updated;
        }
    }
    data.updated = updated;
    entries.sort(function(a,b){
        if (a.sortDate > b.sortDate) {
            return 1;
        } else if (a.sortDate < b.sortDate) {
            return -1;
        } else {
            return 0;
        }
    });
    data.entries = entries;
    var feed = nunjucks.render("newsFeed.atom", data);
    fs.writeFileSync(path.join(p.builddir, 'news.atom'), feed);
});

module.exports = newsEngine;

