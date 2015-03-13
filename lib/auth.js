var bcrypt = require('bcrypt-nodejs');
var uuid = require('node-uuid');

function processSignIn(session, userDoc, autologin) {
	session.user = userDoc;
	session.autologin = autologin;
}

module.exports = function(session, users) {
	if (typeof session == 'undefined') session = {};
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

		signOut: function(onSuccess) {
			session.user = null;
			onSuccess();
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

		setLoginCookie: function(data, clientIp, response, onSuccess) {
			var onError = function(e) {
				console.log('IMPLEMENT ERROR HANDLER');
			};
			users.getUserByUsername(data.username, onError, function(userDoc){
				var newToken = uuid.v1();
				users.updateLoginToken(userDoc, newToken, clientIp, onError, function() {
					response.cookie('autologin', {
						username: data.username,
						token: newToken
					}, {
						expires: new Date (2999, 31, 12)
					});
					onSuccess();
				});
			});
		},

		updateTrackingCookie: function(userId, request, response, callback) {
			if (!request.cookies._uT) {
				response.cookie('_uT', [userId], {
					expires: new Date (2999, 31, 12)
				});
				return;
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
			if (pseudonyms.length == 0) return;
			var allPseudonyms = pseudonyms.concat([userId]);
			users.getUserById(userId, function(e, user) {
				if (e) return callback(e);
				users.registerUserPseudonyms(user, pseudonyms, callback);
			});
			if (addCurrentIdentityToTracking) trackedIdentities.push(userId);
			response.cookie('_uT', trackedIdentities, {
				expires: new Date (2999, 31, 12)
			});
		},

		doAutoLogin: function(data, clientIp, onSuccess, onError) {
			users.getUserByUsername(data.username, onError, function(user){
				if (user.loginTokens && user.loginTokens[clientIp] == data.token) {
					processSignIn(session, user, true);
					users.registerUserIP(user, clientIp, function(e){
						if (e) return onError(e);
						onSuccess();
					});
				}
				else { 
					onError('Login cookie incorrect.');
				}
			});
		}
	};
}