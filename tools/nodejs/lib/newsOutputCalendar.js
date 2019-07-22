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

function icsFixes(calendarICS) {
    calendarICS = calendarICS.split(/(\r\n|\r|\n)/)
        .map(function(s) { return s.replace(/^\s*|\s*$/, ""); })
        .filter(function(x) { return x; });
    for (var i=calendarICS.length-1;i>-1;i--) {
        if (calendarICS[i].length > 75) {
            var line = calendarICS[i];
            var buffer = [line.slice(0, 75)];
            line = line.slice(75);
            while (line.length > 0) {
                buffer.push(" " + line.slice(0, 75));
                line = line.slice(75);
            }
            calendarICS = calendarICS.slice(0, i).concat(buffer).concat(calendarICS.slice(i + 1))
        }
    }
    calendarICS = calendarICS.join('\r\n');
    return calendarICS;
}

newsEngine.setEntryFuncPre(function (rawEntry, params) {
    if (rawEntry.category === "Event") {
        for (var key of ["author", "presenter"]) {
            if ("string" === typeof rawEntry[key]) {
                rawEntry[key] = {
                    name: rawEntry[key]
                }
            }
            if (key === "author" && !rawEntry[key].email) {
                rawEntry[key].email = "tomoe.ogaki@law.nagoya-u.ac.jp"
            }
        }
        rawEntry.presenter = utils.makeList(rawEntry.presenter);
        if (rawEntry.presenter.length == 1) {
            rawEntry.calPresenter = rawEntry.presenter[0].name;
        } else if (rawEntry.presenter.length > 1) {
            rawEntry.calPresenter = rawEntry.presenter[0].name + ' et al.';
        }
        rawEntry.overview = marked(rawEntry.overview);
        //rawEntry.url = c.urlBase + '/news/' + rawEntry.id.replace(/^[^:]+:[^:]+:(.*)$/, '$1') + '.html';
    }
    return rawEntry;
});

newsEngine.setSessionFunc(function(rawEntry, rawSession, seq, params){
    var calSummary = [rawEntry.calPresenter];
    if (rawEntry.sessions.length > 1) {
        calSummary.push("Session " + seq)
    }
    calSummary = calSummary.concat([rawSession.title]).join(": ");
    rawSession.calSummary = calSummary;
    var ret = {
        authorName: rawEntry.author.name,
        authorEmail: rawEntry.author.email,
        url: rawEntry.url,
        startCal: params.daterStart.utcCalendarTime,
        endCal: params.daterEnd.utcCalendarTime,
        calSummary: rawSession.calSummary,
        place: rawSession.place,
        id: rawSession.id,
        created: rawSession.id.replace(/^.*reg-([^\-]+)-.*$/, '$1'),
        'last-modified': rawSession['last-modified']
    }
    return ret;
});

newsEngine.setEntryFuncPost(function(rawEntry, entrySessions, params) {
    if (entrySessions.length > 1) {
        for (var session of entrySessions) {
            session.description = "This is one session of the " + rawEntry.type + " \"" + rawEntry.title + "\"";
        }
    }
    rawEntry.sessions = entrySessions;
    var calendarPage = nunjucks.render("eventsCalendar.ics", { sessions: entrySessions });
    calendarPage = icsFixes(calendarPage);
    fs.writeFileSync(path.join(p.builddir, 'events', rawEntry.fn + '.ics'), calendarPage);
    return rawEntry;
});

newsEngine.setRunFunc(function(entries, sessions) {
    sessions.sort(function(a,b){
        if (a.calStart < b.calStart) {
            return -1;
        } else if (a.calStart > b.calStart) {
            return 1;
        } else {
            return 0;
        }
    });
    // event calendar
    var events = [];
    for (var session of sessions) {
        if (session.deadline) continue;
        var calendarPage = nunjucks.render("eventsCalendar.ics", { sessions: sessions });
        calendarPage = icsFixes(calendarPage);
        fs.writeFileSync(path.join(p.builddir, 'events.ics'), calendarPage);
    }
    // announcement calendar
    var announcements = [];
    for (var entry of entries) {
        if (entry.deadline && entry.deadline.id) {
            announcements.push({
                id: entry.deadline.id,
                "last-modified": entry.updated,
                startCalDate: entry.deadline.date.replace(/\-/g, ""),
                endCalDate: entry.deadline.date.replace(/\-/g, ""),
                title: entry.deadline.title
            });
        }
    }
    var calendarPage = nunjucks.render("announcementsCalendar.ics", { announcements: announcements });
    calendarPage = icsFixes(calendarPage);
    fs.writeFileSync(path.join(p.builddir, 'announcements.ics'), calendarPage);
});

module.exports = newsEngine;
