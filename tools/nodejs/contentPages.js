'use strict';

var fs = require('fs');
var path = require('path');
var walkSync = require('walk-sync');
var scriptDir = path.dirname(require.main.filename);
var utils = require(path.join(scriptDir, 'lib', 'utils'));
var p = require(path.join(scriptDir, 'lib', 'sitePaths'));
var formData = require(path.join(scriptDir, 'lib', 'getForms'));
var documentData = require(path.join(scriptDir, 'lib', 'getDocuments'));
var contentPage = require(path.join(scriptDir, 'lib', 'contentPage'));
var documentsAndForms = require(path.join(scriptDir, 'lib', 'documentsAndForms'));

/*
console.log("\nCategories");
for (var entry of Object.keys(formData.categoriesByKey)) {
    console.log(entry);
}

console.log("\nForms:")
for (var entry of formData.keys) {
    console.log(entry);
}

console.log("\nDocuments")
for (var entry of documentData.keys) {
    console.log(entry);
}

process.exit();
*/

function makePages(srcdir, targetdir, incdir, catalogFile) {

    // Phase 1
    // Move forms and documents into place
    
    for (var key in formData.formsByKey) {
        var form = formData.formsByKey[key];
        if (form.filepath) {
            //console.log("XXX "+form.filepath);
            //if (form.filepath === "/home/bennett/ownCloud/Web/forms/comparative-law/masters/jds/english/document/jds-application-process.md") {
            //    console.log(fs.readFileSync("/home/bennett/ownCloud/Web/forms/comparative-law/masters/jds/english/document/jds-application-process.md").toString());
            //}
            if (form.filetype === "document") {
                // Copy document from filepath to urlpath.
                fs.writeFileSync(path.join(targetdir, form.urlpath), fs.readFileSync(form.filepath, 'binary'), 'binary');
            } else if (form.filetype === "webpage") {
                // Generate a complete page with all decorations.
                var txt = fs.readFileSync(form.filepath).toString();
                contentPage(txt, targetdir, form.urlpath);
            }
        }
    }

    // Um ... this should work with the same structure as
    // above. What's going on with document keys? Looks like
    // we could use another object for targeting documents at the
    // link level.
    
    for (var key in documentData.byKey) {
        var document = documentData.byKey[key];
        for (var link of document.links) {
            if (link.filetype === "webpage") {
                var txt = fs.readFileSync(link.filepath).toString();
                contentPage(txt, targetdir, link.urlpath);
            } else {
                fs.writeFileSync(path.join(targetdir, link.urlpath), fs.readFileSync(link.filepath, 'binary'), 'binary');
            }
        }
    }

    // Phase 2
    // Render content pages, with a memo of form indices
    
    var globalIndex = 1;
    var paths = walkSync(srcdir, {directories: false, globs: ['*/**']});
    for (var fn of paths) {
        if (fn.slice(-3) !== '.md') continue;
        var buildFilePath = (fn.slice(0, -3) +".html");
        var sourceDir = srcdir;
        var txt = fs.readFileSync(path.join(srcdir, fn)).toString();
        console.log(fn);
        contentPage(txt, targetdir, buildFilePath, null, formData, documentData, globalIndex);
    }

    // Phase 3
    // Sort forms, and generate pages for forms and documents
    for (var key in formData.categoriesByKey) {
        var fdata = formData.categoriesByKey[key];
        fdata.links.sort(function(a,b){
            if (a.pos > b.pos) {
                return 1;
            } else if (a.pos < b.pos) {
                return -1;
            } else {
                return 0;
            }
        });
    }
    var catalogText = "";
    var catalogType = null;
    if (catalogFile) {
        if (catalogFile.slice(-4) === ".org") {
            catalogType = "ORG";
            catalogText += "#+LATEX_CLASS: texMemo\n"
            catalogText += "#+MACRO: NOINDENT @@latex: \\noindent@@\n"
            catalogText += "#+TITLE: MEMO\n"
            catalogText += "#+LATEX_HEADER: \\memoto{Staff}\n"
            catalogText += "#+LATEX_HEADER: \\memofrom{Frank Bennett}\n"
            catalogText += "#+LATEX_HEADER: \\memosubject{Web content links}\n"
            catalogText += "#+LATEX_HEADER: \\memodate{\\today}\n"
            catalogText += "#+OPTIONS: toc:nil\n\n"
        } else if (catalogFile.slice(-4) === ".csv") {
            catalogType = "CSV";
            catalogText += '\"分類・題名\",\"言語\",\"ラベル\",\"種類\",\"コンテンツURL\",\"説明文\"\n';
        }
    }

    console.log("resources/documents/index.md");
    catalogText += documentsAndForms.makePage("documents", documentData.sortedList, catalogType);
    console.log("resources/forms/index.md");
    catalogText += documentsAndForms.makePage("forms", formData.categories, catalogType);
    if (catalogFile && catalogText) {
        fs.writeFileSync(catalogFile, catalogText);
    }
}



var opt = require('node-getopt').create([
    ['s' 		, 'sourcedir=ARG'  ,  'Source directory.'],
    ['t' 		, 'targetdir=ARG'  ,  'Target directory.'],
    ['i' 		, 'includesdir=ARG',  'Redirects with include: header are relative to this directory.'],
    ['c' 		, 'catalog=ARG'    ,  'Output a text list of form and document descriptions for reference.'],
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

if (!opt.options.includesdir) {
    console.log("Error: includesdir is required.");
    process.exit()
}

makePages(opt.options.sourcedir, opt.options.targetdir, opt.options.includesdir, opt.options.catalog);
