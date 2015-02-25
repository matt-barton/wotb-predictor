
$.datepicker.setDefaults({
	dateFormat: 'dd M yy',
	minDate: 0
});

$.notify.defaults({
	elementPosition:	'top left',
	globalPosition:		'top left',
	style:				'bootstrap',
	arrowSize:          10
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