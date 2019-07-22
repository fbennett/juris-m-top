'use strict';

var fs = require('fs');
var yaml = require('js-yaml');
var path = require('path');
var walkSync = require('walk-sync');
var scriptDir = path.dirname(require.main.filename);
var utils = require(path.join(scriptDir, 'lib', 'utils'));
var p = require(path.join(scriptDir, 'lib', 'sitePaths'));

var accInfoByKey = {};
var accInfo = [];
var accTitlesByKey = {};
var accTitles = [];

function setAsDocumentOrWebpage(obj, id, ext) {
    switch (ext) {
    case ".doc":
    case ".docx":
    case ".xls":
    case ".xlsx":
    case ".zip":
    case ".pdf":
        obj.filetype = "document";
        obj.icon = "file.svg";
        obj.urlpath = "resources/forms/" + id + ext;
        return true;
        ;;
    case ".html":
        obj.filetype = "webpage";
        obj.icon = "webpage.svg";
        obj.urlpath = "resources/forms/" + id + ext
        return true;
        ;;
    default:
        return false;
        ;;
    }
}

function setObjectType(obj, dirpath, filename, id) {
    if (!filename) {
        console.log("Oops. No file to process at " + path.join(p.forms, dirpath, "document"));
        return false;
    }
    var fileext = null;
    obj.filepath = path.join(p.forms, dirpath, "document", filename);
    var m = filename.match(/(\.[^\.\/]+)$/);
    if (!m) {
        console.log("Oops. No file extension at " + path.join(p.forms, dirpath, "document" + filename));
        return false;
    }
    var ext = m[1] === ".md" ? ".html" : m[1];
    if (setAsDocumentOrWebpage(obj, id, ext)) {
        return true;
    }
    if (ext === ".txt") {
        var txt = fs.readFileSync(path.join(p.forms, dirpath, "document", filename)).toString().trim();
        if (!txt || txt.match(/\ /) || txt.slice(-4) === ".txt") {
            console.log("Oops. Badly formed URL in " + path.join(p.forms, dirpath, "document", filename));
            return false;
        }
        if (txt.match(/^https?:\/\//)) {
            obj.filetype = "url";
            obj.icon = "link.svg";
            obj.urlpath = txt;
            return true;
        }
        var m = txt.match(/(\.[^\.\/]+)$/);
        if (!m) {
            console.log("Oops. No file extension found inside file " + path.join(p.forms, dirpath, "document", filename));
            return false;
        }
        var ext = m[1];
        if (setAsDocumentOrWebpage(obj, id, ext)) {
            obj.urlpath = txt;
            delete obj.filepath;
            return true;
        } else {
            throw "Unknown filetype inside of " + path.join(p.forms, dirpath, "document", filename);
        }
        // Suspenders and a belt
        throw "Oops. Unknown file type inside of " + path.join(p.forms, dirpath, "document", filename);
    }
    console.log("Oops. Unknown file type at " + path.join(p.forms, dirpath, "document", filename));
    return false;
}

function getData(srcdir) {
    var paths = walkSync(srcdir, {directories: true, globs: ['*/**']});
    var sortedPaths = [];
    for (var pth of paths) {
        if (pth.slice(-1) !== "/" || pth.slice(-10) === "/document/") continue;
        var pSplit = pth.split("/");
        // last item is empty
        pSplit.pop();
        sortedPaths.push({
            len: pSplit.length,
            dirpath: pth
        });
    }
    sortedPaths.sort(function(a,b){
        if (a.dirpath > b.dirpath) {
            return 1;
        } else if (a.dirpath < b.dirpath) {
            return -1;
        }
    });
    var infoSplit = [];
    for (var sp of sortedPaths) {
        if (fs.existsSync(path.join(p.forms, sp.dirpath, "info.yml"))) {
            var info = yaml.safeLoad(fs.readFileSync(path.join(p.forms, sp.dirpath, "info.yml")));
            if (infoSplit.length < sp.len) {
                infoSplit.push(info.name);
            } else if (infoSplit.length == sp.len) {
                infoSplit.pop();
                infoSplit.push(info.name);
            } else {
                infoSplit = infoSplit.slice(0, sp.len);
                infoSplit.pop();
                infoSplit.push(info.name);
            }
            var id = infoSplit.join("-");
            var lastid = infoSplit.slice(0, -1).join("-");
            accInfoByKey[id] = {};
            var display = JSON.parse(JSON.stringify(info));
            delete display.name;
            if (lastid) {
                var oldLen = Object.keys(accInfoByKey[lastid]).length;
                var newLen = Object.keys(display).length;
                accInfoByKey[id] = Object.assign(display, accInfoByKey[lastid]);
                if (oldLen && Object.keys(accInfoByKey[id]).length !== (oldLen + newLen)) {
                    console.log("getForms.js: Oops. Overwrote a key at " + path.join(p.forms, sp.dirpath, "info.yml"));
                    process.exit();
                }
            } else {
                accInfoByKey[id] = display;
            }
            if (fs.existsSync(path.join(p.forms, sp.dirpath, "document"))) {
                accInfoByKey[id].full = true;
                // Fetch DESCRIPTION.txt
                if (fs.existsSync(path.join(p.forms, sp.dirpath, "DESCRIPTION.txt"))) {
                    accInfoByKey[id].description = fs.readFileSync(path.join(p.forms, sp.dirpath, "DESCRIPTION.txt")).toString();
                    accInfoByKey[id].description = accInfoByKey[id].description.trim();
                }
                for (var key of ["title", "lang", "description", "label"]) {
                    if (!accInfoByKey[id][key]) {
                        console.log("getForms.js: Oops. No key for " + key + " at " + path.join(p.forms, sp.dirpath))
                        process.exit();
                    }
                }
                // find the most recently created file under document/
                var files = fs.readdirSync(path.join(p.forms, sp.dirpath, "document"));
                if (files.length === 0) {
                    console.log("Warning: no files in " + path.join(p.forms, sp.dirpath, "document"));
                    process.exit();
                }
                var lastfilecreated = 0;
                var filename = null;
                var ext = null;
                for (var file of files) {
                    var stat = fs.statSync(path.join(p.forms, sp.dirpath, "document", file))
                    if (stat.mtime > lastfilecreated) {
                        filename = file;
                        lastfilecreated = stat.mtime;
                    }
                }
                if (setObjectType(accInfoByKey[id], sp.dirpath, filename, id)) {
                    // console.log("Document OK " + accInfoByKey[id].filepath);
                } else {
                    process.exit();
                }
                
                // Set an array of full entries on parent titled objects
                for (var i in infoSplit) {
                    i = parseInt(i);
                    var titleID = infoSplit.slice(0, i+1).join("-");
                    if (accInfoByKey[titleID].title) {
                        // console.log("Title at " + infoSplit.slice(0, i+1).join("-"))
                        if (!accTitlesByKey[titleID]) {
                            accTitlesByKey[titleID] = JSON.parse(JSON.stringify(accInfoByKey[titleID]));
                            accTitlesByKey[titleID].links = [];
                        }
                        accTitlesByKey[titleID].links.push(accInfoByKey[id]);
                        break;
                    }
                }
            }
        } else {
            console.log("Oops. " + sp.dirpath)
            process.exit();
        }
    }
    for (var key in accTitlesByKey) {
        accTitles.push(accTitlesByKey[key]);
    }
    for (var key in accInfoByKey) {
        if (!accInfoByKey[key].full) {
            delete accInfoByKey[key];
        } else {
            delete accInfoByKey[key].full;
        }
    }
    accTitles.sort(function(a,b){
        var normalTitleA = a.title.replace(/LL.?M\.?/i, "aLLM").replace(/LL.?D\.?/i, "bLLD");
        var normalTitleB = b.title.replace(/LL.?M\.?/i, "aLLM").replace(/LL.?D\.?/i, "bLLD");
        if (normalTitleA > normalTitleB) {
            return 1;
        } else if (normalTitleA < normalTitleB) {
            return -1;
        } else {
            return 0;
        }
    });
    return {
        categories: accTitles,
        categoriesByKey: accTitlesByKey,
        formsByKey: accInfoByKey,
        keys: Object.keys(accInfoByKey)
    }
}

module.exports = getData(p.forms);
