function jsInit() {

	var displaySaveButtons = function() {
		$('.post-predictions').show();
	}

	var hideSaveButtons = function() {
		$('.post-predictions').hide();
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

		$.blockUI({
			css: { 
	            border: 'none', 
	            padding: '15px', 
	            backgroundColor: '#000', 
	            '-webkit-border-radius': '10px', 
	            '-moz-border-radius': '10px', 
	            opacity: .5, 
	            color: '#fff' 
    		}
    	});

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
							$.notify(eachError, 'error');
						});
					}
					else {
						$.notify(result.error, 'error');
					}
				}
				else {
					if (result.redirect) {
						window.location.href = result.redirect;
					}
					else {
						$.unblockUI();
						if (result.message) $.notify(result.message, 'success');
						hideSaveButtons();
					}
				}
			},
			error: function(jqXHR, status, error){
				$.unblockUI();
				$.notify('Cannot save predictions. There was an error.', 'error');
			}
		});
	});
}