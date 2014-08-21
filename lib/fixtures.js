
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

			console.log({requestBody: seasonData});

			getCurrentSeason(db, function(e){
				onError(e);
			}, function(season){
				season.name = seasonData.seasonName;
				season.miniseasons.forEach(function(miniseason, idx){
					debugger;
					console.log('Team var: ' + 's' + (idx+1) + 'FixtureTeam');
					var test = seasonData['s' + (idx+1) + 'FixtureTeam'];
					console.log('... which evaluates to: ' + test);
					//console.log(test.length);

					console.log({miniseason: miniseason});
					miniseason.deadline = seasonData['s' + (idx+1) + 'Deadline'];
					/*
					miniseason.fixtures = [];

					seasonData['s' + (idx+1) + '_fixture-team'].forEach(function(team, jdx){
						miniseason.fixtures[miniseason.fixtures.length] = {
							team: team,
							venue: seasonData['s' + (idx+1) + '_fixture-venue'][jdx],
							date: seasonData['s' + (idx+1) + '_fixture-date'][jdx]
						};
					});
					*/
				});
				console.log({season: season});
				db.save(season, function(e, result){
					if (e) return onError(e);
					return onSuccess();
				});
			});
		}
	};
}