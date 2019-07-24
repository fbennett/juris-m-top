'use strict';

var path = require('path');
var scriptDir = path.dirname(require.main.filename);

var fs = require('fs');
var config = require(path.join(scriptDir, 'lib', 'siteConfig'));

function makePath(pth) {
    pth = pth.split('/');
    pth = pth.join(path.sep)
    return path.join(config.repoRoot, pth)
}

function getRelative(elems) {
    if (elems.length === 0) {
        this.toppath = '.';
        this.stub = '.';
    } else {
        this.toppath = elems.map(function(){
            return '..'
        }).join(path.sep);
        this.stub = elems.join(path.sep);
    }
}

function makePointableSourceDir(dirname) {
    dirname = dirname.join(path.sep);
    var firstPath = path.join(config.repoRoot, "src", dirname)
    if (fs.existsSync(firstPath)) {
        var stat = fs.statSync(firstPath);
        if (stat.isFile()) {
            var staffinfo = fs.readFileSync(firstPath).toString();
            return staffinfo.trim();
        } else if (stat.isDirectory()) {
            return firstPath;
        } else {
            throw "Something is wrong with the ./" + dirname+ " file"
        }
    } else {
        // make the directory so we can write into it, and
        // point the path there.
        fs.mkdirSync(firstPath)
        return firstPath;
    }
}

function makePaths() {
    this.root = config.repoRoot;
    this.templates = makePath(config.templateDir);
    this.embeds = makePath(config.embedsDir);
    this.content = makePointableSourceDir(['content']);
    this.cards = makePointableSourceDir(['cards']);
    this.links = makePointableSourceDir(['cards', 'links']);
    this.software = makePointableSourceDir(['cards', 'software']);
    this.styles = makePointableSourceDir(['cards', 'styles']);
    this["juris-bundles"] = makePointableSourceDir(['cards', 'juris-bundles']);
    this.getRelative = getRelative;
    this.builddir = makePath(config.buildDir);
}

module.exports = new makePaths();
