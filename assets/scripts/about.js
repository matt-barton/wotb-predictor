function aboutInit() {

	var container = $('div#about div#container');
	
	$('div#about a.scroll').click(function(e){
		e.preventDefault();
		var target = $('#' + $(this).prop('href').split('#')[1]);
		container.scrollTo(target, 750, {
			easing: 'easeOutQuad'
		});
	});

	var resizeContainer = function() {
		var topOffset = container.position().top;
		var footerHeight = $('footer').height();
		container.height($(window).height() - topOffset - footerHeight);
	}
	resizeContainer();
	$(window).resize(resizeContainer);
}