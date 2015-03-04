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
var cradle = require('cradle');
var dbHost, dbPort, dbOptions, dbDatabase;
dbOptions = {};
if (process.env.NODE_ENV === 'production') {
    dbHost = process.env.PROD_COUCH_HOST;
    dbPort = process.env.PROD_COUCH_PORT;
    dbDatabase = process.env.PROD_COUCH_DB;
    dbOptions.auth = {
        "username": process.env.PROD_COUCH_USERNAME,
        "password": process.env.PROD_COUCH_PASSWORD
    };
}
else {
    dbHost = process.env.DEV_COUCH_HOST;
    dbPort = process.env.DEV_COUCH_PORT;
    dbDatabase = process.env.DEV_COUCH_DB;
    if (process.env.DEV_COUCH_USERNAME != null) {
        obOptions.auth = {
            "username": process.env.DEV_COUCH_USERNAME,
            "password": process.env.DEV_COUCH_PASSWORD
        };
    }
}
var db = new(cradle.Connection)(dbHost, dbPort, dbOptions)
    .database(dbDatabase);

/*
* Libraries
*/
var pages = require('./lib/pages');
var users = require('./lib/users')(db);

/*
 * Use Handlebars for templating
 */
var exphbs = require('express3-handlebars');
var helpers = require('./lib/handlesbars-helpers.js')();

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
        partialsDir: 'dist/views/partials/',
        helpers: helpers.all()
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
        partialsDir: 'views/partials/',
        helpers: helpers.all()
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
app.use(express.cookieParser('qDe!24X5wVrbsfda43^34%4£3&'));
app.use(express.session({secret: 'asd7bjuw3mbd8x7£bbqdkj2!8^*p'}));

/* 
 * Routes
 */
app.get('/', function(request, response, next) {

    var auth = require('./lib/auth')(request.session, users);

    var onError = function (e){
        return next(e);
    };

    if (request.cookies.autologin && !auth.loggedIn()) {
        auth.doAutoLogin(request.cookies.autologin, function(e) {
            pages.index(response, auth, db, {}, onError);
        }, function(e) {
            console.log('\nERROR\n');
            console.log(e);
            response.clearCookie('autologin');
            pages.index(response, auth, db, {
                loginError: e,
                username: request.body.username
            }, onError);
        });
    }
    else {
        pages.index(response, auth, db, {}, onError);
    }
});

app.get('/register', function(request, response, next) {
    pages.register(response);
});

app.get('/table', function(request, response, next) {
    var auth = require('./lib/auth')(request.session, users);
    pages.leagueTable(response, auth);
});

app.get('/jsonCheckUsername', function(request, response, next){
    var auth = require('./lib/auth')(request.session, users);
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
    var auth = require('./lib/auth')(request.session, users);
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
    var auth = require('./lib/auth')(request.session, users);

    var onError = function (e){
        return next(e);
    };

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
            pages.index(response, auth, db, {
                loginError: e,
                username: request.body.username
            }, onError);
        });
});

app.post('/login', function(request, response, next){
    var auth = require('./lib/auth')(request.session, users);

    var onError = function (e){
        return next(e);
    };

    auth.login(
        request.body,
        function(){
            pages.index(response, auth, db, {}, onError);
        },
        function(e){
            console.log('\nERROR\n');
            console.log(e);
            pages.index(response, auth, db, {}, onError);
        }
    );
});

app.get('/signOut', function(request, response, next){
    var auth = require('./lib/auth')(request.session, users);
    auth.signOut(function(){
        response.clearCookie('autologin');
        pages.indexRedirect(response);
    });
});

app.get('/admin', function(request, response, next) {
    var auth = require('./lib/auth')(request.session, users);
    pages.admin.index(response, auth, {}, function (e) {
        return next(e);
    });
});

app.get('/admin/fixtures', function(request, response, next) {
    var auth = require('./lib/auth')(request.session, users);

    var message;
    if (request.session.userMessage
            && request.session.userMessage.page == '/admin/fixtures'
            && request.session.userMessage.user == auth.username())
    {
        message = request.session.userMessage.message;
        request.session.userMessage = null;
    }

    pages.admin.fixtures(response, auth, db, {
        action: request.query.action == null ? null : request.query.action,
        id: request.query.id == null ? null : request.query.id,
        message: message
    }, function (e){
        return next(e);
    });
});

app.post('/saveFixtures', function(request, response, next){
    var auth = require('./lib/auth')(request.session, users);
    if (auth.loggedIn() && auth.isAdmin()) {
        var fixtures = require('./lib/fixtures')(db);
        response.setHeader('Content-Type', 'application/json');
        fixtures.saveSeason(request.body, function(e) {
            console.log('\nERROR\n');
            console.log(e);
            response.end(JSON.stringify({
                error: e
            }));
        }, function(seasonId) {
            response.end(JSON.stringify({
                redirect: '/admin/fixtures?id='+seasonId
            }));
        });
    }
    else {
        pages.indexRedirect(response);
    }
});

app.get('/admin/reports/predictions', function(request, response, next) {
    var auth = require('./lib/auth')(request.session, users);
    pages.admin.reports.predictions(response, auth, db, function(e) {
        if (e) return next(e);
    });
});

app.get('/admin/reports/predictionsTable', function(request, response, next) {
    var auth = require('./lib/auth')(request.session, users);
    pages.admin.reports.predictions(response, auth, db, function(e) {
        if (e) return next(e);
    }, 'table', request.query.ms == null ? null : request.query.ms);
});

app.post('/activateSeason', function(request, response, next){
    var auth = require('./lib/auth')(request.session, users);
    if (auth.loggedIn() && auth.isAdmin()) {
        var fixtures = require('./lib/fixtures')(db);
        response.setHeader('Content-Type', 'application/json');
        fixtures.activateSeason(request.body, function(e) {
            console.log('\nERROR\n');
            console.log(e);
            response.end(JSON.stringify({
                error: e
            }));
        }, function(seasonId, message) {
            if (message) {
                request.session.userMessage = {
                    page: '/admin/fixtures',
                    user: auth.username(),
                    message: message
                };
            }
            response.end(JSON.stringify({
                redirect: '/admin/fixtures?id='+seasonId
            }));
        });
    }
    else {
        pages.indexRedirect(response);
    }
});

app.post('/savePredictions', function(request, response, next){
    var auth = require('./lib/auth')(request.session, users);
    if (auth.loggedIn()) {
        var onError = function(e) {
            console.log('\nERROR\n');
            console.log(e);
            response.end(JSON.stringify({
                error: e
            }));
        }
        var fixtures = require('./lib/fixtures')(db);
        response.setHeader('Content-Type', 'application/json');
        users.getUserByUsername(
            auth.username(), 
            onError,
            function(user) {
                fixtures.getCurrentSeason(
                    onError, 
                    function(season) {
                        users.saveUserPredictions(request.body, season, user, function(e, message){
                            if (e) return onError(e);
                            response.end(JSON.stringify({
                                message: message
                            })); 
                        });
                    }
                );
            }
        );
    }
    else {
        pages.indexRedirect(response);
    }
});
/*
* Error Handling
*/
function errorHandler(e, request, response, next) {
    console.log(e);
    response.status(500);
    pages.error(response, e);
}
app.use(errorHandler);

/*
 * Start it up
 */
app.listen(process.env.PORT || port);
console.log('Express started on port ' + port);