var appConfig = require('../app.config.json');

function newSeason () {
	var newSeason = {
		type: 'season',
		name: '',
		current: false,
		miniseasons: []
	};
	for (x=0; x<appConfig.game.miniSeasonsPerGame; x++) {
		newSeason.miniseasons[x] = {
			name: 'Season ' + (x + 1),
			deadline: '',
			fixtures: []
		};
	}
	return newSeason;
}

function getSeasonById(db, id, onError, onSuccess) {
	db.view('fixtures/byId', {}, function (e, docs){
		if (e) return onError(e);
		for (var x=0; x<docs.length; x++) {
			var season = docs[x];
			if (season.id == id) {
				return onSuccess(season.value);
			}
		}
		return onError ('not found');
	});
}

function getCurrentSeason(db, onError, onSuccess) {
	db.view('fixtures/currentSeason', {}, function (e, doc){
		if (e) return onError(e);
		if (doc.length == 0) {
			onSuccess(newSeason());
		}
		else {
			onSuccess(doc[0].value);
		}
	});
}

function getNotCurrentSeasons(db, onError, onSuccess) {
	db.view('fixtures/notCurrentSeasons', {}, function (e, docs){
		if (e) return onError(e);
		onSuccess(docs);
	});
}

function getAllSeasonNames(db, onError, onSuccess) {
	db.view('fixtures/allSeasonNames', {}, function (e, results){
		if (e) return onError(e);
		onSuccess(results);
	});
}

function updateSeasonRecord(season, newData) {
	season.name = newData.name;
	for (var i=0; i<season.miniseasons.length; i++) {
		season.miniseasons[i] = {
			deadline: newData.miniseasons[i].deadline,
			fixtures: []
		}
		if (newData.miniseasons[i].fixtures) {
			for(var j=0; j<newData.miniseasons[i].fixtures.length; j++) {
				season.miniseasons[i].fixtures[j] = newData.miniseasons[i].fixtures[j];
			}
		}
	}
	return season;
}

function validateSeasonData(db, seasonToValidate, oldSeason, onSuccess, onError) {
	var ok = true
	  , errors = [];

	if (!seasonToValidate.name || seasonToValidate.name.length < 1) {
		ok = false;
		errors[0] = 'Game name cannot be blank';
	}

	getAllSeasonNames(db, onError, function(seasonNames){
		for (var x=0; x<seasonNames.length; x++) {
			var nameData = seasonNames[x];
			if (nameData.id != seasonToValidate.id) {
				if (nameData.value.toLowerCase() == seasonToValidate.name.toLowerCase()) {
					ok = false;
					errors[errors.length] = 'Game name is a duplicate of another game\'s';
				}
			}
		}

		var processed = 0;
		seasonToValidate.miniseasons.forEach(function(miniseason, i){
			if (miniseason.fixtures && miniseason.fixtures.length > 0) {
				if (!miniseason.deadline || miniseason.deadline.length < 1) {
					ok = false;
					errors[errors.length] = 'Season ' + (i+1) + ' needs a deadline.';
				}

				var fixturesProcessed = 0;
				miniseason.fixtures.forEach(function(fixture, j){
					if (!fixture.team || !fixture.venue) {
						ok = false;
						errors[errors.length] = 'Season ' + (i+1) + ' fixture ' + (j+1) + ' is missing information.';
					}
					else {
						if (fixture.venue != 'H' && fixture.venue != 'A') {
							ok = false;
							errors[errors.length] = 'Season ' + (i+1) + ' fixture ' + (j+1) + ' has an invalid venue.';
						}
						else {
							for (var x=0; x<seasonToValidate.miniseasons.length; x++) {
								if (!seasonToValidate.miniseasons[x].fixtures) continue;
								for (var y=0; y<seasonToValidate.miniseasons[x].fixtures.length; y++) {
									if (x==i && y==j) continue;
									var f = seasonToValidate.miniseasons[x].fixtures[y];
									if (f.team.toLowerCase() == fixture.team.toLowerCase()
										&& f.venue.toLowerCase() == fixture.venue.toLowerCase()) {
										ok = false;
										errorStr = 'Season ' + (i+1) + ' fixture ' + (j+1) 
											+ ' contains duplicate fixture information';
										if (errors.indexOf(errorStr) == -1) errors[errors.length] = errorStr; 
									}
								}
							}
						}
					}
					fixturesProcessed++;
				});
				var backstop = 0;
				while (fixturesProcessed < miniseason.fixtures.length) {
					// wait
					if (backstop++ > 100) return onError(["Hit fixtures backstop in season data validation - lib/fixtures.js"]);
				}
			}
			processed++;
			
		});

		var backstop = 0;
		while (processed < seasonToValidate.miniseasons.length) {
			// wait
			if (backstop++ > 100) return onError(["Hit backstop in season data validation - lib/fixtures.js"]);
		}

		if (ok) return onSuccess();
		console.log(errors);
		return onError(errors);
	});
}

module.exports = function(db) {
	return {
		getCurrentSeason: function(onError, onSuccess) {
			getCurrentSeason(db, onError, onSuccess);
		},

		getSeasonById: function(id, onError, onSuccess) {
			getSeasonById(db, id, onError, onSuccess);
		},

		otherSeasons: function(onError, onSuccess){
			getNotCurrentSeasons(db, onError, onSuccess);
		},

		saveSeason: function(seasonData, onError, onSuccess){
			if (seasonData.id) {
				getSeasonById(db, seasonData.id, function(e){
					onError(e);
				}, function(season){
					validateSeasonData(db, seasonData, season, function(){
						var updatedSeason = updateSeasonRecord(season, seasonData);
						db.save(season, function(e, result){
							if (e) return onError(e);
							return onSuccess(seasonData.id);
						});

					}, function(e){
						return onError(e);
					});
				});
			}
			else {
				var season = updateSeasonRecord(newSeason(), seasonData);
				db.save(season, function(e, result){
					if (e) return onError(e);
					return onSuccess(result.id);
				});
 			}
		},

		activateSeason: function(seasonData, onError, onSuccess){
			if (seasonData.id) {
				getSeasonById(db, seasonData.id, onError, function(season){
					getCurrentSeason(db, onError, function(currentSeason){
						currentSeason.current = false;
						db.save(currentSeason, function(e, result){
							if (e) return onError(e);
							season.current = true;
							db.save(season, function(e, result){
								if (e) return onError(e);
								var message = 'Game ' + season.name + ' now active.  Game ' + currentSeason.name + ' formerly active, now not';
								return onSuccess(seasonData.id, message);
							});
						});
					});
				});
			}
			else {
				return onError("No season id.");
 			}
		},

		getAllSeasons: function(onError, onSuccess){
			getAllSeasonNames(db, onError, onSuccess);
		},

		getBlankSeason: newSeason
	};
}