
function getCurrentSeason(db, onError, onSuccess) {
	db.view('fixtures/currentSeason', {}, function (e, doc){
		if (e) return onError(e);
		if (doc.length == 0) {
			onSuccess({
				type: 'season',
				name: '',
				current: true,
				miniseasons: [{
					name: 'Season 1',
					htmlId: 's1',
					deadline: '',
					fixtures: []
				}, {
					name: 'Season 2',
					htmlId: 's2',
					deadline: '',
					fixtures: []
				}, {
					name: 'Season 3',
					htmlId: 's3',
					deadline: '',
					fixtures: []
				}]
			});
		}
		else {
			onSuccess(doc[0]);
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
		}
	};
}