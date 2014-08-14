module.exports = function(session) {
	return {
		loggedIn: function() {
			return typeof session.userName != 'undefined';
		},

		signUp: function(request, onSuccess, onFailure) {
			var userName = request.body.userName
			  , password = request.body.password
			  , repeat   = request.body.repeat
			  , ok       = true;

			if (!userName || !password || !repeat) return onFailure('invalid');
			if (password != repeat) return onFailure('Passwords don\'t match');

			// FIXME: test username for existance

			if (ok) {
				session.userName = request.body.userName;
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