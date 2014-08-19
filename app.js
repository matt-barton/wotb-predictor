'use strict';

/*
 * Express Dependencies
 */
var express = require('express');
var app = express();
var port = 3000;

/* 
* Database
*/
var config = require('./config.json');
var cradle = require('cradle');
var db = new(cradle.Connection)(config.couch.host, config.couch.port, config.couch.options)
    .database(config.couch.db);

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
app.use(express.bodyParser());

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
app.use(express.cookieParser());
app.use(express.session({secret: 'asd7bjuw3mbd8873bbhdkj2384'}));

/* 
 * Routes
 */
app.get('/', function(request, response, next) {
    var auth = require('./lib/auth')(db, request.session);
    pages.index(response, auth, {});
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
            pages.indexRedirect(response);
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
        }
    );
});

app.get('/signOut', function(request, response, next){
    var auth = require('./lib/auth')(db, request.session);
    auth.signOut(function(){
        pages.indexRedirect(response);
    });
});

/*
 * Start it up
 */
app.listen(process.env.PORT || port);
console.log('Express started on port ' + port);