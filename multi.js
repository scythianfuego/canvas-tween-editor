$(document).ready(function() {

	var storage = new Storage();
	
	$('.left-right-counter').each(function(index, el) {
		var alphabet = [
			'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P',	//16
			'Q','R','S','T','U','V','W','X','Y','Z'
		];
		var leftArrow = $('<i class="fa fa-chevron-circle-left fakelink left-arrow"></i>');
		var rightArrow = $('<i class="fa fa-chevron-circle-right fakelink right-arrow"></i>');
		var input = $('<input class="left-right-counter-value" size="1" type="text">').val(alphabet[0]);
		$(this).append(leftArrow).append(input).append(rightArrow);
		rightArrow.click(function(event) {
			var index = alphabet.indexOf(input.val());
			if (index != -1 && index < alphabet.length - 1) {
				input.trigger('beforechange');
				input.val(alphabet[++index]);	
				input.trigger('change');
			}
		});
		leftArrow.click(function(event) {
			var index = alphabet.indexOf(input.val());
			if (index != -1 && index > 0) {
				input.trigger('beforechange');
				input.val(alphabet[--index]);				
				input.trigger('change');
			}
		});

	});




	var window_height = $(window).height();
	var top_height = 2 * window_height / 3;
	var bottom_height = window_height / 3;
	var small_height = top_height / 7;
	var big_height = 2 * small_height

	var height = 100;
	var width = $('#onoff').width();
	var gridVSubdiv = 8;
	var options = { 
		height : big_height, 
		width : width,
		gridVSubdiv : gridVSubdiv, 
	};
	var onoffOptions = JSON.parse(JSON.stringify(options));
	onoffOptions.height = small_height;
	onoffOptions.gridVSubdiv = 2;
	var adjustOptions = { 
		height : bottom_height, 
		width : $('#adjust').width(),
		gridVSubdiv : 8
	}

	var pointSelectedFromEditor = null;
	var pointSelectedIndex = -1;
	options.onPointSelection = function(point, pointIndex) {
		pointSelectedFromEditor = this;
		pointSelectedIndex = pointIndex;
		if (point) {
			var minutes = Math.floor(point.x / (48000 * 60)) 
			var seconds = Math.floor((point.x / 48000) % 60) 
			var samples = (point.x % 48000);
			
			var x = seconds + '.' + ("00000" + samples).slice(-5);
			if (minutes)
				x = minutes + ':' + ("00" + seconds).slice(-2) + '.' + ("00000" + samples).slice(-5);

			var y = Math.round(point.y);
			$('#point_time').val(x);
			$('#point_value').val(y);
		} else {
			$('#point_time').val('');
			$('#point_value').val('');
		}
	}

	var setPoint = function(event) {
		if (!pointSelectedFromEditor || pointSelectedIndex == -1)
			return;

		var time = $('#point_time').val();
		time = time.split('.');
		var samples = 0;
		var seconds = 0;
		var minutes = 0;
		if (time.length > 1) {
			samples = Number(time[1]);
			seconds = time[0].split(':');
			if (seconds.length > 1) {
				minutes = Number(seconds[0]);
				seconds = Number(seconds[1]);
			} else {
				seconds = Number(seconds[0]);
			}
		} else {
			samples = Number(time[0]);
		}
		time = samples + seconds * 48000 + minutes * 60 * 48000;

		var value = $('#point_value').val();
		var points = pointSelectedFromEditor.getPoints();
		points[pointSelectedIndex].x = time;
		points[pointSelectedIndex].y = value;
		pointSelectedFromEditor.setPoints(points);
	};

	$('#set').click(setPoint);
	$('#point_time').keyup(function(event) { if (event.keyCode == 13) setPoint(); });
	$('#point_value').keyup(function(event) { if (event.keyCode == 13) setPoint(); });


	var editors = {
		onoff : new LineEditor($('#onoff').get(0), onoffOptions),
		freq : new LineEditor($('#frequency').get(0), options),
		amp : new LineEditor($('#amplitude').get(0), options),
		iw : new LineEditor($('#iw').get(0), options),
		adjust : new LineEditor($('#adjust').get(0), adjustOptions)
	}
	LineEditor.link([editors.onoff, editors.freq, editors.amp, editors.iw]);
	editors.adjust.cleanTags('AAAA');

	var currentTag = function() {
		var retval =
			$('.left-right-counter[data-track=onoff] .left-right-counter-value').val() +
			$('.left-right-counter[data-track=freq] .left-right-counter-value').val() +
			$('.left-right-counter[data-track=amp] .left-right-counter-value').val() +
			$('.left-right-counter[data-track=iw] .left-right-counter-value').val();
		return retval;
	}

	$('.left-right-counter-value').on('beforechange', function(event) {
		var track = $(this).parent().attr('data-track');
		storage.setData(track, $(this).val(), editors[track].getPoints());
		editors.adjust.setTag(currentTag());
	});

	$('.left-right-counter-value').on('change', function(event) {
		var track = $(this).parent().attr('data-track');
		editors[track].setPoints(storage.getData(track, $(this).val()));
		editors.adjust.setTag(currentTag());
	});

	$('#apply_tags').click(function(event) {
		editors.adjust.setTag(currentTag());
		storage.setData('adjust', 'A', editors['adjust'].getPoints());
	});

	$('#clean_tags').click(function(event) {
		editors.adjust.cleanTags('AAAA');
	});

	$('#export').click(function(event) {

		//store all
		var tag = currentTag().split('');
		storage.setData('onoff', tag[0], editors['onoff'].getPoints());
		storage.setData('freq', tag[1], editors['freq'].getPoints());
		storage.setData('amp', tag[2], editors['amp'].getPoints());
		storage.setData('iw', tag[3], editors['iw'].getPoints());

		storage.setData('adjust', 'A', editors['adjust'].getPoints());	
		var text = storage.export();
	});


});