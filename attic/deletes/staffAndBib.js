#!/usr/bin/nodejs
'use strict';
/*
 * Return formatted English and Japanese bibliography listings
 * for one or more staff members, by staff member and by subject.
 */

var fs = require('fs')
var path = require('path');
var Promise = require('bluebird');
var walkSync = require('walk-sync');
var yaml = require('js-yaml');
var scriptDir = path.dirname(require.main.filename);

var p = require(path.join(scriptDir, 'lib', 'sitePaths'));

var makepages = require(path.join(scriptDir, 'lib', 'bibPageOutput'));

var bibliographies = Promise.coroutine(function*(options) {
    var dataoutput = options.dataoutput;
    var pageoutput = options.pageoutput;
    var dir = options.dir;
    var tags = walkSync(dir);
    for (var i=tags.length-1;i>-1;i--) {
        let tagLst = tags[i].split(path.sep);
        if (tagLst.slice(-1)[0].slice(-4) !== '.yml' || tagLst.slice(-1)[0].slice(0, -4) !== tagLst.slice(-2, -1)[0]) {
            tags = tags.slice(0, i).concat(tags.slice(i + 1));
            continue;
        }
        var dataObj = yaml.safeLoad(fs.readFileSync(path.join(dir, tags[i])));
        tags[i] = tagLst.slice(-2, -1)[0];
    }

    //var data = yield getitems(options);
    if (pageoutput) {
        //var acc = bibmaker(data);
        makepages(pageoutput, tags);
    }
});

/*
 * Main
 */

var opt = require('node-getopt').create([
  ['t' 		, 'tag=ARG+' , 'Set tag for retrieval (option can be repeated).'],
  ['y' 		, 'dir=ARG' , 'Set path to staff YAML files.'],
  ['p' 		, 'pageoutput=ARG' , 'Path to directory where HTML files should be stored (optional).'],
  ['d' 		, 'dataoutput=ARG' , 'Path to directory where JSON data files should be stored (optional).'],
  ['h' 		, 'help'                , 'display this help']
])              // create Getopt instance
.bindHelp()     // bind option 'help' to default action
.parseSystem(); // parse command line

if (!opt.options.tag && !opt.options.dir) {
    console.log("Error: one of --tag or --dir must be specified.");
    process.exit()
}

if (opt.options.tag && opt.options.dir) {
    console.log("Error: the --tag and --dir options are mutually exclusive.");
    process.exit()
}

bibliographies(opt.options);
