'use strict';

var fs = require('fs');
var path = require('path');
var scriptDir = path.dirname(require.main.filename);
var utils = require(path.join(scriptDir, 'lib', 'utils'));
var walkSync = require('walk-sync');
var contentPage = require(path.join(scriptDir, 'lib', 'contentPage'));
var p = require(path.join(scriptDir, 'lib', 'sitePaths'));

function composePage(srcdir, fn, targetdir, latest) {
    var fileName = (fn.slice(0, -3) +".html");
    var txt = fs.readFileSync(path.join(srcdir, fn)).toString();
    console.log(fn);
    contentPage(txt, targetdir, fileName, latest);
}

function makePages(srcdir, targetdir, latest) {
    if (latest) {
        var paths = fs.readdirSync(path.join(srcdir, latest));
        paths = paths.filter((str) => {
            return str.slice(-3) === ".md";
        });
        paths.sort();
        var fn = paths.slice(-1)[0];
        fn = path.join(latest, fn);
        composePage(srcdir, fn, targetdir, latest);
    } else {
        var paths = walkSync(srcdir, {directories: false, globs: ['*/**']});
        for (var fn of paths) {
            if (fn.slice(-3) !== '.md') continue;
            composePage(srcdir, fn, targetdir);
        }
    }
}

var opt = require('node-getopt').create([
    ['s' 		, 'sourcedir=ARG'  ,  'Source directory.'],
    ['t' 		, 'targetdir=ARG'  ,  'Target directory.'],
    ['L' 		, 'latest=ARG'     ,  'Output only the latest (last-in-sort) page'],
    ['h' 		, 'help'           ,  'display this help']
])              // create Getopt instance
    .bindHelp()     // bind option 'help' to default action
    .parseSystem(); // parse command line

if (!opt.options.sourcedir) {
    console.log("Error: sourcedir is required.");
    process.exit()
}

if (!opt.options.targetdir) {
    console.log("Error: targetdir is required.");
    process.exit()
}

makePages(opt.options.sourcedir, opt.options.targetdir, opt.options.latest);
