var extend = require('extend');

function indexPage(response, auth, data) {
	extend(data, {
		auth: {
			loggedIn: auth.loggedIn(),
			userName: auth.userName(),
			admin: auth.isAdmin()
		}});
	response.render('index', data);
}

function indexRedirect(response) {
	response.redirect('/');
}

function registerPage(response, data) {
	response.render('register', data);
}

module.exports = {
	index: indexPage,
	register: registerPage,
	indexRedirect: indexRedirect
}