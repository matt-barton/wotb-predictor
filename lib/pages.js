var extend = require('extend');
var appConfig = require('../app.config.json');

module.exports = function (gaKey) {

	function renderPage(response, pagename, data) {
		if (!gaKey) console.log('No google analytics key!');
		if (!data) data = {};
		data['googleAnalyticsKey'] = gaKey;
		response.render(pagename, data);
	}

	function indexRedirect(response) {
		response.redirect('/');
	}

	function indexPage(response, auth, db, data, onError) {

		var loggedIn = auth.loggedIn();

		extend(data, { 
			auth: auth,
			config: appConfig
		});

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
						renderPage(response, 'index', data);
					});
				}
				else {
					renderPage(response, 'index', data);
				}
			}, true);
		}
		else {
			renderPage(response, 'index', data);
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
					renderPage(response, 'adminFixtures', data);
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
						if (season.current) {
							extend(data, {
								gameTypeLabel: 'Active Game',
								message: options.message
							});
							displaySeason(season, data);
						}
						else {
							fixtures.otherSeasons(onError, function(otherSeasons){
								if (otherSeasons.length == 0) {
									extend(data, {
										gameTypeLabel: 'Create New Game',
										message: options.message
									});
									displaySeason(season, data);
								}
								else {
									extend(data, {
										gameTypeLabel: 'Edit Game',
										message: options.message
									});
									displaySeason(otherSeasons[0].value, data);
								}
							});
						}
					}, true);
				}	
			}
		}
		else {
			return indexRedirect(response);
		}
	}

	function predictionsReport(response, auth, db, callback, fromDate, format, requestedMiniseason) {
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
						data.fromDate = fromDate;
						if (format == 'table') data.requestedMiniseason = requestedMiniseason;
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
									if (fromDate != null) {
										var predictionDate = new Date(user.predictions[seasonId].miniseasons[x].date);
										if (predictionDate < fromDate) continue;
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
						renderPage(response, format == 'table' ? 'predictionsTable' : 'predictionsReport', data);
					}, true
				)
			});
		}
		else{
			return indexRedirect(response);
		}
	}

	function registrationReport(response, auth, db, callback) {
		if (auth.isAdmin()) {
			var users = require('./users')(db);
			var data = { auth: auth };
			users.getUserAuthCodes(function(e, userDocs){
				if (e) return callback(e);
				data.users = userDocs;
				renderPage(response, 'registrationReport', data);
			});
		}
		else{
			return indexRedirect(response);
		}
	}

	return {

		index: function (response, auth, db, data, onError){
			indexPage(response, auth, db, data, onError);
		},

		indexRedirect: function(response){
			indexRedirect(response);
		},

		register: function (response, data) {
			renderPage(response, 'register', data);
		},

		admin: {
			index: function (response, auth, data) {
				if (auth.isAdmin()) {
					extend(data, { auth: auth });
					renderPage(response, 'admin', data);
				}
				else{
					return indexRedirect(response);
				}
			},

			fixtures: function (response, auth, db, options, onError){
				adminFixtures(response, auth, db, options, onError);
			},

			reports: {
				predictions: function (response, auth, db, callback, fromDate, format, requestedMiniseason) {
					predictionsReport(response, auth, db, callback, fromDate, format, requestedMiniseason);
				},
				registration: registrationReport
			}
		},

		leagueTable: function (response, auth) {
			renderPage(response, 'leagueTable', {
				url: appConfig.urls.leageTable,
				auth: auth
			});
		},

		about: function (response, auth) {
			renderPage(response, 'about', {
				auth: auth,
				config: appConfig
			});
		},

		error: function errorPage(response, e) {
			renderPage(response, 'error', {
				error: e
			});
		}
	};
};