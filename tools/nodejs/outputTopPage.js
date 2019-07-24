'use strict';

var fs = require('fs');
var path = require('path');
var lunr = require('lunr');
var yaml = require('js-yaml');
var marked = require('marked');
var scriptDir = path.dirname(require.main.filename);
var utils = require(path.join(scriptDir, 'lib', 'utils'));
var c = require(path.join(scriptDir, 'lib', 'siteConfig'));
var p = require(path.join(scriptDir, 'lib', 'sitePaths'));
var CardFetcher = require(path.join(scriptDir, 'lib', 'cardFetcher'));
var nunjucks = require('nunjucks');
var contentPage = require(path.join(scriptDir, 'lib', 'contentPage'));

nunjucks.configure({
    lstripBlocks: true,
    trimBlocks: true
});
nunjucks.configure(p.templates, { autoescape: true });

var softwareCards =  new CardFetcher("software").data;

function outputTopPage() {
    var tmplPath = path.join(p.content, 'index.md');
    var tmpl = fs.readFileSync(tmplPath).toString();
    contentPage(tmpl, p.builddir, 'index.md', {});
}

if (require.main === module) {
    outputTopPage();
} else {
    module.exports = outputTopPage;
}
