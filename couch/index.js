var main = function() {
  
  // libraries
  var couchapp = require('couchapp');
  var fs = require('fs');
  var config = require(__dirname + '/../db.config.json');

  // design doc path
  var docPath = __dirname + '/design_docs/';

  // db details from config
  var dbConfig = null;
  if(process.argv.length < 3) {
    dbConfig = config.couch;
  }
  else {
    dbConfig = config[process.argv[2]];
  }
  if (dbConfig == null) {
    return console.error("Unknown db configuration");
  }

  // find all the design doc files
  var files = fs.readdirSync(docPath).filter(function(file) {
    // ensure no dotfiles
    return file.charAt(0) !== '.';
  }).map(function(file) {
    // get full path to each doc
    return docPath + file;
  }).forEach(function(file) {
    
    // construct the couchdb URL from configuration data
    var url = dbConfig.protocol + '://' + dbConfig.host + ':' + dbConfig.port + '/' + dbConfig.db;
    
    console.log(url);
    // create a couch app and push
    couchapp.createApp(require(file), url, function(app) {
      app.push();
    });
    
  });
};

main();