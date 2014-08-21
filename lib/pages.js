var extend = require('extend');

function indexPage(response, auth, data) {
	extend(data, {
		auth: {
			loggedIn: auth.loggedIn(),
			username: auth.username(),
			admin: auth.isAdmin()
		}});
	response.render('index', data);
}

function indexRedirect(response) {
	response.redirect('/');
}

function registerPage(response, data) {
	response.render('register', data);
}

function adminIndex(response, auth, data) {
	if (auth.isAdmin()) {
		response.render('admin', data);
	}
	else{
		return indexRedirect(response);
	}
}

function adminFixtures(response, auth, db, data) {
	if (auth.isAdmin()) {
		var fixtures = require('./fixtures')(db);

		var onError = function(e) {
			console.log(e);
			response.render('adminFixtures', {
				error: e
			});
		};

		fixtures.currentSeason(onError, function(season){
			season.miniseasons.forEach(function(miniseason, index) {
				miniseason.htmlId = 's' + (index + 1); 
			});
			fixtures.otherSeasons(onError, function(otherSeasons){
				response.render('adminFixtures', {
					currentSeason: season,
					otherSeasons: otherSeasons
				});
			});
		});
	}
	else {
		return indexRedirect(response);
	}
}

function predictionsReport(response, auth, data) {
	if (auth.isAdmin()) {
		response.render('predictionsReport', data);
	}
	else{
		return indexRedirect(response);
	}
}


module.exports = {
	index: indexPage,
	indexRedirect: indexRedirect,
	register: registerPage,
	admin: {
		index: adminIndex,
		fixtures: adminFixtures,
		reports: {
			predictions: predictionsReport
		}
	}
};