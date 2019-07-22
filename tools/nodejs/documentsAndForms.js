#!/usr/bin/node
'use strict';
/*
 * Generate index pages of Documents and Forms from
 * designated source hierarchy and write to designated
 * build subdirectory. Target directories "documents"
 * and "forms" are siblings under the designated
 * directory.
 */
var fs = require('fs');
var path = require('path');
var slug = require('slug');
var scriptDir = path.dirname(require.main.filename);
var p = require(path.join(scriptDir, 'lib', 'sitePaths'));
var c = require(path.join(scriptDir, 'lib', 'siteConfig'));
var nunjucks = require('nunjucks');
nunjucks.configure({
    lstripBlocks: true,
    trimBlocks: true
});
nunjucks.configure(p.templates, { autoescape: true });
var yaml = require('js-yaml');

function grabFirstFile(dirPath, fileName, missingFileOK) {
    var fileNameRoot = fileName.replace(/^(.*\.).*/, "$1")
    var offset = fileNameRoot.length
    for (var f of fs.readdirSync(dirPath)) {
        if (f.slice(-1) === '~') continue;
        if (f === fileName) continue;
        if (f.slice(0, offset) === fileNameRoot) {
            return f;
        }
    }
    if (!missingFileOK) {
        throw "No file found corresponding to " + fileName;
    }
}

function makePage(sourcedir, targetdir) {
    var acc = {}
    for (var cDirInfo of c.centerFolders) {
        for (var dfDir of c.docFolders) {
            var dfPath = path.join(sourcedir, cDirInfo.key, dfDir);
            var dfFiles = fs.readdirSync(dfPath).filter(function(str){
                if (str.slice(-4) !== '.yml') {
                    return null;
                } else {
                    return str;
                }
            }).map(function(str){
                return str.slice(0, -4);
            });
            dfFiles.sort();
            // Parents will precede children, so look ahead.
            var parentString = null;
            var buf = null;
            for (var i=0,ilen=dfFiles.length;i<ilen;i++) {
                if (!acc[cDirInfo.key]) {
                    acc[cDirInfo.key] = {};
                }
                if (!acc[cDirInfo.key][dfDir.toLowerCase()]) {
                    acc[cDirInfo.key][dfDir.toLowerCase()] = [];
                }
                var dfList = acc[cDirInfo.key][dfDir.toLowerCase()];
                var dfFile = dfFiles[i];
                console.log("documentsAndForms: "+dfFile);
                var dfFilePath = path.join(dfPath, dfFile + ".yml");
                var dfData = yaml.safeLoad(fs.readFileSync(dfFilePath));
                dfData.centerName = cDirInfo.name;
                var next = dfFiles[i+1];
                if (parentString && dfFile.slice(0, parentString.length) === parentString) {
                    // Child. Create children buffer segment if necessary, and push.
                    if (!buf.children) {
                        buf.children = [];
                    }
                    dfData.fileName = grabFirstFile(dfPath, dfFile + ".yml");
                    if (dfData.fileName) {
                        buf.fileName = dfData.fileName;
                    }
                    var srcPath = path.join(dfPath, dfData.fileName);
                    var blob = fs.readFileSync(srcPath);
                    fs.writeFileSync(path.join(targetdir, dfDir.toLowerCase(), dfData.fileName), blob);
                    buf.children.push(dfData);
                } else {
                    // New parent.
                    // OR
                    // Not parent, not child.
                    // Push buffer if any, open new buffer.
                    if (buf) {
                        buf.slug = slug(buf.title).toLowerCase();
                        dfList.push(buf);
                    }
                    if (next && next.slice(0, dfFile.length) === dfFile) {
                        // If parent, set toggle.
                        parentString = dfFile;
                    } else {
                        // If not, unset toggle, set source file path immediately.
                        parentString = null;
                        dfData.fileName = grabFirstFile(dfPath, dfFile + ".yml");
                        var srcPath = path.join(dfPath, dfData.fileName);
                        var blob = fs.readFileSync(srcPath);
                        fs.writeFileSync(path.join(targetdir, dfDir.toLowerCase(), dfData.fileName), blob);
                    }
                    buf = dfData;
                    if (buf.fileName) {
                        buf.fileName = dfData.fileName;
                    }
                }
            }
            if (buf) {
                buf.slug = slug(buf.title).toLowerCase();
                dfList.push(buf);
            }
        }
    }
    // Oh, piffle.
    // Just reorganizing here.
    // We want a list for each of the centers, for grouping.
    // Maybe we SHOULD have a top-level key on cDir. That would do it, no?

    for (var category of c.docFolders) {
        var pageInfo = {
            pageTitle: category,
            shortTitle: category,
            pageSubTitle: null,
            shortSubTitle: null,
            pageData: []
        };
        for (var cDirInfo of c.centerFolders) {
            if (!acc[cDirInfo.key] || !acc[cDirInfo.key][category.toLowerCase()]) continue;
            pageInfo.pageData.push({
                centerName: cDirInfo.name,
                centerData: acc[cDirInfo.key][category.toLowerCase()]
            });
            var pagedirs = new p.getRelative(['resources', category.toLowerCase()]);
        }
        var outFile = path.join(targetdir, category.toLowerCase(), "index.html");
        pageInfo.toppath = pagedirs.toppath;
        var outPage = nunjucks.render("documentsAndForms.html", pageInfo);
        fs.writeFileSync(outFile, outPage);
    }
}

if (require.main === module) {

    var opt = require('node-getopt').create([
        ['s' 		, 'sourcedir=ARG' , 'Source directory.'],
        ['t' 		, 'targetdir=ARG' , 'Target directory.'],
        ['h' 		, 'help'                , 'display this help']
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

    makePage(opt.options.sourcedir, opt.options.targetdir, opt.options.filepath);
} else {
    module.exports = makePage;
}
