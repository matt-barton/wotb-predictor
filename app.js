'use strict';

/*
 * Express Dependencies
 */
var express = require('express');
var app = express();
var port = 3000;

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
// Index Page
app.get('/', function(req, res, next) {
    var auth = require('./lib/auth')(req.session);
    console.log(auth.loggedIn() ? auth.userName() : "not logged in");
    res.render('index');
});


app.get('/register', function(req, res, next) {
    res.render('register');
});

app.post('/doSignUp', function(req, res, next) {
    var auth = require('./lib/auth')(req.session);
    auth.signUp(req, 
        function(){
            console.log(auth.loggedIn() ? auth.userName() : "not logged in");
            res.render('index');
        },
        function(e){
            console.log('ERROR: ' + e);
            res.render('register', {
                error: e
            });
        });
});

/*
 * Start it up
 */
app.listen(process.env.PORT || port);
console.log('Express started on port ' + port);