var bcrypt = require('bcrypt-nodejs');

function getUserByUsername(db, username, callback) {
	db.view('user/byUsername', {
		key: username.toLowerCase()
	}, function (e, doc){
		if (doc.length == 0) {
			callback({});
		}
		else {
			callback(doc[0].value);
		}
	});
}


function processSignIn(session, userDoc) {
	session.user = userDoc;
}

module.exports = function(db, session) {
	return {
		loggedIn: function() {
			return typeof session.user != 'undefined' && session.user !== null;
		},

		usernameInUse: function(username, callback){
			getUserByUsername(db, username, function(user) {
				callback(typeof user.username != 'undefined');
			});
		},

		signUp: function(data, onSuccess, onFailure) {
			var username = data.username
			  , password = data.password
			  , repeat   = data.repeat;

			if (!username || !password || !repeat) return onFailure('Username and Password (twice) are required.');
			if (password != repeat) return onFailure('Passwords don\'t match.');
			if (password.length < 6) return onFailure('That\'s a shit password.');
			if (password == username) return onFailure('Password can\'t be the same as Username. You dolt.');
			if (password == 'password') return onFailure('Don\'t use \'password\' as your password. Are you slow?');

			getUserByUsername(db, username, function(user){
				if (user.username) {
					onFailure('Username in use');
				} 
				else {
					var newUser = {
						type: "user",
						role: "user",
						username: username,
						password: bcrypt.hashSync(password)
					};
					db.save(newUser, function (e, result){
						if (e) return onFailure(e);
						processSignIn(session, newUser);
						onSuccess();
					});
				}
			});
		},

		signIn: function(data, onSuccess, onFailure) {

			var username = data.username
			  , password = data.password;

			getUserByUsername(db, username, function(user){
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

		isAdmin: function() {
			return typeof session.user != 'undefined' 
				&& session.user !== null
				&& session.user.role == 'admin';
		}
	};
}