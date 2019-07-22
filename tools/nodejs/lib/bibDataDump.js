'use strict';

var fs = require('fs');
var path = require('path');

module.exports = {
    processed: function bibDataOut(dataoutput, acc) {
        var staffBibs = acc.staffBibs;
        var tagBibs = acc.tagBibs;
        // Create directories if necessary
        for (var dirName of ['staffBibs', 'tagBibs']) { 
            var dir = path.join(dataoutput, dirName);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, "0744");
            }
        }
        // Write individual staff bib data to separate files
        for (var staffCode in staffBibs) {
            var fn = staffCode + '.json';
            fs.writeFileSync(path.join(dataoutput, 'staffBibs', fn), JSON.stringify(staffBibs[staffCode], null, 2));
        }
        // Write individual tag bib data to separate files
        for (var tag in tagBibs) {
            var fn = tag + '.json';
            fs.writeFileSync(path.join(dataoutput, 'tagBibs', fn), JSON.stringify(tagBibs[tag], null, 2));
        }
        console.log("Wrote JSON data for bibliographies to " + dataoutput);
    },
    raw: function(dataoutput, data) {
        fs.writeFileSync(path.join(dataoutput, 'allPubs.json'), JSON.stringify(data.allPubs, null, 2));
        fs.writeFileSync(path.join(dataoutput, 'staffPubs.json'), JSON.stringify(data.staffPubs, null, 2));
        fs.writeFileSync(path.join(dataoutput, 'pubTags.json'), JSON.stringify(data.pubTags, null, 2));
        fs.writeFileSync(path.join(dataoutput, 'staffTags.json'), JSON.stringify(data.staffTags, null, 2));
        console.log("Wrote intermediate JSON bibliography data to " + dataoutput);
    }
}
