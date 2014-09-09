// Libraries
var couchapp = require('couchapp');
var fs = require('fs');
var config = require(__dirname + '/../db.config.json');

// Design doc path
var docPath = __dirname + '/design_docs/';

// Find all the design doc files
var files = fs.readdirSync(docPath).filter(function(file) {
  // Ensure no dotfiles
  return file.charAt(0) !== '.';
}).map(function(file) {
  // Get full path to each doc
  return docPath + file;
}).forEach(function(file) {
  
  // Construct the couchdb URL from configuration data
  var url = 'http://' + config.couch.host + ':' + config.couch.port + '/' + config.couch.db;
  console.log(__dirname);
  // Create a couch app and push
  couchapp.createApp(require(file), url, function(app) {
    app.push();
  });
  
});