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
            dirpath: pth,
            id: pSplit.slice(-1)[0]
        });
    }
    sortedPaths.sort(function(a,b){
        if (a.dirpath > b.dirpath) {
            return 1;
        } else if (a.dirpath < b.dirpath) {
            return -1;
        }
    });
    var accInfoByKey = {};
    var accInfo = [];
    for (var sp of sortedPaths) {
        if (fs.existsSync(path.join(p.documents, sp.dirpath, "info.yml"))) {
            accInfoByKey[sp.id] = yaml.safeLoad(fs.readFileSync(path.join(p.documents, sp.dirpath, "info.yml")));
            accInfoByKey[sp.id].description = fs.readFileSync(path.join(p.documents, sp.dirpath, "DESCRIPTION.txt"));
            // validate document path
            // then ...
            var files = fs.readdirSync(path.join(p.documents, sp.dirpath, "document"));
            var lastfilecreated = 0;
            var myfile = null;            
            for (var file of files) {
                var stat = fs.statSync(path.join(p.documents, sp.dirpath, "document", file))
                if (stat.mtime > lastfilecreated) {
                    myfile = file;
                    lastfilecreated = stat.mtime;
                }
            }
            var m = myfile.match(/\.([^\.\/]+)$/);
            if (m) {
                var myext = m[1];
                var filetype = null
                var icon = null;
                if (["doc", "docx", "xls", "xlsx", "zip", "pdf"].indexOf(myext) > -1) {
                    filetype = "document";
                    icon = "file.svg";
                }
                if (["md"].indexOf(myext) > -1) {
                    filetype = "webpage";
                    icon = "webpage.svg";
                }
                if (!filetype) {
                    console.log("Oops. Unknown document type at " + path.join(p.documents, sp.dirpath, "document", myfile));
                    process.exit();
                }
            } else {
                throw "Oops. File without extension at " + path.join(p.documents, sp.dirpath, "document", myfile)
            }
            accInfoByKey[sp.id].filepath = path.join(p.documents, sp.dirpath, "document", myfile);
            if (myext === "md") {
                myext = "html";
            }
            accInfoByKey[sp.id].urlpath = path.join("resources", "documents", (sp.id + "." + myext));
            accInfoByKey[sp.id].links = [
                {
                    label: filetype == "webpage" ? "Information" : "Download",
                    description: accInfoByKey[sp.id].description,
                    filepath: accInfoByKey[sp.id].filepath,
                    urlpath: accInfoByKey[sp.id].urlpath,
                    filetype: filetype,
                    icon: icon
                }
            ]
            delete accInfoByKey[sp.id].description;
            delete accInfoByKey[sp.id].urlpath;
            delete accInfoByKey[sp.id].filepath;

        } else {
            console.log("Oops. " + sp.dirpath)
            process.exit();
        }
    }
    for (var key in accInfoByKey) {
        accInfo.push(accInfoByKey[key]);
    }
    accInfo.sort(function(a,b){
        if (a.title > b.title) {
            return 1;
        } else if (a.title < b.title) {
            return -1;
        } else {
            return 0;
        }
    });
    
    return {
        sortedList: accInfo,
        byKey: accInfoByKey,
        keys: Object.keys(accInfoByKey)
    }
}

module.exports = getData(p.documents);
