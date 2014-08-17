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
			return typeof session.userName != 'undefined';
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

			db.view('user/byUserName', {key: userName}, function (e, doc){
				if (e) return onFailure(e);
				if (doc.length == 0) {
					db.save({
						type: "user",
						userName: userName,
						password: bcrypt.hashSync(password)
					}, function (e, result){
						if (e) return onFailure(e);
						session.userName = userName;
						onSuccess();
					});
				} 
				else{
					onFailure('Username in use');
				} 
			});
		},

		signIn: function(data, onSuccess, onFailure) {
			
			var userName = data.userName
			  , password = data.password;

			getUserByUserName(db, userName, function(user){
				console.log('user:');
				console.log(user);
				if (user.userName) {
					if (bcrypt.compareSync(password, user.password)) {
						session.userName = userName;
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

		userName: function(){
			return typeof session.userName != 'undefined'
				? session.userName
				: '';
		}
	};
}