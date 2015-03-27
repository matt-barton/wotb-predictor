$.blockUI.defaults.message = '<i class="fa fa-cog fa-spin fa-5x"></i>';
$.blockUI.defaults.css['border'] = 'none'; 
$.blockUI.defaults.css['padding'] = '15px'; 
$.blockUI.defaults.css['backgroundColor'] = '#000';
$.blockUI.defaults.css['webkit-border-radius'] = '10px'; 
$.blockUI.defaults.css['-moz-border-radius'] = '10px'; 
$.blockUI.defaults.css['opacity'] = '.5'; 
$.blockUI.defaults.css['color'] = '#fff'; 

$.datepicker.setDefaults({
	dateFormat: 'dd M yy',
	minDate: 0
});

function notifyBar(message, style, title) {
	title = title || 
		style == 'success' 
			? 'OK' 
			: style == 'error' 
				? 'Error' 
				: style == 'info' 
					? 'Info' 
					: style == 'warning' 
						? 'Warning' 
						: '';
	Stashy.Notify({
		title : title,
		content : message,
		titleSize : 4,
		style : style,
		contentType : "inline",
		animDuration : "fast",
		closeArea : "button",
		activeDuration: 2500
	}).bar("top");
}

function UpdateQueryString(key, value, url) {
    var re = new RegExp("([?&])" + key + "=.*?(&|#|$)(.*)", "gi"),
        hash;

    if (re.test(url)) {
        if (typeof value !== 'undefined' && value !== null)
            return url.replace(re, '$1' + key + "=" + value + '$2$3');
        else {
            hash = url.split('#');
            url = hash[0].replace(re, '$1$3').replace(/(&|\?)$/, '');
            if (typeof hash[1] !== 'undefined' && hash[1] !== null) 
                url += '#' + hash[1];
            return url;
        }
    }
    else {
        if (typeof value !== 'undefined' && value !== null) {
            var separator = url.indexOf('?') !== -1 ? '&' : '?';
            hash = url.split('#');
            url = hash[0] + separator + key + '=' + value;
            if (typeof hash[1] !== 'undefined' && hash[1] !== null) 
                url += '#' + hash[1];
            return url;
        }
        else
            return url;
    }
}