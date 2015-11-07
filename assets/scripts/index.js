function jsInit() {

	if (!cookieCheck()) {
		$('#cookie-notice').show();
		return;
	}

	var displaySaveButtons = function() {
		$('.post-predictions').show();
	}

	var hideSaveButtons = function() {
		$('.post-predictions').hide();
	}
	var msg = $('#message').val();
	if (msg) {
		notifyBar(msg, 'success');
	}

	$('.enable-save').on('change', displaySaveButtons);

	// save predictions buttons
	$('.post-predictions').click(function(){
		
		var predictions = [];

		var miniseasons = $('.miniseason-block');
		for (var x = 0; x < miniseasons.length; x++ ) {
			var miniSeasonDiv = miniseasons[x];
			var fixtures = $('.fixture-block', miniSeasonDiv);
			for (var y = 0; y < fixtures.length; y++) {
				var fixtureDiv = fixtures[y];
				var predictionControl = $('.fixture-prediction', fixtureDiv);
				if (predictionControl.length == 0) continue;
				var prediction = predictionControl.val();
				if (prediction.length == 0) continue;
				predictions[predictions.length] = {
					team: $('.fixture-team', fixtureDiv)
						.text()
						.trim(),
					venue: $('.fixture-venue', fixtureDiv)
						.text()
						.trim()
						.replace('(', '')
						.replace(')', ''),
					prediction: prediction
				}
			}
		}

		$.blockUI();

		$.ajax({
			type: 'post',
			url: '/savePredictions',
			data: {
				predictions: predictions
			},
			dataType: 'json',
			success: function(result){
				if (result.error) {
					$.unblockUI();
					if ($.isArray(result.error)) {
						result.error.forEach(function(eachError){
							notifyBar(eachError, 'error');
						});
					}
					else {
						notifyBar(result.error, 'error');
					}
				}
				else {
					if (result.redirect) {
						window.location.href = result.redirect;
					}
					else {
						$.unblockUI();
						if (result.message) notifyBar(result.message, 'success');
						hideSaveButtons();
					}
				}
			},
			error: function(jqXHR, status, error){
				$.unblockUI();
				notifyBar('Cannot save predictions. There was an error.', 'error');
			}
		});
	});
}

function cookieCheck() {
	$.cookie('test-enabled', 1);
	if ($.cookie('test-enabled') == 1) {
		$.removeCookie('test-enabled');
		return true;
	}
	return false;
}