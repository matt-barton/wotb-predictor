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

	function updateLoginToken(userDoc, token, onError, onSuccess) {
		userDoc.loginToken = token;
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

	function saveUserPredictions(data, season, callback) {
		console.log(data);
		console.log(season);
		callback();
	}

	return {
		createUser: createUser,
		updateLoginToken: updateLoginToken,
		getUserByUsername: getUserByUsername,
		getUserPredictions: getUserPredictions,
		saveUserPredictions: saveUserPredictions
	};
};
