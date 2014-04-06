$(document).ready(function() {

	var alphabet = [
	'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'
	]

	$('.fakelink').click(function(event) {
		$('.counter').text(alphabet[7]);
	});

	var window_height = $(window).height();
	var top_height = 2 * window_height / 3;
	var bottom_height = window_height / 3;
	var small_height = top_height / 7;
	var big_height = 2 * small_height

	var height = 100;
	var width = $('#onoff').width();
	var gridVSubdiv = 4;
	var options = { 
		height : big_height, 
		width : width,
		gridVSubdiv : gridVSubdiv
	};
	var onoffOptions = JSON.parse(JSON.stringify(options));
	onoffOptions.height = small_height;
	onoffOptions.gridVSubdiv = 2;

	new LineEditor($('#onoff').get(0), onoffOptions);
	new LineEditor($('#frequency').get(0), options);
	new LineEditor($('#amplitude').get(0), options);
	new LineEditor($('#iw').get(0), options);

	var mainOptions = { 
		height : bottom_height, 
		width : document.getElementById('gr9').offsetWidth,
		gridVSubdiv : 8
	}

	var el= document.getElementById('gr9');
	new LineEditor(el, mainOptions);
});