'use strict';

var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');
var validator = require('nu-web-validator');
var slug = require('slug');
slug.defaults.mode = 'rfc3986';
var marked = require('marked');
var yaml = require('js-yaml');
var nunjucks = require('nunjucks');
var scriptDir = path.dirname(require.main.filename);
var p = require(path.join(scriptDir, 'lib', 'sitePaths'));
marked.setOptions({
    smartypants: true
});
nunjucks.configure({
    lstripBlocks: true,
    trimBlocks: true
});
nunjucks.configure(p.templates, { autoescape: true });

function normalizeLineEndings(txt) {
    return txt.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function linkMarkupSafely(str) {
    // Oops. Need to catch multiples possibly.
    var context = str.split(/(?:(?:^|\s+)http.?:\/\/[^\s]+|[^\s]+@[^\s]+)/);
    var targets = str.match(/(?:(?:^|\s+)http.?:\/\/[^\s]+|[^\s]+@[^\s]+)/);
    if (targets) {
        for (var i=0,ilen=targets.length;i<ilen;i++) {
            var str = targets[i];
            //str = str.replace(/\_/g, '\\_');
            var visual = str
            if (visual.length > 35) {
                visual = visual.slice(0, 35) + '…';
            }
            // Zero-width space before period and before slash
            // (there characters are there in the replace string,
            // they just don't show on the monitor -- move the
            // cursor caret past them and they kind of show.)
            visual = visual.replace('.', '​.').replace('/', '​/')
            if (str.indexOf('@') > -1) {
                targets[i] = '[' + visual + '](mailto:' + str + ')';
            } else {
                targets[i] = '[' + visual + '](' + str + ')';
            }
        }
        var lst = [];
        for (var i=0,ilen=context.length-1;i<ilen;i++) {
            lst.push(context[i]);
            lst.push(targets[i]);
        }
        lst.push(context[context.length-1]);
        return lst.join('');
    }
    return str;
}
function makeList(obj, singleItem, canSuppress) {
    if (obj) {
        if ('string' === typeof obj || 'number' === typeof obj) {
            obj = "" + obj;
            if (canSuppress && obj.slice(0, 1) == '-') {
                return null;
            }
            obj = linkMarkupSafely(obj);
            obj = marked(obj).replace(/^<p>(.*)<\/p>\s*$/, '$1');
            if (singleItem) {
                return obj;
            } else {
                return [obj];
            }
        } else if (obj.length) {
            for (var i=obj.length;i>-1;i--) {
                if ("object" === typeof obj[i]) {
                    // if it's a hash object or a list, just leave it.
                } else if (obj[i]) {
                    // Probably number or string
                    obj[i] = "" + obj[i];
                    if (canSuppress && obj[i].slice(0, 1) === '-') {
                        obj = obj.slice(0,i).concat(obj.slice(i+1))
                        continue;
                    }
                    obj[i] = linkMarkupSafely(obj[i]);
                    obj[i] = marked(obj[i]).replace(/^<p>(.*)<\/p>\s*$/, '$1');;
                } else {
                    // if it's empty, drop it.
                    obj = obj.slice(0,i).concat(obj.slice(i+1));
                }
            }
            if (singleItem) {
                return obj[0];
            } else {
                if (obj.length > 0) {
                    return obj;
                } else {
                    return null;
                }
            }
        } else if (obj.en) {
            return makeList(obj.en)
        } else if ("object" === typeof obj) {
            return [obj];
        } else {
            return null;
        }
    }
}

function makeLinkSlug(data, link) {
    var myslug = "";
    if (data.title) {
        myslug = data.slug
            + '---'
            + slug(link.label, {remove: /[.]/g});
        if (link.sublabel) {
            myslug +=
                '-'
                + slug(link.sublabel, {remove: /[.]/g});
        }
        if (link.lang) {
            myslug += 
                '-'
                + slug(link.lang, {remove: /[.]/g });
        }
    }
    return myslug;
}

function makeSlug(title) {
    return slug(title, {remove: /[.]/g})
}

function extractYAML(txt) {
    var yamlCount = 0;
    var objList = [];
    var yamlList = [];
    var endPos = -1;
    var lines = normalizeLineEndings(txt).split("\n");
    for (var i=lines.length-1;i>-1;i--) {
        var line = lines[i];
        var seeLine = line.trim();
        if (seeLine.match(/^```\s*yaml$/)) {
            if (endPos > -1) {
                // Source and object
                var embeddedYAML = lines.slice(i+1, endPos).join('\n');
                var obj = yaml.safeLoad(embeddedYAML);
                obj.id = 'yaml' + yamlCount;
                yamlList.push(embeddedYAML);
                objList.push(obj);
                // Template
                lines[endPos] = "{{ yaml" + yamlCount + "|safe }}";
                yamlCount += 1;
                lines = lines.slice(0, i).concat(lines.slice(endPos))
                endPos = -1;
            }
        } else if (seeLine === "```") {
            endPos = i;
        }
    }
    return {
        tmpl: lines.join('\n'),
        objList: objList,
        yamlList: yamlList
    }
}

var loadAndValidate = Promise.coroutine(function*(errors, fullpath, type, txt, isDraft, yamlCount) {
    if (!txt) {
        txt = fs.readFileSync(fullpath).toString();
    }
    try {
        var obj = yaml.safeLoad(txt);
        // validate here as type
        if (!type) {
            type = obj.type;
        }
        var err = yield validator.validate(obj, {mode: 'english', schema: type});
        if (err.length) {
            if (!errors[fullpath]) {
                errors[fullpath] = {
                    fail: true,
                    messages: []
                };
            }
            if (isDraft) {
                errors[fullpath].fail = false;
            }
            var prefix = "";
            if ("number" === typeof yamlCount) {
                for (var i in err) {
                    err[i].label = ("#" + yamlCount + ": " + err[i].label);
                }
            }
            errors[fullpath].messages = errors[fullpath].messages.concat(err);
        }
    } catch (e) {
        var lst = e.message.split('\n');
        var msg = lst[0];
        var literal = lst.slice(1).join('\n').trim();
        if (!errors[fullpath]) {
            errors[fullpath] = {
                fail: true,
                messages: []
            }
        }
        errors[fullpath].messages.push({
            label: "Formatting error in YAML",
            message: msg
        });
    }
    return errors;
});

module.exports = {
    makeList: makeList,
    makeLinkSlug: makeLinkSlug,
    makeSlug: makeSlug,
    extractYAML: extractYAML,
    loadAndValidate: loadAndValidate,
    normalizeLineEndings: normalizeLineEndings
}
