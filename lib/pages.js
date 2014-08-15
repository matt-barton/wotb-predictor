function indexPage(response, auth, data) {
	data.auth = {
		loggedIn: auth.loggedIn(),
		userName: auth.userName()
	}
	response.render('index', data);
}

function registerPage(response, data) {
	response.render('register', data);
}

module.exports = {
	index: indexPage,
	register: registerPage
}