const Storage = function () {
  this.data = {};
};

Storage.prototype.setData = function (track, index, data) {
  if (!this.data[track]) this.data[track] = {};

  const t = this.data[track];
  t[index] = data;
};

Storage.prototype.getData = function (track, index) {
  const t = this.data[track];
  if (t[index]) return t[index];

  return [];
};

Storage.prototype.getAll = function () {
  return this.data;
};

Storage.prototype.setAll = function (data) {
  return (this.data = data);
};

Storage.prototype.getUndoData = function () {};

/*
point value = 0xffff -> special
0x01 loop to point index : 0x81 00 0002
0x02 next segment(s) is ladder, count/steps: 0x82 0001 07
0x03 controltrack - switch to loopid: 0x84 000001 => 6 bit* 4

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
Storage.prototype.export = function () {
  const segments_count = 0;
  const loops_count = 0;

  const adjust = this.data["adjust"]["A"];
  const tracks = ["onoff", "freq", "amp", "iw"];

  //determine used loops
  const used_loops = [[], [], [], []];
  for (let i = 0; i < adjust.length; i++) {
    if (adjust[i].tag) {
      const tagdata = adjust[i].tag.split("");
      for (let j = 0; j < 4; j++) {
        if (!used_loops[j].includes(tagdata[j])) used_loops[j].push(tagdata[j]);
      }
    }
  }

  //push segments
  const loops = [[], [], [], []];
  let segments = [];
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < used_loops[j].length; i++) {
      const trackdata = this.data[tracks[j]];
      const points = trackdata[used_loops[j][i]];

      loops[j][i] = segments.length;
      segments = segments.concat(points);

      //insert loop-to
      segments.push({ x: 0x01000000 + loops[j][i], y: 0xffff });
    }
  }

  function toHex(d, bytes) {
    return Number(Math.floor(d))
      .toString(16)
      .padStart(bytes * 2, "0");
  }

  let out = "";
  out += "//loops\n";
  for (let i = 0; i < loops[0].length; i++) {
    //point_time
    out += "0x" + toHex(loops[0][i], 2) + ", ";
    out += "0x" + toHex(loops[1][i], 2) + ", ";
    out += "0x" + toHex(loops[2][i], 2) + ", ";
    out += "0x" + toHex(loops[3][i], 2) + ", ";
  }
  out += "\n//time\n";
  for (let i = 0; i < segments.length; i++) {
    //point_time
    out += "0x" + toHex(segments[i].x, 4) + ", ";
  }
  out += "\n//value\n";
  for (let i = 0; i < segments.length; i++) {
    //point_value
    out += "0x" + toHex(segments[i].y, 2) + ", ";
  }
  return out;
};
