'use strict';

var fs = require('fs');
var path = require('path');
var nunjucks = require('nunjucks');

var md = {};

var yaml = require('js-yaml');

var scriptDir = path.dirname(require.main.filename);
var p = require(path.join(scriptDir, 'lib', 'sitePaths'));
var utils = require('./utils');
var pageoutput = p.builddir;

var xpath = require('xpath');
var dom = require('xmldom').DOMParser;
var XMLSerializer = require('xmldom').XMLSerializer;
var xmlserializer = new XMLSerializer();

nunjucks.configure({
    lstripBlocks: true,
    trimBlocks: true
});

function markupObject(txt) {
    if (typeof txt=== "string") {
        txt = txt.trim().split("\n").join("\n\n");
        txt = md.engine.render(txt.replace(/^\\/, ""));
    }
    return txt;
}

function makePage(sourceDir, targetDir, sourceFileName, latest) {
    var origSourceDir = sourceDir;
    var stub = sourceFileName.split(path.sep).slice(0, -1).join(path.sep);
    if (stub) {
        sourceFileName = sourceFileName.split(path.sep).slice(-1)[0];
        sourceDir = path.join(sourceDir, stub);
        targetDir = path.join(targetDir, stub);
    }
    var sourcePath = (fn, latest) => {
        var pth;
        if (latest) {
            pth = path.join(sourceDir, latest);
        } else {
            pth = sourceDir;
        }
        pth = sourceDir;
        if (fn) {
            return path.join(pth, fn);
        } else {
            return pth;
        }
    };
    var targetPath = (fn, latest) => {
        var pth;
        if (latest) {
            pth = path.join(targetDir, "latest");
        } else {
            pth = targetDir;
        }
        if (fn) {
            return path.join(pth, fn);
        } else {
            return pth;
        }
    };
    var targetFileName = (sourceFileName.slice(0, -3) +".html");
    console.log(`${sourceFileName} → ${targetFileName}`);


    
    var txt = fs.readFileSync(sourcePath(sourceFileName)).toString();

    var setPermaLinks;

    var relPath = sourcePath().slice(origSourceDir.length);
    var pagedirs = new p.getRelative(relPath.split("/").filter(o => o));
    var { txt, header } = utils.breakOutText(sourcePath(), txt);

    console.log(`toc_min: ${header.toc_min}`);
    
    if (txt.match(/\{toc\}/m)) {
        setPermaLinks = true;
        delete md.engine;
    } else {
        setPermaLinks = false;
        delete md.engine;
    }
    md.engine = require('markdown-it')({
        html: true,
        xhtmlOut: true,
        linkify: true,
        typographer: true
    }).use(require('markdown-it-footnote'))
            .use(require('markdown-it-deflist'))
        .use( require("@gerhobbelt/markdown-it-anchor"), { permalink: setPermaLinks, permalinkBefore: true, permalinkSymbol: '🔗' } )
        .use( require("@gerhobbelt/markdown-it-toc-done-right") );
    
    var current = {};
    switch (targetPath().split("/")[0]) {
    case "release":
    case "beta":
        current.downloads = " current";
        break;
    case "jurism-docs":
    case "cslm-docs":
        current.documentation = " current";
        break;
    case "indigobook+jurism":
    case "lrr":
        current.projects = " current";
        break;
    case "posts":
    case "mail":
        current.support = " current";
        break;
    }

    var res = utils.extractYAML(txt);
    var tmpl = md.engine.render(res.tmpl);

    nunjucks.configure(p.embeds, { autoescape: true });
    var inserts = {};
    var topInsert = false;
    for (var i=0,ilen=res.objList.length;i<ilen;i++) {
        var langs = {};
        var obj = res.objList[i];

        var embedData = obj;

        if (embedData.description) {
            embedData.description = markupObject(embedData.description);
        }

        // if (embedData.description) {
        //     embedData.description = markdown
        // }
        
        if (embedData.links) {
            if (Object.keys(embedData.links).length) {
                var links = [];
                for (var key in embedData.links) {
                    links.push(embedData.links[key]);
                }
                embedData.links = links;
            }
            for (var linkdata of embedData.links) {
                if (linkdata.description) {
                    linkdata.description = markupObject(linkdata.description);
                }
                if (linkdata.lang) {
                    langs[linkdata.lang] = true;
                    linkdata.lang = " " + linkdata.lang;
                }
                linkdata.slug = utils.makeLinkSlug(embedData, linkdata)
            }
        }

        embedData.toppath = pagedirs.toppath;
        embedData.latest = fs.readFileSync(path.join(p.root, "latest-post.txt"));
        embedData.animate = obj.animate;
        header.animate = obj.animate;


        inserts[obj.id] = nunjucks.render(obj.type + '.html', embedData);

    }

    var pg = nunjucks.renderString(tmpl, inserts);
    
    // AHA!
    // Make this a file. Provide for conditional wake-up of top-page content
    // in generic template.
    
    nunjucks.configure(p.templates, { autoescape: true });
    var template = '{% extends \"main.html\" %}\n{% block content %}\n{{ INSERTME|safe }}\n{% endblock %}\n';
    var params = {
        pageTitle: header.pageTitle,
        shortTitle: header.shortTitle,
        shyTitle: header.shyTitle,
        suppressTitle: header.suppressTitle,
        toppath: pagedirs.toppath,
        author: header.author,
        INSERTME: pg,
        current: current,
        date: header.date,
        animate: header.animate,
        toc_min: header.toc_min
    };
    var realpage = nunjucks.renderString(template, params).replace(/&nbsp;/g, "&#160;");
    // Split serialized HTML text, insert DIVs, insert class attributes?
    // Much more certain if we can make this a DOM.
    // Damn.
    var doc = new dom().parseFromString(realpage);
    // Great!
    // So now find all H2 nodes, and surround them in DIVs with their content
    var initAcc = true;
    var endIndex = null;
    var acc = {};
    var h2nodes = xpath.select("//h2|//h2/following-sibling::*", doc);

    for (var i=h2nodes.length-1; i>-1; i--) {
        var target = h2nodes[i];
        if (target.localName == "h2") {
            // cast wrapper  node
            var newDiv = doc.createElement('div');
            // insert wrapper node
            target.parentNode.insertBefore(newDiv, target);
            // move siblings into wrapper
            for (var j=endIndex-1; j>i-1; j--) {
                newDiv.insertBefore(h2nodes[j], newDiv.firstChild);
            }
            target.setAttribute('id', utils.makeSlug(target.textContent));
            // Process when he hit a heading.
            // We assume here that there will always be a heading.
            initAcc = true;
            if (Object.keys(acc).length) {
                // iff acc has length ...
                // create language class value
                var langs = Object.keys(acc).join(" ");
                // insert wrapper node
                newDiv.setAttribute("class", Object.keys(acc).join(" "));
            }
        } else {
            if (initAcc) {
                acc = {};
                endIndex = (i + 1);
                initAcc = false;
            };
            var englishes = xpath.select('.//div[contains(@class, "en")]', target);
            var japaneses = xpath.select('.//div[contains(@class, "ja")]', target);
            if (englishes.length) {
                acc.en = true;
            }
            if (japaneses.length) {
                acc.ja = true;
            }
        }
    }
    
    var realpage = xmlserializer.serializeToString(doc);
    realpage = realpage.replace(/(<script[^>]+)\/>/g, "$1></script>")
        .replace(/\&amp\;\&amp\;/g, "&&");

    if (!fs.existsSync(targetPath())) {
        fs.mkdirSync(targetPath());
    }
    fs.writeFileSync(targetPath(targetFileName), realpage);


    // NOW AT LAST
    // We need the image path and filenames

    var imgSubdirName = sourceFileName.slice(0, -3);
    
    var imgSourceDir = sourcePath(imgSubdirName);
    var imgTargetDir = targetPath(imgSubdirName);

    if (fs.existsSync(imgSourceDir)) {
        if (!fs.existsSync(imgTargetDir)) {
            fs.mkdirSync(imgTargetDir);
        }
        var files = fs.readdirSync(imgSourceDir);
        for (var fn of files) {
            var imgSourceFilePath = path.join(imgSourceDir, fn);
            var imgTargetFilePath = path.join(imgTargetDir, fn);
            fs.copyFileSync(imgSourceFilePath, imgTargetFilePath);
        }
    }
}

// if (require.main === module) {

module.exports = makePage;
