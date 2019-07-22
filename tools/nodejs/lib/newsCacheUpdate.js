'use strict';

var fs = require('fs');
var path = require('path');
var yaml = require('js-yaml');
var slug = require('slug');
slug.defaults.mode = 'rfc3986';
var scriptDir = path.dirname(require.main.filename);
var c = require(path.join(scriptDir, 'lib', 'siteConfig'));
var p = require(path.join(scriptDir, 'lib', 'sitePaths'));
var NewsEngine = require(path.join(scriptDir, 'lib', 'newsEngine'));
var cacheUpdater = require(path.join(scriptDir, 'lib', 'cacheUpdater'));

var newsEngine = new NewsEngine();

function getCalendarIDandFN (obj) {
    var seq = this.seq;
    var params = this.params;
    var ret = {};
    if (obj.id) {
        ret.fn = obj.id.replace(/@[^@]*$/, '');
        ret.id = obj.id;
    } else {
        ret.fn = params.centerFolder + '-reg-' + params.dates.utcCalendarTime + '-' + params.daterStart.utcCalendarTime + '-' + seq;
        ret.id = ret.fn + '@law.nagoya-u.ac.jp';
    }
    return ret;
};

function getEntryIDandFN (entry) {
    var seq = this.seq;
    var params = this.params;
    var fn, id = entry.id;
    if (!id) {
        // Assumes initialized kuroshiro environment
        if (entry.category === "Event") {
            var rawstring = entry.title.slice(0, 110);
        } else {
            var rawstring = entry.announcement.slice(0, 110);
        }
        var uniq = params.kuroshiro.toRomaji(rawstring);
        uniq = slug(uniq,{remove: /[\.]+/g});
        id = 'tag:law.nagoya-u.ac.jp,' + params.dates.ymdDate + ':' + params.centerFolder + "-" + entry.category + '-reg-' + params.dates.ymdDate + "-" + uniq;
    }
    fn = id.replace(/^[^:]+:[^:]+:/, '');
    return {
        id: id,
        fn: fn
    };
};

newsEngine.setSessionFunc(function(rawEntry, rawSession, seq, params){
    var me = {
        seq: seq,
        params: params
    };
    cacheUpdater({
        dataObject: rawSession,
        timestampKey: 'last-modified',
        timestampValue: params.dates.utcCalendarTime,
        getIdInfo: getCalendarIDandFN.bind(me),
    });
    return rawSession;
});

newsEngine.setEntryFuncPost(function (rawEntry, entrySessions, params, seq) {
    params.daterStart = {}
    var me = {
        params: params,
        seq: seq
    };
    // A hack, but it could be worse
    if (rawEntry.deadline && rawEntry.deadline.date && rawEntry.deadline.title) {
        if (!rawEntry.deadline.id) {
            // Heeelp.
            var ddate = new Date(rawEntry.deadline.date);
            var d = this.dater(ddate);
            params.daterStart.utcCalendarTime = d.utcCalendarTime;
            var getInfo = getCalendarIDandFN.bind(me)
            var deadlineInfo = getInfo(rawEntry);
            rawEntry.deadline.id = deadlineInfo.id;
            rawEntry.deadline.fn = deadlineInfo.fn;
        }
    }
    var info = cacheUpdater({
        dataObject: rawEntry,
        timestampKey: 'updated',
        timestampValue: params.dates.utcTimeStamp,
        getIdInfo: getEntryIDandFN.bind(me),
    });
    // Write to disk only if IDs have been added.
    if (info.changed) {
        var yamlForm = yaml.safeDump(info.dataObject);
        fs.writeFileSync(params.yamlSourceFilePath, yamlForm);
    }
    return null;
});

module.exports = newsEngine;

/*
// Um ...
                        // Get the feed (entry) ID.
                            // Refresh the dataObj to acquire the IDs.
                            dataObj = info.dataObject;
                        }
                        dataObj.fn = info.fn;
                        dataObj.category = feedType;
                        dataObj = utils.normalizeEntry(dataObj, thisDater);
                        feed.entries.push(dataObj);
                    }
                }
*/
