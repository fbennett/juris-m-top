//#!/usr/bin/node

var fs = require('fs');
var path = require('path');
var nunjucks = require('nunjucks');
var yaml = require('js-yaml');
var scriptDir = path.dirname(require.main.filename);
var utils = require(path.join(scriptDir, 'lib', 'utils'));
var p = require(path.join(scriptDir, 'lib', 'sitePaths'));

nunjucks.configure({
    lstripBlocks: true,
    trimBlocks: true
});
nunjucks.configure(p.templates, { autoescape: true });

var infoYaml = fs.readFileSync(path.join(scriptDir, 'lib', 'redirects.yml'))
var info = yaml.load(infoYaml)

function mkdirs(pathToCreate) {
    pathToCreate
        .split(path.sep)
        .reduce((currentPath, folder) => {
            currentPath += folder + path.sep;
            if (!fs.existsSync(currentPath)){
                fs.mkdirSync(currentPath);
            }
            return currentPath;
        }, '');
}

function setOneRedirect(i) {
    var lst = i.split('/');
    var filename = lst[lst.length - 1];
    var filepath = lst.slice(0,-1).join(path.sep);
    var filetext = nunjucks.render('redirect.html', {TARGET: info[i]});
    // Make sure the path to the directory exists
    mkdirs(path.join(p.builddir, filepath));
    // Write file to disk only if no file exists at this location
    var fullpath = path.join(p.builddir, filepath, filename)
    if (!fs.existsSync(fullpath)) {
        fs.writeFileSync(fullpath, filetext);
        console.log("Write: " + i);
    }
}
    
for (var i in info) {
    setOneRedirect(i);
}
