var extend = require('extend');
var appConfig = require('../app.config.json');

function indexPage(response, auth, db, data, onError) {

	var loggedIn = auth.loggedIn();

	extend(data, {
		auth: {
			loggedIn: loggedIn,
			username: auth.username(),
			admin: auth.isAdmin()
		}
	});

	if (loggedIn) {
		var users = require('./users')(db);
		var fixtures = require('./fixtures')(db);
		fixtures.getCurrentSeason(onError, function(season) {
			data.season = season;
			if (season.current) {
				users.getUserPredictions(auth.userId(), onError, function(predictions) {
					if (predictions == null) predictions = [];
					var currentPredictions = predictions[season._id] == null ? [] : predictions[season._id];
					for (var x=0; x<appConfig.game.miniSeasonsPerGame; x++) {
						var deadline = new Date(season.miniseasons[x].deadline);
						deadline = deadline.setDate(deadline.getDate() + 1);
						season.miniseasons[x].open = Date.now() < deadline;
						season.miniseasons[x].index = x + 1;
						for (var y=0; y<season.miniseasons[x].fixtures.length; y++) {
							var fixture = season.miniseasons[x].fixtures[y];
							season.miniseasons[x].fixtures[y].prediction = '';
							for (var z=0; z<currentPredictions.length; z++) {
								var prediction = currentPredictions[z];
								if (prediction.team == fixture.team &&
									prediction.venue == fixture.venue) {
									season.miniseasons[x].fixtures[y].prediction = prediction.prediction;
								}
							}
						}
					}
					response.render('index', data);
				});
			}
			else {
				response.render('index', data);
			}
		});
	}
	else {
		response.render('index', data);
	}
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

function adminFixtures(response, auth, db, options, onError) {
	if (auth.isAdmin()) {
		var fixtures = require('./fixtures')(db);

		var displaySeason = function (season, options)
		{
			season.miniseasons.forEach(function(miniseason, i) {
				miniseason.miniseasonHtmlId = i;
				miniseason.fixtures.forEach(function(fixture, j){
					fixture.fixtureHtmlId = j;
					fixture.miniseasonHtmlId = miniseason.miniseasonHtmlId;
				});
			});

			fixtures.getAllSeasons(onError, function(allSeasonNames){
				for (var x=0; x<allSeasonNames.length; x++) {
					allSeasonNames[x]['currentSeasonId'] = season._id;
				}
				response.render('adminFixtures', {
					season: season,
					allSeasonNames: allSeasonNames,
					gameTypeLabel: options.gameTypeLabel,
					message: options.message,
					editChosenGameUrl: '/admin/fixtures/?id='
				});
			});
		};

		if (options.action) {
			switch(options.action) {
				case 'new-game':
					displaySeason(fixtures.getBlankSeason(), {
						gameTypeLabel: 'Create New Game',
						message: options.message
					});
					break;
				default:
					return onError(new Error('unknown action'));
					break;
			}
		}
		else {
			if (options.id) {
				fixtures.getSeasonById(options.id, onError, function(season) {
					displaySeason(season, {
						gameTypeLabel: 'Edit Game',
						message: options.message
					});
				});
			}
			else {
				fixtures.getCurrentSeason(onError, function(season) {
					displaySeason(season, {
						gameTypeLabel: season.current ? 'Active Game' : 'Create New Game',
						message: options.message
					});
				});
			}	
		}
	}
	else {
		return indexRedirect(response);
	}
}

function predictionsReport(response, auth, db, callback) {
	if (auth.isAdmin()) {
		var users = require('./users')(db);
		var fixtures = require('./fixtures')(db);
		var data = {};
		users.getAllUsers(function(e, users){
			if (e) return callback(e);
			fixtures.getCurrentSeason(
				function(e) {
					if (e) return callback(e);
				},
				function(season) {
					data.season = {
						name: season.name,
						current: season.current
					};
					if (season.current) {
						var seasonId = season._id;
						data.miniseasons = [];
						for (var x=0; x<season.miniseasons.length; x++) {
							var miniseason = {
								deadline: season.miniseasons[x].deadline,
								completePredictions: {},
								incompletePredictions: []
							};
							for (var y=0; y<users.length; y++) {
								var user = users[y].value;
								if (!user.predictions || !user.predictions[seasonId]) {
									miniseason.incompletePredictions.push(user.username);
									continue;
								}
								var fixtures = season.miniseasons[x].fixtures;
								var predictions = user.predictions[seasonId];
								var userMiniseasonPredictions = [];
								for (var z=0; z<fixtures.length; z++) {
									var fixture = fixtures[z];
									var predictionExists = false;
									for (var i=0; i<predictions.length; i++) {
										var prediction = predictions[i];
										if (fixture.team == prediction.team &&
											fixture.venue == prediction.venue) {
											predictionExists = true;
											userMiniseasonPredictions.push(prediction);
											break;
										}
									}
									if (!predictionExists) break;
								}
								if (userMiniseasonPredictions.length == fixtures.length) {
									miniseason.completePredictions[user.username] = userMiniseasonPredictions;
								}
								else {
									miniseason.incompletePredictions.push(user.username);
								}

							}
							data.miniseasons.push(miniseason);
						}
					}
					console.log(data);
					response.render('predictionsReport', data);
				}
			)
		});
	}
	else{
		return indexRedirect(response);
	}
}

function errorPage(response, e) {
	response.render('error', { error: e });
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
	},
	error: errorPage
};