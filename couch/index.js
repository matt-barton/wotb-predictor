var main = function() {
  
  // libraries
  var fs = require('fs');

  // design doc path
  var docPath = __dirname + '/design_docs/';

  // db details from config
  var environment;
  if(process.argv.length < 3) {
    environment = 'dev';
  }
  else {
    environment = process.argv[2];
  }

  var cradleSetup, database;
  switch (environment) {
    case 'dev':
    case 'development':
      cradleSetup = {
        host: process.env.DEV_COUCH_HOST,
        port: process.env.DEV_COUCH_PORT
      };
      if (process.env.DEV_COUCH_USERNAME != null) {
          cradleSetup.secure = true;
          cradleSetup.auth = {
              "username": process.env.DEV_COUCH_USERNAME,
              "password": process.env.DEV_COUCH_PASSWORD
          };
      }
      database = process.env.DEV_COUCH_DB;
    break;

    case 'cloudant':
    case 'production':
      cradleSetup = {
        host: process.env.PROD_COUCH_HOST,
        port: process.env.PROD_COUCH_PORT
      };
      if (process.env.PROD_COUCH_USERNAME != null) {
          cradleSetup.secure = true;
          cradleSetup.auth = {
              "username": process.env.PROD_COUCH_USERNAME,
              "password": process.env.PROD_COUCH_PASSWORD
          };
      }
      database = process.env.PROD_COUCH_DB;
    break;

    default:
      return console.error('Unknown environment');
    break
  }

  var cradle = require('cradle');
  var dbAccess = new (cradle.Connection)(cradleSetup);
   
  var db = dbAccess.database(database);
  db.exists(function(e, exists) {
    if (e) return console.error(e);
    if (!exists) db.create();
  });

  // find all the design doc files
  var files = fs.readdirSync(docPath).filter(function(file) {
    // ensure no dotfiles
    return file.charAt(0) !== '.';
  }).map(function(file) {
    // get full path to each doc
    return docPath + file;
  }).forEach(function(file) {
    designDoc = require(file);
    db.save(designDoc._id, designDoc, function (e, result) {
      if (e) return console.error(e);
      console.log();
      console.log(result.id + ' saved, now at revision ' + result.rev);
      db.viewCleanup(function(e, result) {
        if (e) return console.error(e);
      });
    });
  });
}

main();