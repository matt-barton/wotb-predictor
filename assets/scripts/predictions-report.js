function initPredictionsReport() {

	$('.incomplete-predictions-toggle').click(function(evt){
		var link = $(this);
		var index = this.getAttribute('data-index');
		$('.incomplete-predictions-area').each(function(){
			if (this.getAttribute('data-index') == index) {
				$(this).toggle();
			}
		});
		link.text(link.text() == '[show]' ? '[hide]' : '[show]');
	});

	$('.prediction').click(function(){
		var predictionBox = $(this);
		var miniseason = this.getAttribute('data-miniseason');
		var user = this.getAttribute('data-user');
		var details = $('.prediction-details', predictionBox);

		if (predictionBox.hasClass('prediction-small')) {
			predictionBox
				.removeClass('prediction-small')
				.removeClass('one-eighth')
				.addClass('prediction-large')
				.addClass('one-quarter');
			details.show('slow');
		}
		else {
			predictionBox
				.removeClass('prediction-large')
				.removeClass('one-quarter')
				.addClass('prediction-small')
				.addClass('one-eighth');
			details.hide('slow');
		}
	});

	var fromDateField = $('#from-date');
	if (fromDateField.val() != '') {
		$('.table-format-link').each(function() {
			$(this).prop('href', 
				$(this).prop('href') + '&from=' + fromDateField.val());
		})
	}

	$('#from-date').datepicker({
		minDate: null
	});

	$('#from-date-btn').click(function(){
		try {
			var url = window.location.pathname + '?from=' + new Date($('#from-date').val()).toJSON();
			window.location = url;
		}
		catch(e) {
			alert ('That didn\'t work.');
		}
	});
}