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
var scriptDir = path.dirname(require.main.filename);
var p = require(path.join(scriptDir, 'lib', 'sitePaths'));
var c = require(path.join(scriptDir, 'lib', 'siteConfig'));
var utils = require(path.join(scriptDir, 'lib', 'utils'));
var nunjucks = require('nunjucks');
nunjucks.configure({
    lstripBlocks: true,
    trimBlocks: true
});
nunjucks.configure(p.templates, { autoescape: true });

function hasLanguageHere(byLang, lang) {
    if (!byLang || !lang || !lang.trim()) return true;
    var langs = lang.trim().split(/\s+/);
    if (langs.indexOf(byLang) > -1) {
        return true;
    }
    return false;
}

function hasLanguageAnywhere(byLang, links) {
    if (!byLang) return true;
    var hasLanguage = false;
    for (var link of links) {
        if (hasLanguageHere(byLang, link.lang)) {
            hasLanguage = true;
        }
    }
    return hasLanguage;
}

function iterateBlock (pagetxt, blockList, catalog, catalogType, lang) {
    var currentdir = new p.getRelative(['resources', "DUMMY"]);
    for (var data of blockList) {
        console.log("    " + data.title)
        data.toppath = currentdir.toppath;
        
        if (data.title) {
            data.slug = 'card-' + utils.makeSlug(data.title);
        }

        if (catalogType === "ORG") {
            catalog.text += "- *" + data.title + "*\n\n";
        } else if (catalogType === "CSV") {
            var catalogPrefix = '\"' + data.title + '\",\"' + lang + '\",\"';
        }

        for (var link of data.links) {
            // These URL adjustments are ugly-ugly.
            // They are fixed in contentPage IF they are rendered
            // somewhere. Otherwise, we need to fix them up here.
            // There must be a less arcane way of handling these.
            link.urlpath = link.urlpath.replace(/^(\.\.\/)*/g, "");
            if (!link.urlpath.match(/^https?:\/\//)) {
                if (link.urlpath[0] !== "/") {
                    link.urlpath = currentdir.toppath + path.sep + link.urlpath;
                }
            }
            var plainLabel = link.label;
            if (link.sublabel) {
                plainLabel += "/" + link.sublabel;
            }
            if (catalogType === "ORG") {
                catalog.text += "  - /" + plainLabel + "/ [" + link.filetype + "] ([[" + link.urlpath.replace(/^\.\.\/\.\./, "https://www.law.nagoya-u.ac.jp/en") + "][link]]) ([[][edit]]) ([[][upload]]) " + link.description + "\n\n";
            } else if (catalogType === "CSV") {
                catalog.text += catalogPrefix + plainLabel + '\",\"' + link.filetype + '\",\"' + link.urlpath.replace(/^\.\.\/\.\./, "https://www.law.nagoya-u.ac.jp/en") + '\",\"' + link.description + '\"\n';
            }
            link.slug = utils.makeLinkSlug(data, link);
        }
        pagetxt += nunjucks.render("embedProgramInfo.html", data);
        pagetxt += "\n<p></p>\n"
    }
    return pagetxt;
}

function prepData(blockList, byLang) {
    var newList = JSON.parse(JSON.stringify(blockList));
    for (var i=newList.length-1; i>-1; i--) {
        var block = newList[i];
        if (!hasLanguageAnywhere(byLang, block.links)) {
            newList = newList.slice(0, i).concat(newList.slice(i+1));
            continue;
        }
        for (var j=block.links.length-1; j>-1; j--) {
            var link = block.links[j];
            if (!hasLanguageHere(byLang, link.lang)) {
                block.links = block.links.slice(0, j).concat(block.links.slice(j+1));
                continue;
            }
        }
    }
    return newList;
}

function makePage(category, blockList, catalogType) {
    var currentdir = new p.getRelative(['resources', category]);
    
    var pagetxt = "";
    
    var catalog = {
        text: ""
    };
    
    // Iterate here
    if (category === "forms") {

        catalog.category = "forms"

        // Modify to export CSV if catalogFile extension is CSV

        if (catalogType === "ORG") {
            catalog.text += catalogFile ? "* Forms\n\n" : "";
        }

        // Prep data
        var enList = prepData(blockList, "en");
        var jaList = prepData(blockList, "ja");
        // Iterate

        if (catalogType === "ORG") {
            catalog.text += catalogFile ? "** English forms\n\n" : "";
        }

        pagetxt += "<h2>Programs in English</h2>\n";
        console.log("  English");
        pagetxt = iterateBlock(pagetxt, enList, catalog, catalogType, "English");

        if (catalogType === "ORG") {
            catalog.text += catalogFile ? "** Japanese forms\n\n" : "";
        }

        pagetxt += "<h2>Programs in Japanese</h2>";
        console.log("  Japanese");
        pagetxt = iterateBlock(pagetxt, jaList, catalog, catalogType, "日本語");
    } else {
        
        catalog.category = "documents";

        if (catalogType === "ORG") {
            catalog.text += catalogFile ? "* Documents\n\n" : "";
        }
        
        pagetxt = iterateBlock(pagetxt, blockList, catalog, catalogType, "English");
    }
    var params = {
        toppath: currentdir.toppath,
        pageTitle: category.slice(0, 1).toUpperCase() + category.slice(1),
        shortTitle: category.slice(0, 1).toUpperCase() + category.slice(1),
        contentBlocks: pagetxt,
        current: {resources: " current"}
    }
    var pageHTML = nunjucks.render('documentsAndForms.html', params);
    fs.writeFileSync(path.join(p.builddir, "resources", category, "index.html"), pageHTML);
    return catalog.text;
}

module.exports = {
    makePage: makePage
}
