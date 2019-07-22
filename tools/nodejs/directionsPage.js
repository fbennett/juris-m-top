#!/usr/bin/nodejs
'use strict';
/*
 * Build directions page. Templated to align header and
 * footer with the rest of the site.
 */

var fs = require('fs');
var path = require('path');
var nunjucks = require('nunjucks');

var scriptDir = path.dirname(require.main.filename);
var utils = require(path.join(scriptDir, 'lib', 'utils'));
var p = require(path.join(scriptDir, 'lib', 'sitePaths'));

nunjucks.configure({
    lstripBlocks: true,
    trimBlocks: true
});
nunjucks.configure(p.templates, { autoescape: true });


function makePage (targetDir) {
    
    var directionsdir = new p.getRelative(['directions']);
    
    var params = {
        pageTitle: 'Directions',
        toppath: directionsdir.toppath
    }
    
    var pageHTML = nunjucks.render('directionsPage.html', params);
    fs.writeFileSync(path.join(targetDir, directionsdir.stub, 'index.html'), pageHTML);
}
    
/*
 * Main
 */

var opt = require('node-getopt').create([
    ['t' 		, 'targetdir=ARG' , 'Target directory.'],
  ['h' 		, 'help'                , 'display this help']
])              // create Getopt instance
.bindHelp()     // bind option 'help' to default action
.parseSystem(); // parse command line

if (!opt.options.targetdir) {
    console.log("Error: targetdir is required.");
    process.exit()
}

makePage(opt.options.targetdir);
