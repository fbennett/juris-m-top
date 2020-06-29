'use strict';

var fs = require('fs');
var path = require('path');
var yaml = require('js-yaml');
var marked = require('marked');
var nunjucks = require('nunjucks');
var scriptDir = path.dirname(require.main.filename);
var c = require(path.join(scriptDir, 'lib', 'siteConfig'));
var p = require(path.join(scriptDir, 'lib', 'sitePaths'));
var utils = require(path.join(scriptDir, 'lib', 'utils'));
marked.setOptions({
    smartypants: true
});
nunjucks.configure({
    lstripBlocks: true,
    trimBlocks: true
});
nunjucks.configure(p.templates, { autoescape: true });


var CardFetcher = function(subdir) {
    this.subdir = subdir;
    this.dir = p[subdir];
    this.name = c.cardTypes[subdir].name
    this.data = this.run();
};

CardFetcher.prototype.run = function() {
    var data = {};
    for (var fn of fs.readdirSync(this.dir)) {
        var fpth = path.join(this.dir, fn);
        console.log(fpth);
    }
}
module.exports = CardFetcher;
