
var appConfig = require('../app.config.json');

function newSeason () {
	var newSeason = {
		type: 'season',
		name: '',
		current: true,
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

function validateSeasonData(seasonToValidate, oldSeason, onSuccess, onError) {
	var ok = true
	  , errors = [];

	if (!seasonToValidate.name || seasonToValidate.name.length < 1) {
		ok = false;
		errors[0] = 'Game name cannot be blank';
	}

	seasonToValidate.miniseasons.forEach(function(miniseason, i){
		if (miniseason.fixtures && miniseason.fixtures.length > 0) {
			if (!miniseason.deadline || miniseason.deadline.length < 1) {
				ok = false;
				errors[errors.length] = 'Season ' + (i+1) + ' needs a deadline.';
			}

			miniseason.fixtures.forEach(function(fixture, j){
				if (!fixture.date || !fixture.team || !fixture.venue) {
					ok = false;
					errors[errors.length] = 'Season ' + (i+1) + ' fixture ' + (j+1) + ' is missing information.';
				}
				else {
					if (Date.parse(fixture.date) < Date.now()) {
						pastDateOk = false;
						for (var x=0; x<oldSeason.miniseasons.length; x++) {
							var oldMiniSeason = oldSeason.miniseasons[x];
							for (var y=0; y<oldMiniSeason.fixtures.length; y++) {
								var oldFixture = oldMiniSeason.fixtures[y];
								if (fixture.date == oldFixture.date) {
									pastDateOk = true;
								}
							}
						}
						if(!pastDateOk) {
							ok = false;
							errors[errors.length] = 'Season ' + (i+1) + ' fixture ' + (j+1) + ' may not have past date.';
						}
					}
				}
			});
		}
	});
	if (ok) return onSuccess();
	return onError(errors);
}

module.exports = function(db) {
	return {
		currentSeason: function(onError, onSuccess) {
			getCurrentSeason(db, function(e){
				onError(e);
			}, function(season){
				onSuccess(season);
			});
		},

		otherSeasons: function(onError, onSuccess){
			getNotCurrentSeasons(db, function(e){
				onError(e);
			}, function(seasons){
				onSuccess(seasons);
			});
		},

		saveSeason: function(seasonData, onError, onSuccess){
			getCurrentSeason(db, function(e){
				onError(e);
			}, function(season){
				validateSeasonData(seasonData, season, function(){
					season.name = seasonData.name;
					season.miniseasons.forEach(function(miniseason, i){
						miniseason.deadline = seasonData.miniseasons[i].deadline;
						miniseason.fixtures = [];
						if (seasonData.miniseasons[i].fixtures) {
							seasonData.miniseasons[i].fixtures.forEach(function(fixture, j) {
								miniseason.fixtures[j] = fixture;
							});
						}
					});
					db.save(season, function(e, result){
						if (e) return onError(e);
						return onSuccess();
					});

				}, function(e){
					return onError(e);
				});
			});
		}
	};
}