var appConfig = require('../app.config.json');
var bcrypt = require('bcrypt-nodejs');

module.exports = function(db) {

	function generateAuthCode() {
		var text = "";
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789012345678901234567890123456789";

		for (var i=0; i < appConfig.authCodeLength; i++)
		{
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	}

	function generatePassword() {
		var text = "";
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

		for (var i=0; i < 10; i++)
		{
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	}

	function createUser(username, password, clientIp, onError, onSuccess) {
		var newUser = {
			type: "user",
			role: "user",
			username: username,
			password: password,
			accepted: false,
			authCode: generateAuthCode(),
			knownClientIPs: [
				clientIp
			]
		};
		db.save(newUser, function (e, result){
			if (e) return onError(e);
			newUser._id = result.id;
			newUser._rev = result.rev;
			onSuccess(newUser);
		});

	}

	function updateLoginToken(userDoc, newToken, oldToken, onError, onSuccess) {
		if (!userDoc.loginTokens) userDoc.loginTokens = [];
		if (oldToken) {
			var tokens = [];
			for (var x=0; x<userDoc.loginTokens.length; x++) {
				if (userDoc.loginTokens[x] != oldToken) tokens.push(userDoc.loginTokens[x]);
			}
			userDoc.loginTokens = tokens;
		}
		userDoc.loginTokens.push(newToken);
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

	function getUserAuthCodes(callback) {
		db.view('user/authCodes', {}, function (e, docs){
			if (e) return callback(e);
			callback(null, docs);
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

	function getUserById(id, callback) {
		db.view('user/all', {
			key: id
		}, function (e, doc){
			if (e) return callback(e);
			if (doc.length == 0) {
				callback(null, {});
			}
			else {
				callback(null, doc[0].value);
			}
		});
	}

	function saveUserPredictions(data, season, user, callback) {
		var predictions;
		if (Array.isArray(data.predictions)) {
			predictions = data.predictions
		}
		else {
			var predictions = []
			for (var p in data.predictions) {
				if (data.predictions.hasOwnProperty(p)) {
					predictions.push(data.predictions[p])
				}
			}
		}
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

	function registerUserIP(user, ipAddress, callback) {
		if (!user.knownClientIPs) {
			user.knownClientIPs = [];
		}
		if (user.knownClientIPs.indexOf(ipAddress) == -1) {
			user.knownClientIPs.push(ipAddress);
		}
		db.save(user, function(e, result){
			if (e) return callback(e);
			callback();
		});
	}

	function registerUserPseudonyms(user, pseudonyms, callback) {
		user.pseudonyms = pseudonyms;
		db.save(user, function(e){
			if (e) return callback(e);
			callback();
		});
	}

	function clearUserLoginTokens(user, callback) {
		user.loginTokens = [];
		db.save(user, function(e){
			if (e) return callback(e);
			callback();
		});
	}

	function authoriseUser(userId, callback) {
		getUserById(userId, function(e, user) {
			if (e) return callback(e);
			user.accepted = true;
			db.save(user, function(e) {
				if (e) return callback(e);
				callback();
			});
		});
	}

	function resetPassword(userId, callback) {
		getUserById(userId, function(e, user) {
			if (e) return callback(e);
			var newPassword = generatePassword();
			user.password = bcrypt.hashSync(newPassword)
			db.save(user, function(e) {
				if (e) return callback(e);
				callback(null, newPassword);
			});
		});
	}

	return {
		createUser: createUser,
		updateLoginToken: updateLoginToken,
		getUserByUsername: getUserByUsername,
		getUserAuthCodes: getUserAuthCodes,
		getUserById: getUserById,
		getUserPredictions: getUserPredictions,
		saveUserPredictions: saveUserPredictions,
		getAllUsers: getAllUsers,
		registerUserIP: registerUserIP,
		registerUserPseudonyms: registerUserPseudonyms,
		clearUserLoginTokens: clearUserLoginTokens,
		authoriseUser: authoriseUser,
		resetPassword: resetPassword
	};
};
