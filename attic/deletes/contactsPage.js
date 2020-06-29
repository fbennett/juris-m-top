#!/usr/bin/nodejs
'use strict';
/*
 * Build pages for the Contacts section of the website.
 */

var fs = require('fs');
var lunr = require('lunr');
var yaml = require('js-yaml');
var path = require('path');
var slug = require('slug');
var nunjucks = require('nunjucks');

var scriptDir = path.dirname(require.main.filename);
var utils = require(path.join(scriptDir, 'lib', 'utils'));
var p = require(path.join(scriptDir, 'lib', 'sitePaths'));

nunjucks.configure({
    lstripBlocks: true,
    trimBlocks: true
});
nunjucks.configure(p.templates, { autoescape: true });

var pageoutput = p.builddir;

var pageTitleMap = {
    gsl: "Graduate School of Law",
    university: "Nagoya University",
    external: "External"
}

var shortTitleMap = {
    gsl: "GSL",
    university: "University",
    external: "External"
}

function sortPage(a, b) {
    var A = a.name.replace(/^(the|a)\s+/i, '')
    var B = b.name.replace(/^(the|a)\s+/i, '')
    return A.localeCompare(B);
}

// Fix from here.
// We want a function that takes srcdir, targetdir, and fulltargetpath,
// and writes to file.
// Will need to be able to sniff the category from the path, I guess?
// Easier to provide an explicit value.

function makePage(requestCategory, sourcefile, targetdir) {
    var pageData = [];
    var allData = yaml.safeLoad(fs.readFileSync(sourcefile));
    for (var topkey in allData) {
        var cardData = allData[topkey];
        if (cardData['種別'] !== requestCategory) continue;
        var category = cardData['種別'];
        console.log("contactsPage: " + topkey)
        var details = [];
        if (cardData['詳細']) {
            var srcDetails = cardData['詳細'];
            for (var key in cardData['詳細']) {
                details.push({
                    label: key,
                    values: utils.makeList(srcDetails[key])
                })
            }
        }
        var shortName;
        if (cardData['略称']) {
            shortName = cardData['略称'];
        } else {
            shortName = topkey;
        }
        var myslug = slug(topkey, {remove: /[.]/g});
        var datum = {
            name: topkey,
            shortname: shortName,
            comments: utils.makeList(cardData['コメント']),
            details: details,
            slug: myslug
        }
        pageData.push(datum);
    }
    var contactsdir = new p.getRelative(['directory', category]);
    var params = {
        toppath: contactsdir.toppath,
        pageTitle: "Contacts",
        shortTitle: "Contacts",
        pageSubTitle: pageTitleMap[category],
        shortSubTitle: shortTitleMap[category],
        pageData: pageData,
        current: {directory: " current"}
    }
    pageData.sort(sortPage);
    var pageHTML = nunjucks.render('contactsPage.html', params);
    fs.writeFileSync(path.join(targetdir, 'index.html'), pageHTML);
}


/*
 * Main
 */

var opt = require('node-getopt').create([
  ['c' 		, 'category=ARG' , 'Category (gsl, university, external).'],
  ['s' 		, 'sourcefile=ARG' , 'Source file containing data for all categories.'],
  ['t' 		, 'targetdir=ARG' , 'Target directory.'],
  ['h' 		, 'help'                , 'display this help']
])              // create Getopt instance
.bindHelp()     // bind option 'help' to default action
.parseSystem(); // parse command line

if (!opt.options.category || ["gsl", "university", "external"].indexOf(opt.options.category) === -1) {
    console.log("Error: category is required, and must be one of gsl, university or external.");
    process.exit()
}

if (!opt.options.sourcefile) {
    console.log("Error: sourcefile is required.");
    process.exit()
}

if (!opt.options.targetdir) {
    console.log("Error: targetdir is required.");
    process.exit()
}

makePage(opt.options.category, opt.options.sourcefile, opt.options.targetdir);
