'use strict';

/*
 * Express Dependencies
 */
var express = require('express');
var app = express();
var port = 3000;

/*
* IP info
*/
var ipware = require('ipware')();

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
var pages = require('./lib/pages')(process.env.GOOGLE_ANALYTICS_KEY);
var users = require('./lib/users')(db);

/*
 * Use Handlebars for templating
 */
var exphbs = require('express3-handlebars');
var helpers = require('./lib/handlesbars-helpers.js')();

// Handle http post
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

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
var redisUrl;
if (process.env.NODE_ENV === 'production') {
    redisUrl = process.env.REDISCLOUD_URL;
}
else {
    redisUrl = process.env.DEV_REDISCLOUD_URL;
}
var expressSession = require('express-session');
var RedisStore  = require('connect-redis')(expressSession);
app.use(expressSession({
    secret: process.env.NODE_SESSION_SECRET,
    store: new RedisStore({
        url: redisUrl
    }),
    resave: true,
    saveUninitialized: true
}));

/*
* Cookies
*/
var cookieParser = require('cookie-parser');
app.use(cookieParser(process.env.NODE_COOKIE_SECRET));

/*
* Methods
*/
function autoLogin (request, response, users, auth, db, onError, onSuccess) {
    var clientIp = ipware.get_ip(request).clientIp;
    auth.doAutoLogin(request.cookies.autologin, response, clientIp, function() {
        auth.updateTrackingCookie(auth.userId(), request, response, function(e) {
            if (e) return onError(e);
        });
        onSuccess();
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

/* 
 * Routes
 */
app.get('/', function(request, response, next) {

    var auth = require('./lib/auth')(request.session, users);

    var onError = function (e){
        console.log(e);
        return next(e);
    };

    if (request.cookies.autologin && !auth.loggedIn()) {
        autoLogin(request, response, users, auth, db, onError, function() {
            pages.index(response, auth, db, {}, onError);
        });
    }
    else {
        pages.index(response, auth, db, {}, onError);
    }
});

app.get('/register', function(request, response, next) {
    var auth = require('./lib/auth')(request.session, users);
    if (auth.loggedIn()) {
        pages.indexRedirect(response);
    }
    else {
        pages.register(response);
    }
});

app.get('/table', function(request, response, next) {
    var auth = require('./lib/auth')(request.session, users);
    var onError = function (e){
        console.log(e);
        return next(e);
    };
    if (request.cookies.autologin && !auth.loggedIn()) {
        autoLogin(request, response, users, auth, db, onError, function() {
            pages.leagueTable(response, auth);
        });
    }
    else {
        pages.leagueTable(response, auth);
    }
});

app.get('/about', function(request, response, next) {
    var auth = require('./lib/auth')(request.session, users);
    var onError = function (e){
        console.log(e);
        return next(e);
    };
    if (request.cookies.autologin && !auth.loggedIn()) {
        autoLogin(request, response, users, auth, db, onError, function() {
            pages.about(response, auth);
        });
    }
    else {
        pages.about(response, auth);
    }
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
    var data = request.body;
    data.clientIp = ipware.get_ip(request).clientIp;
    auth.signUp(
        data, 
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

app.post('/signIn', function(request, response, next){
    var auth = require('./lib/auth')(request.session, users);

    var onError = function (e){
        return next(e);
    };
    var data = request.body;
    data.clientIp = ipware.get_ip(request).clientIp;
    auth.signIn( 
        data,
        function(){
            auth.updateTrackingCookie(auth.userId(), request, response, function(e) {
                if (e) return onError(e);
                if (request.body.rememberMe) {
                    auth.setLoginCookie(request.body.username, response, null, function(){
                        pages.indexRedirect(response);
                    });
                }
                else {
                    pages.indexRedirect(response);
                }
            });
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

app.get('/signOut', function(request, response, next){
    var auth = require('./lib/auth')(request.session, users);
    auth.signOut(function(e){
        if (e) return next(e);
        response.clearCookie('autologin');
        pages.indexRedirect(response);
    });
});

app.get('/admin', function(request, response, next) {
    var auth = require('./lib/auth')(request.session, users);
    var onError = function (e){
        console.log(e);
        return next(e);
    };
    if (request.cookies.autologin && !auth.loggedIn()) {
        autoLogin(request, response, users, auth, db, onError, function() {
            pages.admin.index(response, auth, {}, onError);
        });
    }
    else {
        pages.admin.index(response, auth, {}, onError);
    }
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
    var onError = function (e){
        console.log(e);
        return next(e);
    };
    var data = {
        action: request.query.action == null ? null : request.query.action,
        id: request.query.id == null ? null : request.query.id,
        message: message
    };
    if (request.cookies.autologin && !auth.loggedIn()) {
        autoLogin(request, response, users, auth, db, onError, function() {
            pages.admin.fixtures(response, auth, db, data, onError);
        });
    }
    else {
        pages.admin.fixtures(response, auth, db, data, onError);
    }
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
    var from = null;
    if (request.query.from) {
        try {
            from = new Date(request.query.from);
        }
        catch(e){}
    }
    var onlyAcceptedUsers = request.query.t ? true : false;
    var onError = function(e) {
        if (e) return next(e);
    };
    function doPage() {
        pages.admin.reports.predictions(response, auth, db, onError, from, null, null, onlyAcceptedUsers);
    }
    if (request.cookies.autologin && !auth.loggedIn()) {
        autoLogin(request, response, users, auth, db, onError, doPage);
    }
    else {
        doPage();
    }
});

app.get('/admin/reports/predictionsTable', function(request, response, next) {
    var auth = require('./lib/auth')(request.session, users);
    var from = null;
    if (request.query.from) {
        try {
            from = new Date(request.query.from);
        }
        catch(e){}
    }
    var miniSeason = request.query.ms ? request.query.ms : null;
    var onlyAcceptedUsers = request.query.t ? true : false;
    var onError = function(e) {
        if (e) return next(e);
    };
    function doPage() {
        pages.admin.reports.predictions(response, auth, db, onError, from,
            'table', miniSeason, onlyAcceptedUsers);
    }
    if (request.cookies.autologin && !auth.loggedIn()) {
        autoLogin(request, response, users, auth, db, onError, doPage);
    }
    else {
        doPage();
    }
});

app.get('/admin/reports/registration', function(request, response, next) {
    var auth = require('./lib/auth')(request.session, users);
    var onError = function(e) {
        if (e) return next(e);
    };
    function doPage() {
        pages.admin.reports.registration(response, auth, db, onError);
    }
    if (request.cookies.autologin && !auth.loggedIn()) {
        autoLogin(request, response, users, auth, db, onError, doPage);
    }
    else {
        doPage();
    }
});

app.get('/admin/passwordReset', function(request, response, next) {
    var auth = require('./lib/auth')(request.session, users);
    var onError = function(e) {
        if (e) return next(e);
    };
    function doPage() {
        pages.admin.passwordReset(response, auth, db, onError);
    }
    if (request.cookies.autologin && !auth.loggedIn()) {
        autoLogin(request, response, users, auth, db, onError, doPage);
    }
    else {
        doPage();
    }
});

app.get('/admin/resetUserPassword', function(request, response, data){
    var auth = require('./lib/auth')(request.session, users);
    var onError = function(e) {
        if (e) return next(e);
    };
    if (auth.loggedIn() && auth.isAdmin()) {
        if (!request.query.id) return pages.admin.passwordReset(response, auth, db, onError);
        var userId = request.query.id;
        users.resetPassword(userId, function(e, newPassword) {
            if (e) return onError(e);
            pages.admin.passwordResetResult (response, auth, db, userId, newPassword, onError);
        });
    }
    else {
        pages.index(response, auth, db, {}, onError);
    }
});

app.get('/authoriseUser', function(request, response, data){
    var auth = require('./lib/auth')(request.session, users);
    var onError = function(e) {
        if (e) return next(e);
    };
    function doPage() {
        pages.admin.reports.registration(response, auth, db, onError);
    }
    if (auth.loggedIn() && auth.isAdmin()) {
        if (!request.query.id) return doPage();
        var userId = request.query.id;
        users.authoriseUser(userId, function(e) {
            if (e) return onError(e);
            doPage();
        });
    }
    else {
        doPage();
    }


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