
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
			});
		}
	};
}