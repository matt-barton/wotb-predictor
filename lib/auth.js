var bcrypt = require('bcrypt-nodejs');

function getUserByUserName(db, userName, callback) {
	db.view('user/byUserName', {key: userName}, function (e, doc){
		if (doc.length == 0) {
			callback({});
		}
		else {
			callback(doc[0].value);
		}
	});
}

module.exports = function(db, session) {
	return {
		loggedIn: function() {
			return typeof session.userName != 'undefined' && session.userName !== null;
		},

		signUp: function(data, onSuccess, onFailure) {
			var userName = data.userName.toLowerCase()
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
					db.save({
						type: "user",
						userName: userName,
						password: bcrypt.hashSync(password)
					}, function (e, result){
						if (e) return onFailure(e);
						session.userName = data.userName;
						onSuccess();
					});
				}
			});
		},

		signIn: function(data, onSuccess, onFailure) {

			var userName = data.userName.toLowerCase()
			  , password = data.password;

			getUserByUserName(db, userName, function(user){
				if (user.userName) {
					if (bcrypt.compareSync(password, user.password)) {
						session.userName = data.userName;
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
			session.userName = null;
			onSuccess();
		},

		userName: function() {
			return typeof session.userName != 'undefined'
				? session.userName
				: '';
		}
	};
}