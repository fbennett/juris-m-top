'use strict';

var fs = require('fs');
var path = require('path');
var nunjucks = require('nunjucks');
var scriptDir = path.dirname(require.main.filename);
var utils = require(path.join(scriptDir, 'lib', 'utils'));
var p = require(path.join(scriptDir, 'lib', 'sitePaths'));

nunjucks.configure(
    p.embeds,
    {
        lstripBlocks: true,
        trimBlocks: true,
        autoescape: true
    });

var data = {
    pageTitle: "Jurism Blog",
    posts: []
}
var files = fs.readdirSync(p.blog);
files.sort();
files.reverse();
for (var fn of files) {
    if (fn.slice(-3) !== ".md") continue;
    var filePath = path.join(p.blog, fn);
    var txt = fs.readFileSync(filePath).toString();
    var { txt, header } = utils.breakOutText(filePath, txt);
    data.posts.push(header);
}

var page = nunjucks.render('blogList.html', data);

fs.writeFileSync(path.join(scriptDir, "..", "..", "docs", "posts", "index.html"), page);
