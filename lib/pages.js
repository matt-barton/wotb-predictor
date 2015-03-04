var extend = require('extend');
var appConfig = require('../app.config.json');

function indexPage(response, auth, db, data, onError) {

	var loggedIn = auth.loggedIn();

	extend(data, { auth: auth });

	if (loggedIn) {
		var users = require('./users')(db);
		var fixtures = require('./fixtures')(db);
		fixtures.getCurrentSeason(onError, function(season) {
			data.season = season;
			if (season.current) {
				users.getUserPredictions(auth.userId(), onError, function(predictions) {
					if (predictions == null) predictions = [];
					var currentSeasonMiniseasons = predictions[season._id] 
						? predictions[season._id] 
						: {};
					var currentSeasonPredictions = currentSeasonMiniseasons.miniseasons 
						? currentSeasonMiniseasons.miniseasons 
						: [];
					for (var x=0; x<appConfig.game.miniSeasonsPerGame; x++) {
						var currentMiniseasonPredictions = currentSeasonPredictions[x] 
							? currentSeasonPredictions[x].predictions 
							: [];
						var deadline = new Date(season.miniseasons[x].deadline);
						deadline = deadline.setDate(deadline.getDate() + 1);
						season.miniseasons[x].open = Date.now() < deadline;
						season.miniseasons[x].index = x + 1;
						for (var y=0; y<season.miniseasons[x].fixtures.length; y++) {
							var fixture = season.miniseasons[x].fixtures[y];
							season.miniseasons[x].fixtures[y].prediction = '';
							for (var z=0; z<currentMiniseasonPredictions.length; z++) {
								var prediction = currentMiniseasonPredictions[z];
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
		extend(data, { auth: auth });
		response.render('admin', data);
	}
	else{
		return indexRedirect(response);
	}
}

function adminFixtures(response, auth, db, options, onError) {
	if (auth.isAdmin()) {
		var fixtures = require('./fixtures')(db);
		var data = { auth: auth };

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
				extend(data, {
					season: season,
					allSeasonNames: allSeasonNames,
					gameTypeLabel: options.gameTypeLabel,
					message: options.message,
					editChosenGameUrl: '/admin/fixtures/?id='
				});
				response.render('adminFixtures', data);
			});
		};

		if (options.action) {
			switch(options.action) {
				case 'new-game':
					extend(data, {
						gameTypeLabel: 'Create New Game',
						message: options.message
					});
					displaySeason(fixtures.getBlankSeason(), data);
					break;
				default:
					return onError(new Error('unknown action'));
					break;
			}
		}
		else {
			if (options.id) {
				fixtures.getSeasonById(options.id, onError, function(season) {
					extend(data, {
						gameTypeLabel: 'Edit Game',
						message: options.message
					});
					displaySeason(season, data);
				});
			}
			else {
				fixtures.getCurrentSeason(onError, function(season) {
					extend(data, {
						gameTypeLabel: season.current ? 'Active Game' : 'Create New Game',
						message: options.message
					});
					displaySeason(season, data);
				});
			}	
		}
	}
	else {
		return indexRedirect(response);
	}
}

function predictionsReport(response, auth, db, callback, format, requestedMiniseason) {
	if (auth.isAdmin()) {
		var users = require('./users')(db);
		var fixtures = require('./fixtures')(db);
		var data = { auth: auth };
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
							var index = x + 1;
							if (format == 'table' && index != requestedMiniseason) continue;
							var fixtures = season.miniseasons[x].fixtures;
							var miniseason = {
								deadline: season.miniseasons[x].deadline,
								completePredictions: [],
								incompletePredictions: [],
								index: index
							};
							if (format == 'table') {
								miniseason.fixtures = fixtures;
							}
							for (var y=0; y<users.length; y++) {
								var user = users[y].value;
								if (!user.predictions || 
									!user.predictions[seasonId] || 
									!user.predictions[seasonId].miniseasons ||
									!user.predictions[seasonId].miniseasons[x]) {
									miniseason.incompletePredictions.push(user.username);
									continue;
								}
								var predictions = user.predictions[seasonId].miniseasons[x].predictions;
								var userMiniseasonPredictions = [];
								for (var z=0; z<fixtures.length; z++) {
									var fixture = fixtures[z];
									var predictionExists = false;
									for (var i=0; i<predictions.length; i++) {
										var prediction = predictions[i];
										if (fixture.team == prediction.team &&
											fixture.venue == prediction.venue) {
											predictionExists = true;
											if (format == 'table') prediction.prediction = prediction.prediction.substring(0,1);
											userMiniseasonPredictions.push(prediction);
											break;
										}
									}
									if (!predictionExists) break;
								}
								if (userMiniseasonPredictions.length == fixtures.length) {
									miniseason.completePredictions.push({
										user: user.username,
										predictions: userMiniseasonPredictions
									});
								}
								else {
									miniseason.incompletePredictions.push(user.username);
								}

							}
							data.miniseasons.push(miniseason);
						}
					}
					response.render(format == 'table' ? 'predictionsTable' : 'predictionsReport', data);
				}
			)
		});
	}
	else{
		return indexRedirect(response);
	}
}

function errorPage(response, e) {
	response.render('error', {
		error: e
	});
}

function leagueTable(response, auth) {
	response.render('leagueTable', {
		url: appConfig.leageTableUrl,
		auth: auth
	});
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
	leagueTable: leagueTable,
	error: errorPage
};