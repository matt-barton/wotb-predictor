var appConfig = require('../app.config.json');

module.exports = function(db) {

	function createUser(username, password, onError, onSuccess) {
		var newUser = {
			type: "user",
			role: "user",
			username: username,
			password: password
		};
		db.save(newUser, function (e, result){
			if (e) return onError(e);
			newUser._id = result.id;
			newUser._rev = result.rev;
			onSuccess(newUser);
		});

	}

	function updateLoginToken(userDoc, token, clientIp, onError, onSuccess) {
		if (!userDoc.loginTokens) userDoc.loginTokens = {};
		userDoc.loginTokens[clientIp] = token;
		db.save(userDoc, function(e, result){
			if (e) return onError(e);
			onSuccess();
		});
	}

	function getUserByUsername(username, onError, callback) {
		db.view('user/byUsername', {
			key: username.toLowerCase()
		}, function (e, doc){
			if (e) return onError(e);
			if (doc.length == 0) {
				callback({});
			}
			else {
				callback(doc[0].value);
			}
		});
	}

	function getUserPredictions(userId, onError, onSuccess) {
		db.view('user/predictionsByUserId', {
			key: userId
		}, function (e, doc){
			if (e) return onError(e);
			if (doc.length == 0) {
				onSuccess({});
			}
			else {
				onSuccess(doc[0].value);
			}
		});
	}

	function getAllUsers(callback) {
		db.view('user/all', {}, function (e, docs){
			if (e) return callback(e);
			callback(null, docs);
		});
	}

	function saveUserPredictions(data, season, user, callback) {
		var predictions = data.predictions;
		if (user.predictions == null) {
			user.predictions = {};
		}
		if (user.predictions[season._id] == null) {
			user.predictions[season._id] ={};
		}
		var userPredictions = user.predictions[season._id];
		for (var x=0; x<season.miniseasons.length; x++) {
			var miniseason = season.miniseasons[x];
			if (!userPredictions.miniseasons) {
				userPredictions.miniseasons = [];
			}
			var deadline = new Date(miniseason.deadline);
			deadline = deadline.setDate(deadline.getDate() + 1);
			if (deadline < Date.now()) continue;
			if (userPredictions.miniseasons[x] == null) {
				userPredictions.miniseasons[x] = {
					date: null,
					predictions: []
				};
			}
			for (var y=0; y<miniseason.fixtures.length; y++) {
				var fixture = miniseason.fixtures[y];
				for (var z=0; z<predictions.length; z++) {
					var prediction = predictions[z];
					if (prediction.team == fixture.team &&
						prediction.venue == fixture.venue) {
						var predictionUpdated = false;
						for (var i=0; i<userPredictions.miniseasons[x].predictions.length; i++) {
							userPrediction = userPredictions.miniseasons[x].predictions[i];
							if (prediction.team == userPrediction.team &&
								prediction.venue == userPrediction.venue) {
								userPredictions.miniseasons[x].predictions[i].prediction = prediction.prediction;
								predictionUpdated = true;
							}
						}
						if (!predictionUpdated) {
							userPredictions.miniseasons[x].predictions.push(prediction);
						}
					}
				}
				if (userPredictions.miniseasons[x].predictions.length > 0) {
					userPredictions.miniseasons[x].date = new Date();
				}
			}
		}
		user.predictions[season._id] = userPredictions;
		db.save(user, function(e, result){
			if (e) return callback(e);
			callback(null, "Predictions saved.");
		});
	}

	return {
		createUser: createUser,
		updateLoginToken: updateLoginToken,
		getUserByUsername: getUserByUsername,
		getUserPredictions: getUserPredictions,
		saveUserPredictions: saveUserPredictions,
		getAllUsers: getAllUsers
	};
};
