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


$(window).load(function() {

	var window_height = $(window).height();
	var top_height = 2 * window_height / 3;
	var bottom_height = window_height / 3;
	var small_height = top_height / 7;
	var big_height = 2 * small_height

	var height = 100;
	var width = $('#onoff').width();
	var adjust_width = $('#adjust').width();

	var pointSelected = null;
	var onPointSelection = function(point) {
		if (point) {
			pointSelected = point;
			$('#point_time').val(point.formatX());
			$('#point_value').val(point.formatY());
		} else {
			$('#point_time').val('');
			$('#point_value').val('');
		}
	}

	var setPoint = function(event) {
		if (!pointSelected)
			return;

		var time = $('#point_time').val();
		var value = $('#point_value').val();
		pointSelected.formatX(time).formatY(value);
	};

	$('#set').click(setPoint);
	$('#point_time').keyup(function(event) { if (event.keyCode == 13) setPoint(); });
	$('#point_value').keyup(function(event) { if (event.keyCode == 13) setPoint(); });



	var editors = {
		onoff : new TweenEditor($('#onoff').get(0), 
			{ onPointSelection : onPointSelection, height : small_height, width : width, gridVSubdiv : 2, min : 0, max : 1, units : '' }),
		freq : new TweenEditor($('#frequency').get(0), 
			{ onPointSelection : onPointSelection, height : big_height, width : width, gridVSubdiv : 8, min : 1, max : 500, units : 'Hz' }),
		amp : new TweenEditor($('#amplitude').get(0), 
			{ onPointSelection : onPointSelection, height : big_height, width : width, gridVSubdiv : 8, min : 0, max : 100 }),
		iw : new TweenEditor($('#iw').get(0), 
			{ onPointSelection : onPointSelection, height : big_height, width : width, gridVSubdiv : 8, min : 1, max : 80, units : '' }),
		adjust : new TweenEditor($('#adjust').get(0), 
			{ onPointSelection : onPointSelection, height : bottom_height, width : adjust_width, gridVSubdiv : 8 })
	}
	TweenEditor.link([editors.onoff, editors.freq, editors.amp, editors.iw]);
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

});