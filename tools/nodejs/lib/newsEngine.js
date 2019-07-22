'use strict';

var fs = require('fs');
var path = require('path');
var yaml = require('js-yaml');
var kuroshiro = require('kuroshiro');
var marked = require('marked');
var nunjucks = require('nunjucks');
var scriptDir = path.dirname(require.main.filename);
var c = require(path.join(scriptDir, 'lib', 'siteConfig'));
var p = require(path.join(scriptDir, 'lib', 'sitePaths'));
var utils = require(path.join(scriptDir, 'lib', 'utils'));
marked.setOptions({
    smartypants: true
});
nunjucks.configure({
    lstripBlocks: true,
    trimBlocks: true
});
nunjucks.configure(p.templates, { autoescape: true });


var NewsEngine = function() {
    this.entryFuncPre = function (rawEntry, params) {
        return rawEntry;
    }
    this.sessionFunc = function (rawEntry, rawSession, seq, params) {
        return rawSession;
    }
    this.entryFuncPost = function (rawEntry, entrySessions, params) {
        return rawEntry;
    }
    this.runFunc = function (entries, sessions) {
        return null;
    }
    this.dates = this.dater();
};

NewsEngine.prototype.setEntryFuncPre = function (entryFuncPre) {
    this.entryFuncPre = entryFuncPre.bind(this);
};

NewsEngine.prototype.setSessionFunc = function (sessionFunc) {
    this.sessionFunc = sessionFunc.bind(this);
};

NewsEngine.prototype.setEntryFuncPost = function (entryFuncPost) {
    this.entryFuncPost = entryFuncPost.bind(this);
};

NewsEngine.prototype.setRunFunc = function (runFunc) {
    this.runFunc = runFunc.bind(this);
};

NewsEngine.prototype.dater = function (ddata) {
    var d = new Date();
    if (ddata && "string" === typeof ddata) {
        var m = ddata.match(/^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})$/);
        if (m) {
            var year = parseInt(m[1], 10);
            var month = (parseInt(m[2], 10) - 1);
            var day = parseInt(m[3], 10);
            ddata = new Date(year, month, day, 0, 0);
        }
    }
    if (ddata) {
        if (ddata.getFullYear) {
            d = ddata;
        } else if (ddata.year) {
            d = new Date(ddata.year, ddata.month, ddata.day, ddata.hour, ddata.minute);
        }
    }
    
    var months = ["Jan.","Feb.","Mar.","Apr.","May","Jun.","Jul.","Aug.","Sep.","Oct.","Nov.","Dec."];
    var days = ["Sun.","Mon.","Tue.","Wed.","Thu.","Fri.","Sat."];
    
    function padTwo(str) {
        str = '' + str;
        if (str.length === 1) {
            str = "0" + str;
        }
        return str;
    }
    var utc = {
        year: d.getUTCFullYear(),
        month: d.getUTCMonth(),
        day: d.getUTCDate(),
        hour: d.getUTCHours(),
        minute: d.getUTCMinutes(),
        dow: d.getUTCDay()
    }
    var local = {
        year: d.getFullYear(),
        month: d.getMonth(),
        day: d.getDate(),
        hour: d.getHours(),
        minute: d.getMinutes(),
        dow: d.getDay()
    }
    var humanDate = days[local.dow] + ', ' + months[local.month] + ' ' + local.day + ', ' + local.year;
    var humanTime = local.hour + ':' + padTwo(local.minute);
    var humanShort = days[local.dow] + ', ' + months[local.month] + ' ' + local.day;
    var ymdDate = local.year + '-' + padTwo(local.month + 1) + '-' + padTwo(local.day);
    var utcTimeStamp = d.toISOString().replace(/\.[0-9]+Z/, 'Z');
    var utcCalendarTime = utc.year + padTwo(utc.month + 1) + padTwo(utc.day) + 'T' + padTwo(utc.hour) + padTwo(utc.minute) + '00Z'
    return {
        humanDate: humanDate,
        humanTime: humanTime,
        humanShort: humanShort,
        ymdDate: ymdDate,
        utcTimeStamp: utcTimeStamp,
        utcCalendarTime: utcCalendarTime
    }
};

NewsEngine.prototype.castFeed = function () {
    return {
        entries: [],
        updated: '2000-01-01T00:00:00Z'
    };
};
        
NewsEngine.prototype.forEachSessionIn = function (rawEntry, params, sessionFunc) {
    var sessions = [];
    var seq = 1;
    for (var date of Object.keys(rawEntry)) {
        var m = date.match(/^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})$/);
        if (m) {
            var ddata = {
                year:  parseInt(m[1], 10),
                month: (parseInt(m[2], 10) - 1),
                day: parseInt(m[3], 10)
            }
            for (var range of Object.keys(rawEntry[date])) {
                var mm = range.match(/^([0-9]{1,2}):([0-9]{2})\s*-\s*([0-9]{1,2}):([0-9]{2})$/);
                if (mm) {
                    ddata.hour = parseInt(mm[1], 10);
                    ddata.minute = parseInt(mm[2], 10);
                    var daterStart = this.dater(ddata);
                    
                    ddata.hour = parseInt(mm[3], 10);
                    ddata.minute = parseInt(mm[4], 10);
                    var daterEnd = this.dater(ddata);
                    
                    var rawSession = rawEntry[date][range];
                    params.daterStart = daterStart;
                    params.daterEnd = daterEnd;
                    var session = sessionFunc(rawEntry, rawSession, seq, params)
                    sessions.push(session);
                    seq += 1;
                }
            }
        }
    }
    return sessions;
};

NewsEngine.prototype.run = function(kuroshiro, callback) {
    this.kuroshiro = kuroshiro;
    var me = this;
    var feed = me.castFeed();
    var centerFolders = c.centerFolders;
    var newsTypes = c.newsTypes;
    var sessions = [];
    var entries = [];
    for (var centerFolder of centerFolders) {
        var centerFolderPath = path.join(p.centerinfo, centerFolder.key);
        if (!fs.existsSync(centerFolderPath)) {
            fs.mkdirSync(centerFolderPath)
        }
        for (var newsType of newsTypes) {
            var sourceFolderPath = path.join(p.centerinfo, centerFolder.key, newsType);
            if (!fs.existsSync(sourceFolderPath)) {
                fs.mkdirSync(sourceFolderPath)
            }
            // Get da yaml
            var files = fs.readdirSync(sourceFolderPath);
            var seq = 0;
            for (var fileName of files) {
                if (fileName.slice(-4) !== '.yml') {
                    continue;
                }
                seq += 1;
                var yamlSourceFilePath = path.join(sourceFolderPath, fileName);
                var yamlSource = fs.readFileSync(yamlSourceFilePath).toString();
                var rawEntry = yaml.safeLoad(yamlSource);
                var params = {
                    yamlSourceFilePath: yamlSourceFilePath,
                    centerFolder: centerFolder.key,
                    newsType: newsType,
                    dates: me.dates,
                    kuroshiro: this.kuroshiro
                }
                // Cast our dater object for a deadline, if any
                if (rawEntry.deadline && rawEntry.deadline.date && rawEntry.deadline.date.getFullYear) {
                    rawEntry.deadline.date = me.dater(rawEntry.deadline.date).ymdDate;
                }
                rawEntry = me.entryFuncPre(rawEntry, params);
                rawEntry.sessions = me.forEachSessionIn(rawEntry, params, function(rawEntry, rawSession, seq, params){
                    // Just so me.sessionFunc has access to the number of sessions.
                    // Oh, and for dates also.
                    return rawSession;
                });
                var entrySessions = me.forEachSessionIn(rawEntry, params, me.sessionFunc);
                delete rawEntry.sessions;
                rawEntry.category = newsType.slice(0, -1);
                var entry = me.entryFuncPost(rawEntry, entrySessions, params, seq);
                entries.push(entry);
                sessions = sessions.concat(entrySessions);
            }
        }
    }
    me.runFunc(entries, sessions);
}
module.exports = NewsEngine;
