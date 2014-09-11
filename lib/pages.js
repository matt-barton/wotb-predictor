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

function adminFixtures(response, auth, db, options) {
	if (auth.isAdmin()) {
		var fixtures = require('./fixtures')(db);

		var onError = function(e) {
			console.log(e);
			response.render('adminFixtures', {
				error: e
			});
		};

		var displaySeason = function (season, options)
		{
			season.miniseasons.forEach(function(miniseason, i) {
				miniseason.miniseasonHtmlId = i;
				miniseason.fixtures.forEach(function(fixture, j){
					fixture.fixtureHtmlId = j;
					fixture.miniseasonHtmlId = miniseason.miniseasonHtmlId;
				});
			});

			response.render('adminFixtures', {
				season: season,
				gameTypeLabel: options.gameTypeLabel
			});
		};

		if (options.action) {
			switch(options.action) {
				case 'new-game':
					displaySeason(fixtures.getBlankSeason(), {
						gameTypeLabel: 'Create New Game'
					});
					break;
				default:
					return onError('unknown action');
					break;
			}
		}
		else {
			if (options.id) {
				fixtures.getSeasonById(options.id, onError, function(season) {
					displaySeason(season, {
						gameTypeLabel: 'Edit Game'
					});
				});
			}
			else {
				fixtures.getCurrentSeason(onError, function(season) {
					displaySeason(season, {
						gameTypeLabel: 'Edit Game'
					});
				});
			}	
		}
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