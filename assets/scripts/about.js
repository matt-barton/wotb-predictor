function aboutInit() {

	var container = $('div#about div#container');
	
	$('div#about div#nav a').click(function(e){
		e.preventDefault();
		var target = $('#' + $(this).prop('href').split('#')[1]);
		container.scrollTo(target, 1000);
	});

	var resizeContainer = function() {
		var topOffset = container.position().top;
		var footerHeight = $('footer').height();
		container.height($(window).height() - topOffset - footerHeight);
	}
	resizeContainer();
	$(window).resize(resizeContainer);
}