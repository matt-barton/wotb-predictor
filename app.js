'use strict';

/*
 * Express Dependencies
 */
var express = require('express');
var app = express();
var port = 3000;
var bodyParser = require('body-parser');

/*
* Database
*/
var dbConfig = require('./db.config.json');
var cradle = require('cradle');
var db = new(cradle.Connection)(dbConfig.couch.host, dbConfig.couch.port, dbConfig.couch.options)
    .database(dbConfig.couch.db);

/*
* Libraries
*/
var pages = require('./lib/pages');

/*
 * Use Handlebars for templating
 */
var exphbs = require('express3-handlebars');
var hbs;

// For gzip compression
app.use(express.compress());

// Handle http post
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
app.use(express.urlencoded());
app.use(express.json());

/*
 * Config for Production and Development
 */
if (process.env.NODE_ENV === 'production') {
    // Set the default layout and locate layouts and partials
    app.engine('handlebars', exphbs({
        defaultLayout: 'main',
        layoutsDir: 'dist/views/layouts/',
        partialsDir: 'dist/views/partials/'
    }));

    // Locate the views
    app.set('views', __dirname + '/dist/views');
    
    // Locate the assets
    app.use(express.static(__dirname + '/dist/assets'));

} else {
    app.engine('handlebars', exphbs({
        // Default Layout and locate layouts and partials
        defaultLayout: 'main',
        layoutsDir: 'views/layouts/',
        partialsDir: 'views/partials/'
    }));

    // Locate the views
    app.set('views', __dirname + '/views');
    
    // Locate the assets
    app.use(express.static(__dirname + '/assets'));
}

// Set Handlebars
app.set('view engine', 'handlebars');

/*
* Sessions
*/
app.use(express.cookieParser('qwer2435wtrgsfdb4323454235'));
app.use(express.session({secret: 'asd7bjuw3mbd8873bbhdkj2384'}));

/* 
 * Routes
 */
app.get('/', function(request, response, next) {
    var auth = require('./lib/auth')(db, request.session);
    if (request.cookies.autologin && !auth.loggedIn()) {
        auth.doAutoLogin(request.cookies.autologin, function(e) {
            pages.index(response, auth, {});
        }, function(e) {
            console.log('\nERROR\n');
            console.log(e);
            response.clearCookie('autologin');
            pages.index(response, auth, {
                loginError: e,
                username: request.body.username
            });
        });
    }
    else {
        pages.index(response, auth, {});
    }
});

app.get('/register', function(request, response, next) {
    pages.register(response);
});

app.get('/jsonCheckUsername', function(request, response, next){
    var auth = require('./lib/auth')(db, request.session);
    response.setHeader('Content-Type', 'application/json');
    if (request.query.username) {
        return auth.usernameInUse(request.query.username, function(inUse){
            response.end(JSON.stringify({
                valid: !inUse
            }));
        });
    }
    response.end(JSON.stringify({error: 'Invalid parameters'}));
});

app.post('/doSignUp', function(request, response, next) {
    var auth = require('./lib/auth')(db, request.session);
    auth.signUp(
        request.body, 
        function(){
            pages.indexRedirect(response);
        },
        function(e){
            console.log('\nERROR\n');
            console.log(e);
            pages.register(response, {
                error: e,
                username: request.body.username
            });
        });
});

app.post('/signIn', function(request, response){
    var auth = require('./lib/auth')(db, request.session);
    auth.signIn( 
        request.body,
        function(){
            if (request.body.rememberMe) {
                auth.setLoginCookie(request.body, response, function(){
                    pages.indexRedirect(response);
                });
            }
            else {
                pages.indexRedirect(response);
            }

        },
        function(e){
            console.log('\nERROR\n');
            console.log(e);
            pages.index(response, auth, {
                loginError: e,
                username: request.body.username
            });
        });
});

app.post('/login', function(request, response, next){
    var auth = require('./lib/auth')(db, request.session);
    auth.login(
        request.body,
        function(){
            pages.index(response, auth, {});
        },
        function(e){
            console.log('\nERROR\n');
            console.log(e);
            pages.index(response, auth, {});
        }
    );
});

app.get('/signOut', function(request, response, next){
    var auth = require('./lib/auth')(db, request.session);
    auth.signOut(function(){
        response.clearCookie('autologin');
        pages.indexRedirect(response);
    });
});

app.get('/admin', function(request, response, next) {
    var auth = require('./lib/auth')(db, request.session);
    pages.admin.index(response, auth, {});
});

app.get('/admin-fixtures', function(request, response, next) {
    var auth = require('./lib/auth')(db, request.session);
    pages.admin.fixtures(response, auth, db, {});
});

app.post('/saveFixtures', function(request, response, next){
    var auth = require('./lib/auth')(db, request.session);
    if (auth.loggedIn() && auth.isAdmin()) {
        var fixtures = require('./lib/fixtures')(db);
        response.setHeader('Content-Type', 'application/json');
        fixtures.saveSeason(request.body, function(e) {
            console.log('\nERROR\n');
            console.log(e);
            response.end(JSON.stringify({
                error: e
            }));
        }, function() {
            response.end(JSON.stringify({
                results: 'OK'
            }));
        });
    }
    else {
        pages.indexRedirect(response);
    }
});

app.get('/admin-report-predictions', function(request, response, next) {
    var auth = require('./lib/auth')(db, request.session);
    pages.admin.reports.predictions(response, auth, {});
});

/*
 * Start it up
 */
app.listen(process.env.PORT || port);
console.log('Express started on port ' + port);