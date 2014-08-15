module.exports = function(session) {
	return {
		loggedIn: function() {
			return typeof session.userName != 'undefined';
		},

		signUp: function(data, onSuccess, onFailure) {
			console.log(data);
			var userName = data.userName
			  , password = data.password
			  , repeat   = data.repeat
			  , ok       = true;

			if (!userName || !password || !repeat) return onFailure('invalid');
			if (password != repeat) return onFailure('Passwords don\'t match');

			// FIXME: test username for existance

			if (ok) {
				session.userName = userName;
				onSuccess();
			} 
			else{
				onFailure('');
			} 
		},

		userName: function(){
			return typeof session.userName != 'undefined'
				? session.userName
				: '';
		}
	};
}