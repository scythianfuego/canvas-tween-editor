$(document).ready(function() {

	var storage = new Storage();
	
	$('.left-right-counter').each(function(index, el) {
		var alphabet = [
			'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'
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
		gridVSubdiv : gridVSubdiv
	};
	var onoffOptions = JSON.parse(JSON.stringify(options));
	onoffOptions.height = small_height;
	onoffOptions.gridVSubdiv = 2;
	var adjustOptions = { 
		height : bottom_height, 
		width : $('#adjust').width(),
		gridVSubdiv : 8
	}


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
});