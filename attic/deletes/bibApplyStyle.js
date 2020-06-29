'use strict';

var path = require('path');
var scriptDir = path.dirname(require.main.filename);

var fs = require('fs');
var CSL = require('citeproc');
var langSettings = require(path.join(scriptDir, 'lib', 'bibLangConfig'));

function setLanguages(citeproc, obj) {
	citeproc.setLangPrefsForCites(obj, function(key){return 'citationLangPrefs'+key});
	citeproc.setLangTagsForCslTransliteration(obj.citationTransliteration);
	citeproc.setLangTagsForCslTranslation(obj.citationTranslation);
	citeproc.setLangTagsForCslSort(obj.citationSort);
	citeproc.setLangPrefsForCiteAffixes(obj.citationAffixes);
	//citeproc.setAutoVietnameseNamesOption(Zotero.Prefs.get('csl.autoVietnameseNames'));
}

function bibmaker (data) {
    var staffTags = data.staffTags;
    var pubTags = data.pubTags;
    var staffPubs = data.staffPubs;
    var allPubs = data.allPubs;

    var staffBibs = {};
    var tagBibs = {};

    var locales = {};
    var lang_bases = CSL.LANG_BASES;
    for (var lang in lang_bases) {
        var langCode = lang_bases[lang].replace('_', '-')
        var localePath = path.join(scriptDir, 'locales', 'locales-' + langCode + '.xml')
        var locale = fs.readFileSync(localePath)
        locales[langCode] = locale.toString();
    }
    var enStylePath = path.join(scriptDir, 'styles', 'jm-cms-en.csl')
    var enStyle = fs.readFileSync(enStylePath);
    enStyle = enStyle.toString();
    
    var jaStylePath = path.join(scriptDir, 'styles', 'jm-cms-multi.csl')
    var jaStyle = fs.readFileSync(jaStylePath);
    jaStyle = jaStyle.toString();
    
    var sys = {
        retrieveItem: function(id) {
            return allPubs[id];
        },
        retrieveLocale: function (locale) {
            return locales[locale];
        }
    }

    var enCiteproc = new CSL.Engine(sys, enStyle);
    setLanguages(enCiteproc, langSettings);
    
    var jaCiteproc = new CSL.Engine(sys, jaStyle);
    
    // Bibs for each staff member
    var items = [];
    for (var staffCode in staffPubs) {
        staffBibs[staffCode] = {
            data: {
                books: {
                    en: "",
                    ja: ""
                },
                others: {
                    en: "",
                    ja: ""
                }
            }
        };
        for (var type of ['books', 'others']) {
            let pubs = staffPubs[staffCode][type];
            let items = Object.keys(pubs).map(function(key) {
                return pubs[key].id;
            });
            jaCiteproc.updateItems(items);
            var bibLst = jaCiteproc.makeBibliography();
            staffBibs[staffCode].data[type].ja = bibLst[1].map(function(str){
                return str.replace(/^\s*<div class="csl-entry">/, '')
                    .replace(/<\/div>\s*$/, '\n');
            });

            enCiteproc.updateItems(items);
            bibLst = enCiteproc.makeBibliography();
            staffBibs[staffCode].data[type].en = bibLst[1].map(function(str){
                return str.replace(/^\s*<div class="csl-entry">/, '')
                    .replace(/<\/div>\s*$/, '\n');
            });
        }
    }
    // Bibs for each subject category
    for (var tag in pubTags) {
        tagBibs[tag] = {
            tagCount: Object.keys(pubTags[tag]).length,
            staffCount: Object.keys(staffTags[tag]).length,
            data: {
                en: "",
                ja: ""
            }
        };
        let items = Object.keys(pubTags[tag]);

        jaCiteproc.updateItems(items);
        var bibLst = jaCiteproc.makeBibliography();
        tagBibs[tag].data.en = bibLst[1].map(function(str){
                return str.replace(/^\s*<div class="csl-entry">/, '')
                    .replace(/<\/div>\s*$/, '\n');
            });

        enCiteproc.updateItems(items);
        bibLst = enCiteproc.makeBibliography();
        tagBibs[tag].data.en = bibLst[1].map(function(str){
                return str.replace(/^\s*<div class="csl-entry">/, '')
                    .replace(/<\/div>\s*$/, '\n');
            });
    }
    return {
        staffBibs: staffBibs,
        tagBibs: tagBibs,
        staffTags: staffTags
    }
}
module.exports = bibmaker;
