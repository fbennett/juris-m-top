'use strict';

var Joi = require('joi');
var fs = require('fs');
var path = require('path');
var yaml = require('js-yaml');
var scriptDir = path.dirname(require.main.filename);
var p = require(path.join(scriptDir, 'lib', 'sitePaths'));

//                                dataObject: session,
//                                sourcePath: calendarPath,
//                                timestampKey: 'last-modified',
//                                timestampValue: thisDater.utcTimeStamp
//                                getIdInfo: getCalendarID,

var cacheSchema = Joi.object().keys({
    dataObject: Joi.object(),
    timestampKey: Joi.string(),
    timestampValue: Joi.string(),
    getIdInfo: Joi.func()
}).requiredKeys('', 'dataObject', 'getIdInfo', 'timestampKey', 'timestampValue');

module.exports = function(data) {
    Joi.validate(data, cacheSchema, function(err, value){
        if (err) {
            console.log(err.name + ": " + err.message);
            console.log("Here's the object that failed:\n" + JSON.stringify(value, null, 2))
            process.exit(1);
        }
    });
    var changed = false;
    var cacheFolder = path.join(p.centerinfo, 'cache')
    if (!fs.existsSync(cacheFolder)) {
        fs.mkdirSync(cacheFolder)
    }
    var idInfo = data.getIdInfo(data.dataObject);
    var cacheFilePath = path.join(cacheFolder, idInfo.fn + '.yml');
    if (!data.dataObject.id) {
        // New entry
        // Save to cache with ID, then add updated.
        data.dataObject.id = idInfo.id;
        data.dataObject.fn = idInfo.fn;
        var cacheYAML = yaml.safeDump(data.dataObject, {sortKeys: true});
        fs.writeFileSync(cacheFilePath, cacheYAML);
        data.dataObject[data.timestampKey] = data.timestampValue;
        changed = true;
    } else if (fs.existsSync(cacheFilePath)) {
        var cacheYAML = fs.readFileSync(cacheFilePath);
        if ("undefined" !== typeof data.dataObject[data.timestampKey]) {
            var updated = data.dataObject[data.timestampKey];
            delete data.dataObject[data.timestampKey];
            var strippedDataYAML = yaml.safeDump(data.dataObject, {sortKeys: true});
            if (strippedDataYAML != cacheYAML) {
                fs.writeFileSync(cacheFilePath, strippedDataYAML);
                data.dataObject[data.timestampKey] = data.timestampValue;
                changed = true;
            } else {
                data.dataObject[data.timestampKey] = updated;
            }
        } else {
            // If for some bizzare reason there is no updated
            // in the object, cache it and touch updated.
            var cacheYAML = yaml.safeDump(data.dataObject, {sortKeys: true});
            fs.writeFileSync(cacheFilePath, cacheYAML);
            data.dataObject[data.timestampKey] = data.timestampValue;
            changed = true;
        }
    } else {
        // Uh-oh. No entry found in the cache for the known ID
        // Add to cache.
        if ("undefined" !== typeof data.dataObject[data.timestampKey]) {
            delete data.dataObject[data.timestampKey];
        }
        var cacheYAML = yaml.safeDump(data.dataObject, {sortKeys: true});
        fs.writeFileSync(cacheFilePath, cacheYAML);
        // Restore update to object
        data.dataObject[data.timestampKey] = data.timestampValue;
        changed = true;
    }
    return {
        dataObject: data.dataObject,
        fn: idInfo.fn,
        changed: changed,
    }
}
