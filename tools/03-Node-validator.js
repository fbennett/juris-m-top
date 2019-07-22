#!/usr/bin/node
'use strict';

var validator = require('nu-web-validator');


var opt = require('node-getopt').create([
    ['s'		, 'schema=ARG', "Validation schema to use for processing"],
    ['j' 		, 'japanese' , 'Report on missing Japanese and non-language data.'],
    ['e' 		, 'english' , 'Report on missing English only.'],
    ['c' 		, 'compare=ARG' , 'Compare Japanese with cache files in DIR.'],
    ['o' 		, 'output=ARG' , 'Output file for report.'],
    ['h'		, 'help', 'This help message']
    
])              // create Getopt instance
    .bindHelp()     // bind option 'help' to default action
    .parseSystem(); // parse command line

if (!opt.options.schema) {
    console.log('Error: must specify a schema with the -s option.');
    process.exit(1);
}
var allowedArray;
switch (opt.options.schema) {
case 'staff':
    allowedArray = [
        {
            full: 'japanese',
            nick:'-j'
        },
        {
            full: 'english',
            nick: '-e'
        },
        {
            full: 'compare',
            nick: '-c'
        }
    ]
    break;
    ;;
case 'contacts':
    allowedArray = [
        {
            full: 'japanese',
            nick:'-j'
        },
        {
            full: 'english',
            nick: '-e'
        }
    ]
    break;
    ;;
}
var allowedModeNames = allowedArray.map(function(elem){
    return elem.full;
});
var requiredModeFlags = allowedArray.map(function(elem){
    return elem.nick
});
requiredModeFlags = [
    requiredModeFlags.slice(0, -1).join(', '),
    requiredModeFlags[requiredModeFlags.length - 1]
].join(' or ')

var count = 0;
for (var o of allowedModeNames) {
    if (opt.options[o]) {
        count += 1;
    }
}
if (count === 0) {
    console.log('Error: with ' + opt.options.schema + ' schema, one of ' + requiredModeFlags + ' is required.');
    process.exit(1);
}
if (count > 1) {
    console.log('Error: only one of ' + requiredModeFlags + ' is allowed.');
    process.exit(1);
}
var params = {
    output: opt.options.output,
    schema: opt.options.schema
}
if (!opt.options.compare) {
    if (opt.options.japanese) {
        params.mode = 'japanese';
    } else {
        params.mode = 'english';
    }
    validator.validate(params);
} else if (opt.options.compare) {
    params.compare = opt.options.compare;
    validator.compare(params);
}


