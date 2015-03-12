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
        $('.auto-image', $(this).parent()).remove();
        $(this).removeClass('warning-field');
        $('#registration').off('submit');
    });

    username.on('blur', function() {
        $.getJSON('/jsonCheckUserName', {
            username: username.val()
        }, function(result){
            var title = result.valid ? 'Username OK.' : 'Username is already in use.';
            var classname = result.valid ? 'fa-check success-icon' : 'fa-remove warning-icon';
            username
                .parent()
                .append('<i class="auto-image fa fa-large ' + classname + '" title="' + title + '" />');

            if (!result.valid) {
                username.addClass('warning-field');
                $('#registration').submit(preventSubmit);
            }
        });
    });

    $('.register-password').on('keyup', function() {
        $('.auto-feedback', $(this).parent()).remove();
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
        repeat
            .parent()
            .append('<i class="auto-feedback fa fa-large ' + classname + '" /> <span class="auto-feedback">'
                + message + '</span>');
    });

    if (username.val()) username.blur();
}