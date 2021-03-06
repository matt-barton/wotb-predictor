function fixturesAdminInit() {

	var message = $('#message').val();
	if (message.length > 0) {
		notifyBar(message, 'success');
	}

	var seasonIdField = $('#seasonId');
	var errorGroups = [];

	var readonly = false;
	if ($('#seasonCurrent').length > 0) {
		var readonly = $('#seasonCurrent').val() == 1 ? true : false;
	}
	if (readonly) {
		$('.wotb-delete-fixture').hide();
		$('.wotb-trigger-add-controls').hide();
		$('.fixture-input').prop('disabled', 'disabled');
		$('.miniseason-deadline').prop('disabled', 'disabled');
		$('#seasonName').prop('disabled', 'disabled');
	}
	else {

		var displaySaveButtons = function() {
			$('.post-fixtures').show();
			$('#make-game-current-link').hide();
		}

		$('input.enable-save').on('keyup', displaySaveButtons);
		$('.enable-save').on('change', displaySaveButtons);

		// date pickers
		$('.miniseason-deadline').datepicker();
	
		// add fixture fields
		var removeErrorClass = function (el) {
			if (errorGroups.length == 0) return;
			remainderErrorGroups = [];
			for (var x=0; x<errorGroups.length; x++) {
				if ($.inArray(el, errorGroups[x]) == -1) {
					remainderErrorGroups[remainderErrorGroups.length] = errorGroups[x];
				}
				else {
					for (var y=0; y<errorGroups[x].length; y++) {
						$('#' + errorGroups[x][y]).parent().removeClass('field-with-errors');
					}
				}
			}
			errorGroups = remainderErrorGroups;
		};

		$('.fixture-input').keyup(function(){
			removeErrorClass($(this).attr('id'));
		});

		$('.fixture-input').change(function(){
			removeErrorClass($(this).attr('id'));
		});

		// delete buttons
		var deleteFixture = function() {
			var fixture = $(this).closest('.fixture-block');
			fixture.remove();
			displaySaveButtons();
		};

		$('.wotb-delete-fixture').click(deleteFixture);

		// trigger add fixture controls
		$('.wotb-trigger-add-controls').click(function(){
			var miniSeasonId = $(this)
				.attr('id')
				.split('-')[0];
			$(this)
				.parent()
				.hide();
			$('.add-fixture-controls-' + miniSeasonId).slideDown(500);
		});

		// add fixture buttons
		$('.wotb-add-fixture').click(function(){
			var miniSeasonId = $(this)
				.attr('id')
				.split('-')[0];

			var fixtureTeamField = $('#' + miniSeasonId + '-add-fixture-team');
			var fixtureVenueField = $('#' + miniSeasonId + '-add-fixture-venue');
			var fixtureTeam = fixtureTeamField.val();
			var fixtureVenue = fixtureVenueField.val();

			if (!fixtureTeam || !fixtureVenue) {
				if (!fixtureTeam) fixtureTeamField.parent().addClass('field-with-errors');
				if (!fixtureVenue) fixtureVenueField.parent().addClass('field-with-errors');
				notifyBar('Cannot add this fixture - information is missing', 'error');
				return;
			}

			var allFixtures = $('.fixture-block')
			  , processedFixtures = 0
			  , duplicate = false;

			errorGroups = [];

			allFixtures.each(function(i, fixture){
				if ($('.fixture-team', fixture).val().toLowerCase() == fixtureTeam.toLowerCase() && $('.fixture-venue', fixture).val() == fixtureVenue) {
					notifyBar('Cannot add this fixture - duplicate team/fixture', 'error');
					duplicate = true;
					var errorGroup = [
						fixtureTeamField.attr('id'),
						fixtureVenueField.attr('id'),
						$('.fixture-team', fixture).attr('id'),
						$('.fixture-venue', fixture).attr('id')
					];
					errorGroups[errorGroups.length] = errorGroup;
					errorGroup.forEach(function(id, x){
						$('#' + id).parent().addClass('field-with-errors');
					});
				}

				processedFixtures++;
			});

			var backstop = 0;
			while(processedFixtures < allFixtures.length) {
				backstop ++;
				if (backstop > 1000) {
					console.log('backstop prevents infinite loop')
					return;
				}
			}

			if (duplicate) return;

			var fixturesDiv = $('#' + miniSeasonId + '-fixtures-grid');
			var numberOfFixtures = $('.fixture-team', fixturesDiv).length;

			var teamDiv = $('<div class="grid__item three-eighths">')
					.css('display', 'none')
					.append($('<input type="text" />')
						.attr('id', miniSeasonId + '-' + numberOfFixtures + '-fixture-team')
						.attr('size', 12)
						.addClass('fixture-team')
						.addClass('input-text')
						.addClass('fixture-input')
						.addClass('enable-save')
					.val(fixtureTeam));
			var venueDiv = $('<div class="grid__item two-eighths">')
					.css('display', 'none')
					.append(
						$('<select>')
							.attr('id', miniSeasonId + '-' + numberOfFixtures + '-fixture-venue')
							.addClass('fixture-venue')
							.addClass('fixture-input')
							.addClass('enable-save')
							.append('<option' + (fixtureVenue == 'H' ? ' selected' : '') + '>H</option>')
							.append('<option' + (fixtureVenue == 'A' ? ' selected' : '') + '>A</option>'));
			var deleteDiv = $('<div class="grid__item three-eighths">')
				.css('display', 'none')
				.append($('<i class="fa fa-times pointer" title="Delete Fixture"></i>')
					.attr('id', miniSeasonId + '-' + numberOfFixtures + '-fixture-delete')
					.click(deleteFixture));

			$('#' + miniSeasonId + '-fixtures-grid')
				.append($('<div class="fixture-block">')
					.append(teamDiv)
					.append(venueDiv)
					.append(deleteDiv));

			$('#' + miniSeasonId + '-no-fixtures-div').hide();
			teamDiv.show('slow');
			venueDiv.show('slow');
			deleteDiv.show('slow');

			fixtureTeamField.val('');
			fixtureVenueField.val('');
			displaySaveButtons();
		});

		// save fixtures buttons
		$('.post-fixtures').click(function(){
			
			var ok = true;
			var allFixtures = $('.fixture-block');
			var rowsWithErrors = [];
			var seasonNameField = $('#seasonName');

			errorGroups = [];

			$('.field-with-errors').removeClass('field-with-errors');

			var season = {
				id: seasonIdField.val(),
				name: seasonNameField.val(),
				miniseasons: []
			};

			if (seasonNameField.val().length == 0) {
				seasonNameField.parent().addClass('field-with-errors');
				notifyBar('Cannot add this fixture - duplicate team/fixture', 'error');
				ok = false;
			}

			$('.miniseason-deadline').each(function(){
				var deadlineField = $(this);
				if (!deadlineField.val()) {
					var miniSeasonId = deadlineField
						.attr('id')
						.split('-')
						[0];
					var fixturesGrid = $('#' + miniSeasonId + '-fixtures-grid');
					if ($('.fixture-team', fixturesGrid).length > 0) {
						notifyBar('Cannot save fixtures - season ' + ((miniSeasonId/1) + 1) + ' needs a deadline date.', 'error');
						ok = false;
					}
				}
			});

			for(var x=0; x<allFixtures.length; x++) {
				if (rowsWithErrors.indexOf(x) >= 0) continue;
				var team  = $('.fixture-team', allFixtures[x]).val()
				  , venue = $('.fixture-venue', allFixtures[x]).val();

				if (!team || !venue) {
					if (!team) $('.fixture-team', allFixtures[x]).parent().addClass('field-with-errors');
					if (!venue) $('.fixture-venue', allFixtures[x]).parent().addClass('field-with-errors');
					notifyBar('Cannot save fixtures - information is missing', 'error');
					ok = false;
				}

				for(var y=0; y<allFixtures.length; y++) {
					if (rowsWithErrors.indexOf(y) >= 0) continue;
					if (x==y) continue;

					if ($('.fixture-team', allFixtures[y]).val().toLowerCase() == team.toLowerCase() && 
						$('.fixture-venue', allFixtures[y]).val() == venue) {
						notifyBar('Cannot save fixtures - team/venue duplicate', 'error');

						var errorGroup = [
							$('.fixture-team', allFixtures[y]).attr('id'),
							$('.fixture-venue', allFixtures[y]).attr('id'),
							$('.fixture-team', allFixtures[x]).attr('id'),
							$('.fixture-venue', allFixtures[x]).attr('id')
						];
						errorGroups[errorGroups.length] = errorGroup;
						errorGroup.forEach(function(id){
							$('#' + id).parent().addClass('field-with-errors');
						});

						ok = false;
						if(!rowsWithErrors.indexOf(x)) rowsWithErrors.push(x);
						if(!rowsWithErrors.indexOf(y)) rowsWithErrors.push(y);
					}
				}
			}

			if (!ok) return;

			$('.season-block').each(function(i, miniSeasonDiv){
				season.miniseasons[i] = {
					deadline: $('#' + i + '-deadline').val(),
					fixtures: []
				};
				$('.fixture-block', miniSeasonDiv).each(function(j, fixtureDiv){
					season.miniseasons[i].fixtures[j] = {
						team: $('#' + i + '-' + j + '-fixture-team').val(),
						venue: $('#' + i + '-' + j + '-fixture-venue').val(),
					}
				});
			});

			$.blockUI();

			$.ajax({
				type: 'post',
				url: '/saveFixtures',
				data: season,
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
							notifyBar('Fixtures saved.', 'success');
						}
					}
				},
				error: function(jqXHR, status, error){
					$.unblockUI();
					notifyBar('Cannot save results. There was an error.', 'error');
				}
			});
		});
	}

	$('#make-game-current-link').click(function(){

		var ok = true;
		var miniseasons = $('.season-block');
		for (var x=0; x<miniseasons.length; x++) {
			var miniseason = miniseasons[x];
			var deadlineField = $('.miniseason-deadline', miniseason);
			if (deadlineField.val().trim() == '') ok = false;
			var fixtures = $('.fixture-block', miniseason);
			if (fixtures.length == 0) ok = false;
		}

		if (!ok) {
			return notifyBar('Cannot make game active until every mini-season has a deadline and at least one fixture.', 'error');
		}

		if (!confirm('Game will become read-only once active, so only proceed if you\'re sure all the fixtures are right.')) return;

		$.blockUI();
		$.ajax({
			type: 'post',
			url: '/activateSeason',
			data: {
				id: seasonIdField.val()
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
						notifyBar('OK', 'success');
					}
				}
			},
			error: function(jqXHR, status, error){
				$.unblockUI();
				notifyBar('Cannot save results. There was an error.', 'error');
			}
		});

	});

	var gameChoiceDialog = $('#game-choice-dialog');

	var closeDialog = function() {
		gameChoiceDialog.dialog('close');
	}

	var redirectToSelectedGame = function() {
		var chosenGame = $('#game-choice-select').val();
		closeDialog();
		$.blockUI();
		window.location.href = $('#editSeasonUrl').val() + chosenGame;
	};

	gameChoiceDialog.dialog({
		autoOpen: false,
		modal: true,
		title: 'Chose game to edit ...',
		buttons: {
			OK: redirectToSelectedGame,
			Cancel: closeDialog
		}
	});

	$('#edit-other-game').click(function(){
		gameChoiceDialog.dialog('open');
	});

}