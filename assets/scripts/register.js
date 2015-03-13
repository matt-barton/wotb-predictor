function registerInit() {
    if (!cookieCheck()) {
        $('#cookie-notice').show();
        $('form').remove();
        $('div.notice').remove();
        return;
    }
    var username = $('#register-username');
    var password = $('#register-password');
    var repeat   = $('#register-repeat');

    var preventSubmit = function(evt) {
        return evt.preventDefault();
    }

    username.on('keydown', function() {
        $('.username-feedback').remove();
        $(this).removeClass('warning-field');
        $('#registration').off('submit');
    });

    username.on('blur', function() {
        $.getJSON('/jsonCheckUserName', {
            username: username.val()
        }, function(result){
            var errorArea = $('.error-area', username.parent().parent());
            var message = result.valid ? '' : 'Username is already in use.';
            var classname = result.valid ? 'fa-check success-icon' : 'fa-remove warning-icon';
            username
                .parent()
                .append('<i class="username-feedback fa fa-large ' + classname + '" />');
            errorArea.append('<span class="username-feedback">' + message + '</span>');

            if (!result.valid) {
                username.addClass('warning-field');
                $('#registration').submit(preventSubmit);
            }
        });
    });

    $('.register-password').on('keyup', function() {
        var errorArea = $('.error-area', repeat.parent().parent());
        $('.auto-feedback').remove();
        if (password.val() == '' || repeat.val() == '') return;
        var classname, message;
        if (password.val() == repeat.val()) {
            repeat.removeClass('warning-field');
            classname = 'fa-check success-icon';
            message = '';
            $('#registration').off('submit');
        }
        else {
            repeat.addClass('warning-field');
            classname = 'fa-remove warning-icon';
            message = 'Passwords don\'t match';
            $('#registration').submit(preventSubmit);
        }
        errorArea.append('<span class="auto-feedback">' + message + '</span>');
        repeat
            .parent()
            .append('<i class="auto-feedback fa fa-large ' + classname + '" />');
    });

    if (username.val()) username.blur();

    var serverError = $('#server-error');
    if (serverError.text().trim() != '') {
        serverError.show();
    }
}