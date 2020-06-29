'use strict';

var fs = require('fs');
var path = require('path');
var nunjucks = require('nunjucks');
var markdown = require('markdown').markdown;
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
        txt = markdown.toHTML(txt.replace(/^\\/, ""));
    }
    return txt;
}

function makePage(tmpl, targetDir, filePathStub, latest) {
    var origFilePath = filePathStub;
    var current = {};
    if (latest) {
        filePathStub = "latest/index.html";
    }
    var dirPath = filePathStub.split("/");
    var fileName = dirPath.slice(-1)[0];
    dirPath = dirPath.slice(0, -1);
    if (dirPath.length > 0) {
        current[dirPath[0]] = " current";
    }
    var pagedirs = new p.getRelative(dirPath);

    var { txt, header } = utils.breakOutText(origFilePath, tmpl);

    var res = utils.extractYAML(txt);
    var tmpl = markdown.toHTML(res.tmpl);

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
        date: header.date
    }
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
            if ("programs" === buildFilePath.split(path.sep)[0]) {
                var classes = target.getAttribute("class");
                if (!classes) {
                    classes = [];
                }
                classes.push("dividers");
                target.setAttribute("class", classes.join(" "))
            }
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
    
    var filePath = path.join(targetDir, dirPath.join(path.sep));
    if (!fs.existsSync(filePath)) {
        fs.mkdirSync(filePath);
    }
    //if (filePath === "/media/storage/src/gsl-build/build/programs/masters") {
    //    fs.writeFileSync(path.join(targetDir, "fake-masters.html"), fakepage);
    //}
    if (fileName.slice(-3) === ".md") {
        fileName = fileName.slice(0, -3) + ".html";
    }
    //fs.writeFileSync(path.join(filePath, fileName), realpage)
    fs.writeFileSync(path.join(filePath, fileName), realpage);
}

// if (require.main === module) {

module.exports = makePage;
