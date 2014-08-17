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
var cradle = require('cradle');
var db = new(cradle.Connection)().database('wotb-predictor');

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
                error: e
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
                loginError: e
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

/*
 * Start it up
 */
app.listen(process.env.PORT || port);
console.log('Express started on port ' + port);