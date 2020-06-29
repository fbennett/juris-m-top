var fs = require('fs');
var path = require('path');
var util = require('util');
var walkSync = require('walk-sync');
var yaml = require('js-yaml');
var Promise = require('bluebird');
var nunjucks = require('nunjucks');
var validator = require('nu-web-validator');
var scriptDir = path.dirname(require.main.filename);
var utils = require(path.join(scriptDir, 'lib', 'utils'));
var p = require(path.join(scriptDir, 'lib', 'sitePaths'));
nunjucks.configure(p.embeds, {
    lstripBlocks: true,
    trimBlocks: true,
    autoescape: true
});

var branches = [
    "content",
    "forms",
    "documents",
    "centerinfo",
    "contacts",
    "staffinfo"
]

var updates = {};

var oldTimestamp = 0;
if (fs.existsSync(path.join(p.root, "TIMESTAMP"))) {
    oldTimestamp = parseFloat(fs.readFileSync(path.join(p.root, "TIMESTAMP")));
}

// Walk each hierarchy.
var run = Promise.coroutine(function*(){
    var errors = {};
    for (var branch of branches) {
        var top = p[branch];
        var paths = walkSync(top, {directories: true, globs: ['**']});
        for (var pth of paths) {
            var isDraft = false;
            var pthList = pth.split(path.sep);
            if (pthList.indexOf("cache") > -1 || pthList.indexOf("info.yml") > -1) {
                continue;
            }
            if (pth.slice(-4) !== ".yml" && pth.slice(-3) !== ".md") {
                continue;
            }
            if (pthList.indexOf("00_template.yml") > -1) {
                continue;
            }
            var fullpath = path.join(top, pth);
            var newTimestamp = fs.statSync(fullpath).mtime.getTime();
            // Triage
            if (pthList.indexOf("Announcements") > -1) {
                if (newTimestamp > oldTimestamp) {
                    updates.news = true;
                }
                errors = yield utils.loadAndValidate(errors, fullpath, "announcements");
            } else if (pthList.indexOf("Events") > -1) {
                if (newTimestamp > oldTimestamp) {
                    updates.news = true;
                }
                errors = yield utils.loadAndValidate(errors, fullpath, "events");
            } else if (pth.slice(-3) === ".md") {
                if (newTimestamp > oldTimestamp) {
                    updates.pages = true;
                }
                var txt = fs.readFileSync(path.join(top, pth)).toString();
                var res = utils.extractYAML(txt);
                var yamlCount = 1;
                for (var embeddedYAML of res.yamlList) {
                    // validate here as embedProgramInfo
                    errors = yield utils.loadAndValidate(errors, fullpath, null, embeddedYAML, null, yamlCount);
                    yamlCount++;
                }
            } else {
                if (pthList.slice(-1)[0].slice(0, -4) !== pthList.slice(-2)[0]) {
                    isDraft = true;
                } else {
                    if (newTimestamp > oldTimestamp) {
                        updates.staff = true;
                    }
                }
                errors = yield utils.loadAndValidate(errors, fullpath, "staff", null, isDraft);
            }
        }
    }
    var fail = false;
    for (var target in errors) {
        if (errors[target].fail) {
            fail = true;
        }
    }
    // Write the RSS to build
    var d = new Date();
    var utcTimeStamp = d.toISOString().replace(/\.[0-9]+Z/, 'Z');
    var params = {
        updated: utcTimeStamp,
        errors: errors
    }
    fs.writeFileSync(path.join(p.builddir, "status.html"), nunjucks.render('status.html', params));
    if (fail) {
        process.exit(1);
    } else {
        //fs.writeFileSync(path.join(p.root, "UPDATES.json"), JSON.stringify(updates, null, 2));
        fs.writeFileSync(path.join(p.root, ".TIMESTAMP"), Date.now())
        process.stdout.write(Object.keys(updates).join(" "));
        process.exit(0);
    }
});

run();
