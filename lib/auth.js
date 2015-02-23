var bcrypt = require('bcrypt-nodejs');
var uuid = require('node-uuid');

function processSignIn(session, userDoc, autologin) {
	session.user = userDoc;
	session.autologin = autologin;
}

module.exports = function(session, users) {
	return {
		loggedIn: function() {
			return typeof session.user != 'undefined' && session.user !== null;
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
						onSuccess();
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

		setLoginCookie: function(data, response, onSuccess) {
			var onError = function(e) {
				console.log('IMPLEMENT ERROR HANDLER');
			};
			users.getUserByUsername(data.username, onError, function(userDoc){
				users.updateLoginToken(userDoc, uuid.v1(), onError, function() {
					response.cookie('autologin', {
						username: data.username,
						token: userDoc.loginToken
					});
					onSuccess();
				});
			});
		},

		doAutoLogin: function(data, onSuccess, onError) {
			users.getUserByUsername(data.username, onError, function(user){
				if (user.loginToken == data.token) {
					processSignIn(session, user, true);
					onSuccess();
				}
				else { 
					onError('Login cookie incorrect.');
				}
			});
		}
	};
}