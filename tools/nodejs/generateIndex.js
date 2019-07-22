var fs = require('fs');
var path = require('path');
var dom = require('xmldom').DOMParser;
var axios = require('axios');
var Promise = require('bluebird');
var xpath = require('xpath');
var scriptDir = path.dirname(require.main.filename);
var p = require(path.join(scriptDir, 'lib', 'sitePaths'));
var lunr = require(path.join(scriptDir, 'lib', 'lunr'));

// Data variables
var idxSrc = [];
var idxStore = {};

// Utility functions
var harvestItem = Promise.coroutine(function*(pth, type, presenter, title, txt, grabNode) {
    txt = txt.replace(/[\s\n\r]+/g, " ");
    idxStore[pth] = {
        title: title,
        presenters: presenter,
        type: type
    }
    var idxEntry = {
        name: pth,
        title: presenter + " " + title,
        text: txt
    }
    if (grabNode) {
        // Extend if grabNode argument is used
        console.log("Grab external page");
        var anchors = grabNode.getElementsByTagName("a");
        for (var i=0,ilen=anchors.length;i<ilen;i++) {
            var href = anchors[i].getAttribute("href");
            if (href && href.slice(0, 4) === "http") {
                idxEntry.text += " " + cleanTxtFromUrl(href);
            }
        }
    }
    idxSrc.push(idxEntry);
});

function cleanHtml (str) {
    return str.replace(/&[#a-zA-A0-9]+;/g, " ")
        .replace(/<[bB][rR]\s*>/g, " ")
        .replace(/<[iI][mM][gG][^>]*>/g, " ");
}

function cleanDocument(doc) {
    var scripts = doc.getElementsByTagName("script");
    for (var i=0,ilen=scripts.length;i<ilen;i++) {
        scripts[i].parentNode.removeChild(scripts[i]);
    }
    return doc;
}

function cleanHtmlFromFile(pth) {
    return cleanHtml(fs.readFileSync(pth).toString());
}

var cleanTxtFromUrl = Promise.coroutine(function*(url) {
    var response = yield axios({
        method: "get",
        url: url,
        responseType: "text"
    })
    
    var rawHTML = cleanHtml(response.data);
    var document = new dom().parseFromString(rawHTML);
    document = cleanDocument(document);
    var txt = document.getElementsByTagName("body")[0].textContent;
    txt = txt.trim();
    txt = txt.split(/[\n\r]+/).slice(0, -1).join("\n");
    return txt;
});

// Trawls

var run = Promise.coroutine(function*(){

    // Events
    for (var filename of fs.readdirSync(path.join(p.builddir, "events"))) {
        if (filename.slice(-5) !== ".html") continue;
        //console.log(path.join(p.builddir, "events", filename))
        var rawHTML = cleanHtmlFromFile(path.join(p.builddir, "events", filename));
        var doc = new dom().parseFromString(rawHTML);
        var body = doc.getElementById('proper-page');

        var pth = filename.slice(0, -5);
        var title = xpath.select('.//h4[contains(@class, "event-title")]', body)[0].textContent;
        var presenter = xpath.select('.//span[contains(@class, "presenter-name")]', body)[0].textContent + ", ";
        var txt = "";
        var nodes = xpath.select('.//h4[contains(@class, "event-title")]|.//h5|.//p|.//span[contains(@class, "session-title")]', body)
        for (var node of nodes) {
            txt += node.textContent + " ";
        }
        yield harvestItem(pth, "events", presenter, title, txt);
    }

    var externalGrabs = {
        "international-education-and-exchange-center": true,
        "international-language-center": true
    }

    // Contacts
    for (var category of ["external", "university", "gsl"]) {
        console.log(path.join(p.builddir, "directory", category, "index.html"))
        var rawHTML = cleanHtmlFromFile(path.join(p.builddir, "directory", category, "index.html"));
        var doc = new dom().parseFromString(rawHTML);
        var body = doc.getElementById('proper-page');
        var rows = xpath.select('.//div[contains(@class, "row")]', body);
        for (var row of rows) {
            var grabNode;
            var pth = row.getAttribute('id');
            if (externalGrabs[pth]) {
                grabNode = row;
            } else {
                grabNode = null;
            }
            var presenter = "";
            var title = xpath.select('.//h4[contains(@class, "contact-title")]', row)[0].textContent;
            var txt = "";
            var nodes = xpath.select('.//h4|.//div/p', row);
            for (var node of nodes) {
                txt += node.textContent + " ";
            }
            yield harvestItem(pth, category, presenter, title, txt, grabNode);
        }
    }

    // Local HTML documents -- just two at the moment
    console.log(path.join(p.builddir, "resources", "documents", "proposals.html"))
    var rawHTML = cleanHtmlFromFile(path.join(p.builddir, "resources", "documents", "proposals.html"));
    var doc = new dom().parseFromString(rawHTML);
    var body = doc.getElementById('proper-page');

    var pth = "https://www.law.nagoya-u.ac.jp/en/resources/documents/proposals.html";
    var presenter = "";
    var title = doc.getElementsByTagName("title")[0].textContent;
    var txt = body.textContent;
    yield harvestItem(pth, "localdoc", presenter, title, txt);

    console.log(path.join(p.builddir, "resources", "documents", "asci-faq.html"))
    var rawHTML = cleanHtmlFromFile(path.join(p.builddir, "resources", "documents", "asci-faq.html"));
    var doc = new dom().parseFromString(rawHTML);
    var body = doc.getElementById('proper-page');

    var pth = "https://www.law.nagoya-u.ac.jp/en/resources/documents/asci-faq.html";
    var presenter = "";
    var title = doc.getElementsByTagName("title")[0].textContent;
    var txt = body.textContent;
    yield harvestItem(pth, "localdoc", presenter, title, txt);
    

    // Build the index
	var idx = lunr(function () {
		this.ref('name');
		this.field('title');
		this.field('text');
		idxSrc.forEach(function (arrayItem) {
			var parsedData 	= {
				name 		: String(arrayItem.name),
				title 		: String(arrayItem.title),
				text		: String(arrayItem.text)
			}
            console.log("Add doc, with type "+idxStore[parsedData.name].type + " and name " + parsedData.name);
			this.add(parsedData)
		}, this);
	});
    // Set TIMESTAMP
    var TIMESTAMP = new Date().getTime();
    fs.writeFileSync(path.join(p.builddir, "TIMESTAMP.json"), TIMESTAMP);
    
    // Write the index
    fs.writeFileSync(path.join(p.builddir, 'idx_' + TIMESTAMP + '.json'), JSON.stringify({
        index: idx,
        store: idxStore
    }));
});

run();
