#!/usr/bin/nodejs
'use strict';

var fs = require('fs');
var path = require('path');
var nunjucks = require('nunjucks');

var kuroshiro = require('kuroshiro');
var scriptDir = path.dirname(require.main.filename);
var p = require(path.join(scriptDir, 'lib', 'sitePaths'));
var newsCacheUpdate = require(path.join(scriptDir, 'lib', 'newsCacheUpdate'));
var newsOutputCalendar = require(path.join(scriptDir, 'lib', 'newsOutputCalendar'));
var newsOutputFeed = require(path.join(scriptDir, 'lib', 'newsOutputFeed'));
var newsOutputPages = require(path.join(scriptDir, 'lib', 'newsOutputPages'));
var pageoutput = p.builddir;

nunjucks.configure({
    lstripBlocks: true,
    trimBlocks: true
});
nunjucks.configure(p.templates, { autoescape: true });

// Kuroshiro runs async, so it has to be the outermost wrapper.

kuroshiro.init({dicPath: path.join(scriptDir, 'node_modules', 'kuromoji', 'dict')}, function(err){
    newsCacheUpdate.run(kuroshiro);
    newsOutputCalendar.run(kuroshiro);
    newsOutputFeed.run(kuroshiro);
    newsOutputPages.run(kuroshiro);
});
