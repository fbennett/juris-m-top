'use strict';

var path = require('path');
var scriptDir = path.dirname(require.main.filename);

var fs = require('fs');
var nunjucks = require('nunjucks')
var yaml = require('js-yaml');
var markdown = require('markdown').markdown;
var utils = require(path.join(scriptDir, 'lib', 'utils'));
var p = require(path.join(scriptDir, 'lib', 'sitePaths'));
var Promise = require('bluebird');

// Configure template engine
nunjucks.configure({
    lstripBlocks: true,
    trimBlocks: true
});
nunjucks.configure(p.templates, { autoescape: true });

var pandoc = require('simple-pandoc');
var htmlToLatex = pandoc('html', 'latex');

function staffGen(pageoutput, staffBibs) {
    var staffdir = new p.getRelative(['directory', 'staff'])
    var indexData = [];
    for (var staffCode of staffBibs) {
        try {
            var cp = yaml.safeLoad(fs.readFileSync(path.join(p.staffinfo, staffCode, staffCode + '.yml')));
        } catch (e) {
            console.log("Yikes! " +staffCode+" "+e);
            process.exit(1);
        }
        indexData.push({
            name: cp['名前'].en.replace(/ /g, '&nbsp;'),
            sortfield: cp['並べ替え'].en,
            field: utils.makeList(cp['専門分野'].en, true),
            post: utils.makeList(cp['役職'].en, true),
            key: staffCode,
            unilink: cp.unilink
        });
    }
    indexData.sort(function(a,b){
        if (a.sortfield > b.sortfield) {
            return 1;
        } else if (a.sortfield < b.sortfield) {
            return -1
        } else {
            return 0
        }
    })
    var params = {
        toppath: staffdir.toppath,
        pageTitle: "Staff profiles",
        shortTitle: "Staff profiles",
        pageSubTitle: null,
        shortSubTitle: null,
        data: indexData,
        current: {directory: " current"}
    }
    var pageHTML = nunjucks.render('staffIndex.html', params);
    fs.writeFileSync(path.join(pageoutput, staffdir.stub, 'index.html'), pageHTML);
    console.log("Wrote staff pages under " + pageoutput)
}

function sortPage(a, b) {
    return a.subjectName.localeCompare(b.subjectName);
}

function makepages(pageoutput, acc) {
    staffGen(pageoutput, acc);
}

module.exports = makepages;
