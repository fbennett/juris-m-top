var fs = require('fs');
var path = require('path');
var scriptDir = path.dirname(require.main.filename);
var p = require(path.join(scriptDir, 'lib', 'sitePaths'));
var nunjucks = require('nunjucks');
nunjucks.configure(p.embeds, {
    autoescape: true,
    lstripBlocks: true,
    trimBlocks: true
});
var axios = require('axios');
var Promise = require('bluebird');

var stub = "https://our.law.nagoya-u.ac.jp/alumni/api/";

var getRest = Promise.coroutine(function*(pth){
    var obj = yield axios({
        method: "get",
        url: stub + pth,
        responseType: "json"
    });
    var topicIndex = {
        lawblogs: {
            pageTitle: "Law Blogs",
            toppath: new p.getRelative(["alumni", "lawblogs"]).toppath,
            posts: [],
            current: {
                programs: "",
                curriculum: "",
                directory: "",
                resources: "",
                alumni: " current"
            }
        },
        projectblogs: {
            pageTitle: "Project Blogs",
            toppath: new p.getRelative(["alumni", "projectblogs"]).toppath,
            posts: [],
            current: {
                programs: "",
                curriculum: "",
                directory: "",
                resources: "",
                alumni: " current"
            }
        }
    };
    var topics = obj.data.topics;
    for (var topicinfo of topics) {
        var publishMe = topicinfo.tags.filter(function(elem, idx, arr){
            if (elem.value === "lawblogs" || elem.value === "projectblogs") {
                return true;
            } else {
                return false;
            }
        });
        //console.log(JSON.stringify(topicinfo, null, 2))
        if (publishMe.length) {
            var o = yield axios({
                method: "get",
                url: stub + "topic/" + topicinfo.slug,
                responseType: "json"
            });
            var blogname = publishMe[0].value;
            var data = o.data;
            var post = o.data.posts[0];
            // Normalize heading levels
            var lst = [];
            var splt = post.content.split(/\<(?:h[0-9]+|\/h[0-9])/);
            if (splt.length > 1) {
                var minH = null;
                var m = post.content.match(/\<(?:h[0-9]+|\/h[0-9])/g);
                for (var i=0,ilen=m.length;i<ilen;i++) {
                    var val = parseInt(m[i].match(/([0-9]+)/)[1], 10);
                    if (minH === null || val < minH) {
                        minH = val;
                    }
                    lst.push(splt[i]);
                    lst.push(m[i]);
                }
                lst.push(splt[splt.length-1]);
                var offset = (2 - minH);
                for (var i=1,ilen=lst.length;i<ilen;i += 2) {
                    var m = lst[i].match(/(^[^0-9]*)([0-9]+)$/);
                    var val = parseInt(m[2], 10);
                    val = (val + offset);
                    lst[i] = m[1] + val;
                }
                post.content = lst.join("");
            }
            var dirPath = ["alumni", blogname];
            var pagedirs = new p.getRelative(dirPath);

            var params = {
                id: data.tid,
                pageTitle: data.title,
                author: post.user.fullname ? post.user.fullname : post.user.username,
                date: post.timestampISO.slice(0, 10),
                content: post.content,
                slug: topicinfo.slug,
                blogname: blogname,
                blogtitle: topicIndex[blogname].pageTitle,
                toppath: pagedirs.toppath,
                current: {
                    programs: "",
                    curriculum: "",
                    directory: "",
                    resources: "",
                    alumni: " current"
                }
            }
            topicIndex.projectblogs.posts.push(params);
            var page = nunjucks.render("blogPost.html", params);
            fs.writeFileSync(path.join(p.builddir, "alumni", blogname, params.id + ".html"), page);
        }
    }
    // Index of law posts
    var page = nunjucks.render("blogList.html", topicIndex.lawblogs);
    fs.writeFileSync(path.join(p.builddir, "alumni", "lawblogs", "index.html"), page);
    // Index of project posts
    var page = nunjucks.render("blogList.html", topicIndex.projectblogs);
    fs.writeFileSync(path.join(p.builddir, "alumni", "projectblogs", "index.html"), page);
});

getRest("category/3/blogs");

/*
 * 
 * topics:
 *   -
 *     slug: 5/testing
 *     tags:
 *       - 
 *         value: publish
 *
 */
