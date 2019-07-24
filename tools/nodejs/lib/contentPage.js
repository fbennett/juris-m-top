'use strict';

var fs = require('fs');
var path = require('path');
var nunjucks = require('nunjucks');
var markdown = require('markdown').markdown;
var yaml = require('js-yaml');

var scriptDir = path.dirname(require.main.filename);
var p = require(path.join(scriptDir, 'lib', 'sitePaths'));
var utils = require(path.join(scriptDir, 'lib', 'utils'));
var pageoutput = p.builddir;

var xpath = require('xpath');
var dom = require('xmldom').DOMParser;
var XMLSerializer = require('xmldom').XMLSerializer;
var xmlserializer = new XMLSerializer();

nunjucks.configure({
    lstripBlocks: true,
    trimBlocks: true
});

function markupObject(obj) {
    for (var key in obj) {
        if (typeof obj[key] === "string") {
            obj[key] = markdown.toHTML(obj[key]).replace(/^\s*<p>(.*)<\/p>\s*$/, "$1");
        } else if (typeof obj[key] === "object" && typeof obj[key].length === "undefined") {
            obj[key] = markupObject(obj[key]);
        }
    }
    return obj;
}

function makePage(tmpl, targetDir, buildFilePath, data, formData, documentData, globalIndex) {
    var current = {};
    var dirPath = buildFilePath.split("/");
    var fileName = dirPath.slice(-1)[0];
    dirPath = dirPath.slice(0, -1);
    if (dirPath.length > 0) {
        current[dirPath[0]] = " current";
    }
    var pagedirs = new p.getRelative(dirPath);

    var lines = utils.normalizeLineEndings(tmpl).split("\n");
    var header = {};
    var offset = 0;
    while (true) {
        var line = lines[offset];
        var m = line.match(/^(pageTitle|shortTitle|shyTitle|suppressTitle):\s*(.*)$/);
        if (m) {
            header[m[1]] = m[2];
            offset += 1;
        } else {
            break;
        }
    }
    var txt = lines.slice(offset).join("\n");
    var res = utils.extractYAML(txt);
    var tmpl = markdown.toHTML(res.tmpl);

    nunjucks.configure(p.embeds, { autoescape: true });
    var inserts = {};
    var topInsert = false;
    for (var i=0,ilen=res.objList.length;i<ilen;i++) {
        var langs = {};
        var obj = res.objList[i];
        if (data && data[obj.type]) {
            var embedData = data[obj.type];
        } else {
            var embedData = markupObject(obj);
        }

        if (embedData.documentid) {
            Object.assign(embedData, documentData.byKey[embedData.documentid]);
            for (var link of embedData.links) {
                // These URL adjustments are ugly-ugly.
                // They are fixed in contentPage IF they are rendered
                // somewhere. Otherwise, we need to fix them up here.
                // There must be a less arcane way of handling these.
                link.urlpath = link.urlpath.replace(/^(\.\.\/)*/g, "");
                if (!link.urlpath.match(/^https?:\/\//)) {
                    if (link.urlpath[0] !== "/") {
                        link.urlpath = pagedirs.toppath + path.sep + link.urlpath
                    }
                }
            }
        }

        if (embedData.categoryid) {
            try {
                embedData.title = formData.categoriesByKey[embedData.categoryid].title;
            } catch (e) {
                throw "Ouch. Bad categoryid: " + embedData.categoryid + " while attempting to build " + buildFilePath;
            }
        }

        if (embedData.formids) {
            embedData.links = [];
            for (var formid of embedData.formids) {
                var fdata = formData.formsByKey[formid];
                if (!fdata) {
                    console.log("Oops. Page calls a nonexistent form key " + formid);
                    process.exit();
                }
                if (fdata.filetype === "url") {
                    fdata.urlpath = fs.readFileSync(fdata.filepath).toString().trim();
                } else {
                    if (!fdata.urlpath.match(/^https?:\/\//)) {
                        if (fdata.urlpath[0] !== "/") {
                            fdata.urlpath = pagedirs.toppath + path.sep + fdata.urlpath
                        }
                    }
                }
                fdata.pos = globalIndex;
                globalIndex++;
                embedData.links.push(fdata);
            }
        }

        if (embedData.title) {
            embedData.slug = utils.makeSlug(embedData.title);
        }
        if (embedData.links) {
            if (Object.keys(embedData.links).length) {
                var links = [];
                for (var key in embedData.links) {
                    links.push(embedData.links[key]);
                }
                embedData.links = links;
            }
            for (var linkdata of embedData.links) {
                if (linkdata.lang) {
                    langs[linkdata.lang] = true;
                    linkdata.lang = " " + linkdata.lang;
                }
                linkdata.slug = utils.makeLinkSlug(embedData, linkdata)
            }
        }

        if (Object.keys(langs).length) {
            topInsert = true;
        }
        embedData.toppath = pagedirs.toppath;
        inserts[obj.id] = nunjucks.render(obj.type + '.html', embedData);
    }
    var pg = nunjucks.renderString(tmpl, inserts)
    
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
        INSERTME: pg,
        current: current,
        topInsert: topInsert ? '<div id="langselector"><div id="eselect">English-taught</div> <div id="jselect">Japanese-taught</div></div>' : ""
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
    fs.writeFileSync(path.join(filePath, fileName), realpage)
}

// if (require.main === module) {

module.exports = makePage;
