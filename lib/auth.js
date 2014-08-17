var bcrypt = require('bcrypt-nodejs');

function getUserByUserName(db, userName, callback) {
	db.view('user/byUserName', {
		key: userName.toLowerCase()
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

		signUp: function(data, onSuccess, onFailure) {
			var userName = data.userName
			  , password = data.password
			  , repeat   = data.repeat;

			if (!userName || !password || !repeat) return onFailure('Username and Password (twice) are required.');
			if (password != repeat) return onFailure('Passwords don\'t match.');
			if (password.length < 6) return onFailure('That\'s a shit password.');
			if (password == userName) return onFailure('Password can\'t be the same as Username. You dolt.');
			if (password == 'password') return onFailure('Don\'t use \'password\' as your password. Are you slow?');

			getUserByUserName(db, userName, function(user){
				if (user.userName) {
					onFailure('Username in use');
				} 
				else {
					var newUser = {
						type: "user",
						role: "user",
						userName: userName,
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

			var userName = data.userName
			  , password = data.password;

			getUserByUserName(db, userName, function(user){
				if (user.userName) {
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

		userName: function() {
			return typeof session.user != 'undefined' && session.user !== null
				? session.user.userName
				: '';
		},

		isAdmin: function() {
			return typeof session.user != 'undefined' 
				&& session.user !== null
				&& session.user.role == 'admin';
		}
	};
}