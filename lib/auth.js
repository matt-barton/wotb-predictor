var bcrypt = require('bcrypt-nodejs');
var uuid = require('node-uuid');

function processSignIn(session, userDoc, autologin) {
	session.user = userDoc;
	session.autologin = autologin;
}

module.exports = function(session, users) {
	if (typeof session == 'undefined') session = {};

	function setLoginCookie(username, response, oldToken, onSuccess) {
		var onError = function(e) {
			console.log('IMPLEMENT ERROR HANDLER');
			console.log(e);
		};
		users.getUserByUsername(username, onError, function(userDoc){
			var newToken = uuid.v1();
			users.updateLoginToken(userDoc, newToken, oldToken, onError, function() {
				response.cookie('autologin', {
					username: username,
					token: newToken
				}, {
					expires: new Date (2999, 31, 12)
				});
				onSuccess();
			});
		});
	}

	return {
		loggedIn: function() {
			return session && typeof session.user != 'undefined' && session.user !== null;
		},

		usernameInUse: function(username, callback){
			users.getUserByUsername(
				username, 
				function(e) {
					console.log("IMPLEMENT ERROR HANDLING");
				}, 
				function(user) {
					callback(typeof user.username != 'undefined');
				}
			);
		},

		signUp: function(data, onSuccess, onFailure) {
			var username = data.username
			  , password = data.password
			  , repeat   = data.repeat;

			if (!username || !password || !repeat) return onFailure('Username and Password (twice) are required.');
			if (password != repeat) return onFailure('Passwords don\'t match.');
			if (password.length < 6) return onFailure('That\'s a shitty password.');
			if (password == username) return onFailure('Password can\'t be the same as Username. You dolt.');
			if (password.toLowerCase() == 'password') return onFailure('Don\'t use \'password\' as your password. Are you slow?');

			users.getUserByUsername(username, onFailure, function(user){
				if (user.username) {
					onFailure('Username in use');
				} 
				else {
					users.createUser(
						username, 
						bcrypt.hashSync(password),
						data.clientIp,
						function(e) {
							return onFailure(e);
						},
						function(newUser) {
							processSignIn(session, newUser);
							onSuccess();
						});
				}
			});
		},

		signIn: function(data, onSuccess, onFailure) {

			var username = data.username
			  , password = data.password;

			users.getUserByUsername(username, onFailure, function(user){
				if (user.username) {
					if (bcrypt.compareSync(password, user.password)) {
						processSignIn(session, user);
						users.registerUserIP(user, data.clientIp, function(e){
							if (e) return onError(e);
							onSuccess();
						});
					}
					else {
						onFailure('Username/Password incorrect.');
					}
				}
				else {
					onFailure('Username/Password incorrect');
				}
			});
		},

		signOut: function(callback) {
			var onComplete = function() {
				session.regenerate(function(){
					callback();
				});
			};
			if (session.user.username) {
				users.getUserByUsername(session.user.username, function(e) {
					if (e) return callback(e);
				}, function(user){
					users.clearUserLoginTokens(user, function(e) {
						if (e) return callback(e);
						onComplete();
					});
				});
			}
			else {
				onComplete();
			}
		},

		username: function() {
			return typeof session.user != 'undefined' && session.user !== null
				? session.user.username
				: '';
		},

		userId: function() {
			return typeof session.user != 'undefined' && session.user !== null
				? session.user._id
				: '';
		},

		isAdmin: function() {
			return typeof session.user != 'undefined' 
				&& session.user !== null
				&& session.user.role == 'admin';
		},

		setLoginCookie: setLoginCookie,

		updateTrackingCookie: function(userId, request, response, callback) {
			if (!request.cookies._uT) {
				response.cookie('_uT', [userId], {
					expires: new Date (2999, 31, 12)
				});
				return callback();
			}
			var trackedIdentities = request.cookies._uT;
			var pseudonyms = [];
			var addCurrentIdentityToTracking = true;
			for(var x=0; x<trackedIdentities.length; x++) {
				if (trackedIdentities[x] != userId) {
					pseudonyms.push(trackedIdentities[x]);
				}
				else {
					addCurrentIdentityToTracking = false;
				}
			}
			if (pseudonyms.length == 0) return callback();
			var allPseudonyms = pseudonyms.concat([userId]);
			users.getUserById(userId, function(e, user) {
				if (e) return callback(e);
				users.registerUserPseudonyms(user, pseudonyms, function(e) {
					if (e) return callback(e);
					if (addCurrentIdentityToTracking) trackedIdentities.push(userId);
					response.cookie('_uT', trackedIdentities, {
						expires: new Date (2999, 31, 12)
					});
					callback();
				});
			});
		},

		doAutoLogin: function(autologinCookie, response, clientIp, onSuccess, onError) {
			users.getUserByUsername(autologinCookie.username, onError, function(user){
				if (!user.loginTokens) return onError('Invalid autologin attempt');
				var token = autologinCookie.token;
				var tokenValid = false;
				for (var x=0; x<user.loginTokens.length; x++) {
					if (user.loginTokens[x] == token) {
						tokenValid = true;
						continue;
					}
				}
				if (tokenValid) {
					setLoginCookie(autologinCookie.username, response, token, function() {
						users.getUserByUsername(autologinCookie.username, onError, function(user){
							processSignIn(session, user, true);
							users.registerUserIP(user, clientIp, function(e){
								if (e) return onError(e);
								onSuccess();
							});
						});
					});
				}
				else { 
					onError('Login cookie incorrect.');
				}
			});
		}
	};
}