var Storage = function() {
	this.data = {};
}

Storage.prototype.setData = function(track, index, data) {
	if (!this.data[track])
		this.data[track] = {};

	var track = this.data[track];
	track[index] = data;
}

Storage.prototype.getData = function(track, index) {
	var track = this.data[track];
	if (track[index])
		return track[index];

	return [];
}

Storage.prototype.getUndoData = function() {

}


/*
0x01 loop to point index : 0x01 00 0002
0x02 next segment(s) is ladder, count/steps: 0x02 0001 07
0x03 controltrack - switch to loopid: 0x04 000001 => 6 bit* 4

struct trackDataEx {
	uint16_t segments_count 	//max 65535
	uint8_t loop_count		//max = 64 * 4

	struct tracks {
		uint16_t startseg	//segment index
		uint32_t maxspd
		uint32_t maxdiff
	}[6]

	struct loops {
		uint16_t track1_segment		//segment index to switch to
		uint16_t track2_segment		//segment index
		uint16_t track3_segment		//segment index
		uint16_t track4_segment		//segment index
	}[loop_count]

	uint32_t[segments_count] point_time;
	uint16_t[segments_count] point_value;
}
*/
Storage.prototype.export = function() {
	var segments_count = 0;
	var loops_count = 0;

	var adjust = this.data['adjust']['A'];
	var tracks = [ 'onoff', 'freq', 'amp', 'iw'];

	//determine used loops
	var used_loops = [[],[],[],[]];
	for (var i = 0; i < adjust.length; i++) {
		if (adjust[i].tag) {
			tagdata = adjust[i].tag.split('');
			for (var j = 0; j < 4; j++) {
				if (used_loops[j].indexOf(tagdata[j]) == -1)
					used_loops[j].push(tagdata[j]);
			};
		}
	};

	//push segments
	var loops = [[],[],[],[]];
	var segments = [];
	for (var j = 0; j < 4; j++) {
		for (var i = 0; i < used_loops[j].length; i++) {
			var trackdata = this.data[tracks[j]];
			var points = trackdata[used_loops[j][i]];

			loops[j][i] = segments.length;
			segments = segments.concat(points);

			//insert loop-to
			segments.push({x : (0x01000000 + loops[j][i]), y : 0xffff })
		}
	}

	function toHex(d, bytes) {
		var hex = Number(Math.floor(d)).toString(16);
		var pad = "00000000";
		pad = pad.slice(0, bytes*2);
		hex = pad.substr(0, bytes*2 - hex.length) + hex; 
		return hex;
	}

	var out = '';
	out += '//loops\n';
	for (var i = 0; i < loops[0].length; i++) {	//point_time
		out += '0x' + toHex(loops[0][i], 2) + ', ';
		out += '0x' + toHex(loops[1][i], 2) + ', ';
		out += '0x' + toHex(loops[2][i], 2) + ', ';
		out += '0x' + toHex(loops[3][i], 2) + ', ';
	}
	out += '\n//time\n';
	for (var i = 0; i < segments.length; i++) {	//point_time
		out += '0x' + toHex(segments[i].x, 4) + ', ';
	}
	out += '\n//value\n';
	for (var i = 0; i < segments.length; i++) {	//point_value
		out += '0x' + toHex(segments[i].y, 2) + ', ';
	}
	return out;
}