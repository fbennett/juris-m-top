var connect = require('connect');
var path = require('path');
pagePath = path.join(__dirname, '..', '..', 'build');
var serveStatic = require('serve-static');
connect().use(serveStatic(pagePath)).listen(8080, function(){
    console.log('Server running on 8080...');
});
