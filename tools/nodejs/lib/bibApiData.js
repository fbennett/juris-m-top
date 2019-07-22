'use strict';

var path = require('path');
var scriptDir = path.dirname(require.main.filename);
var walkSync = require('walk-sync');
var Promise = require('bluebird');

var fs = require('fs');
var Zotero = require('libzotero');
var zotero2jurismCSL = require('zotero2jurismcsl');
var config = require(path.join(scriptDir, 'lib', 'siteConfig'));

var yaml = require('js-yaml');

var groupID = config.groupID;

Zotero.config.useIndexedDB = false;
Zotero.config.limit = 100;
Zotero.init();

module.exports = function(options) {
    var tag = options.tag;
    var dir = options.dir;
    var output = options.output;
    // you can create an apiKey here: https://www.zotero.org/settings/keys
    //var apiKey = fs.readFileSync(options.apikey).toString().trim();
    var staffTags = {};
    var tags;
    if (tag) {
        // "tag" is misnamed. In the script CL config, it accepts multiple
        // values, so it is an array.
        tags = tag;
    } else if (dir) {
        tags = walkSync(dir);
        for (var i=tags.length-1;i>-1;i--) {
            let tagLst = tags[i].split(path.sep);
            if (tagLst.slice(-1)[0].slice(-4) !== '.yml' || tagLst.slice(-1)[0].slice(0, -4) !== tagLst.slice(-2, -1)[0]) {
                tags = tags.slice(0, i).concat(tags.slice(i + 1));
                continue;
            }
            var dataObj = yaml.safeLoad(fs.readFileSync(path.join(dir, tags[i])));
            tags[i] = 'au:' + tagLst.slice(-2, -1);
            console.log(tags[i]);
            if (dataObj['データ'] && dataObj['データ'].zoteroUserID) {
                // pass
                tags[i] = tags[i] + "::" + dataObj['データ'].zoteroUserID + "::" + dataObj['データ'].zoteroApiKey;
            }
        }
    }
    /*
    var fetchOneAuthor = Promise.coroutine(function*(authorTag) {
        var zoteroUserID = false;
        var zoteroApiKey = false;
        var tagAsList = authorTag.split("::");
        if (tagAsList.length === 3) {
            zoteroApiKey = tagAsList[2];
            zoteroUserID = tagAsList[1];
        }
        authorTag = tagAsList[0];
        var authorCode = authorTag.slice(3);
        staffPubs[authorCode] = {
            books: {},
            others: {}
        };
        var fetcher;
        if (zoteroUserID && zoteroApiKey) {
            console.log("Fetching bibliography data for: " + authorTag + " USER LIBRARY");
            // Personal library, direct user control.
            var preConfig = new Zotero.RequestConfig().LibraryType('user').LibraryID(zoteroUserID).Target('publications').config;
            var preFetcher =  new Zotero.Fetcher(preConfig);
            return preFetcher.fetchAll().then(()=>{
                let preResults = preFetcher.results;
                preResults.forEach((preItemJson)=>{
                    var config = new Zotero.RequestConfig().LibraryType('user').LibraryID(zoteroUserID).Key(zoteroApiKey).ItemKey(preItemJson.data.key).Target('items').config;
                    fetcher = new Zotero.Fetcher(config);
                    return fetchAnItem(fetcher, authorTag, zoteroUserID, zoteroApiKey);
                })
            });
        } else {
            console.log("Fetching bibliography data for: " + authorTag);
            // Group library, curated by the team
            var config = new Zotero.RequestConfig().Tag(authorTag).LibraryType('group').LibraryID(groupID).Target('items').config;
            fetcher = new Zotero.Fetcher(config);
            return fetchAnItem(fetcher, authorTag, zoteroUserID);
        }
    });
    */
    var fetchAnItem = Promise.coroutine(function*(fetcher, authorTag, zoteroUserID, zoteroApiKey) {
        return fetcher.fetchAll().then(()=>{
	        let results = fetcher.results;
            results.forEach((itemJson)=>{
                if (itemJson.data && (itemJson.data.itemType === 'attachment' || itemJson.data.itemType === 'note')) {
                    return false;
                }
                var tags = itemJson.data.tags.map(function(obj){
                    return obj.tag;
                });
                if (tags.indexOf('GSL') > -1 || zoteroApiKey) {
                    var authorCode = authorTag.slice(3);
		            let item = new Zotero.Item(itemJson);
                    try {
                        var cslItem = zotero2jurismCSL.convert(item);
                    } catch (e) {
                        console.log(e);
                        //console.log(JSON.stringify(item, null, 2));
                        process.exit(1);
                    }

                    var tagnames = [];
                    if (itemJson.data.tags) {
                        tagnames = itemJson.data.tags.map(function(taginfo) {
                            return taginfo.tag;
                        });
                    }
                    for (var i=0,ilen=tagnames.length;i<ilen;i++) {
                        let tag = tagnames[i];
                        if (tag.slice(0,3) !== 'ca:') continue;
                        tag = encodeURIComponent(tag.slice(3));
                        if (!pubTags[tag]) {
                            pubTags[tag] = {};
                        }
                        if (!staffTags[tag]) {
                            staffTags[tag] = {}
                        }
                        var type;
                        staffTags[tag][authorCode] = true;
                        pubTags[tag][cslItem.id] = true;
                    }
                    if (cslItem.type === 'book') {
                        type = 'books';
                    } else {
                        type = 'others';
                    }
                    staffPubs[authorCode][type][cslItem.id] = cslItem;
                    allPubs[cslItem.id] = cslItem;
                }
	        });
        });
    });
    var fetchAllAuthors = Promise.coroutine(function*(tags) {
        for (var tag of tags) {
            yield fetchOneAuthor(tag);
        }
        return {
            staffTags: staffTags
        }
    });
    return fetchAllAuthors(tags);
}
