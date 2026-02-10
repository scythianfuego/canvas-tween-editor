class Storage {
  constructor() {
    this.data = {};
  }

  setData(track, index, data) {
    if (!this.data[track]) this.data[track] = {};

    const t = this.data[track];
    t[index] = data;
  }

  getData(track, index) {
    const t = this.data[track];
    if (t && t[index]) return t[index];

    return [];
  }

  getAll() {
    return this.data;
  }

  setAll(data) {
    this.data = data;
  }

  getUndoData() {}

  export(name, inputValues) {
    const adjust = this.data["adjust"]["A"];
    const trackNames = ["onoff", "freq", "amp", "iw"];

    const channelInputs = [
      { spd: inputValues.onf_spd || 0, diff: 0 },
      { spd: inputValues.frq_spd || 0, diff: inputValues.frq_chg || 0 },
      { spd: inputValues.amp_spd || 0, diff: inputValues.amp_chg || 0 },
      { spd: inputValues.iw_spd || 0, diff: inputValues.iw_chg || 0 },
      { spd: 0, diff: 0 },
    ];

    //determine used loops
    const used_loops = [[], [], [], []];
    for (let i = 0; i < adjust.length; i++) {
      if (adjust[i].tag) {
        const tagdata = adjust[i].tag.split("");
        for (let j = 0; j < 4; j++) {
          if (!used_loops[j].includes(tagdata[j]))
            used_loops[j].push(tagdata[j]);
        }
      }
    }

    //push segments per channel, record channel start indices
    const channelStart = [];
    const loops = [[], [], [], []];
    let segments = [];
    for (let j = 0; j < 4; j++) {
      for (let i = 0; i < used_loops[j].length; i++) {
        const trackdata = this.data[trackNames[j]];
        const points = trackdata[used_loops[j][i]];

        if (i === 0) channelStart.push(segments.length);
        loops[j][i] = segments.length;
        segments = segments.concat(points);

        //insert loop-to marker
        segments.push({ x: (loops[j][i] | 0x01000000) >>> 0, y: 0xffff });
      }
      if (used_loops[j].length === 0) channelStart.push(segments.length);
    }
    // adjust channel
    const adjustStart = segments.length;
    channelStart.push(adjustStart);
    segments = segments.concat(adjust);
    segments.push({ x: (adjustStart | 0x01000000) >>> 0, y: 0xffff });

    const segments_count = segments.length;
    const loop_count = used_loops[0].length;

    const toLE = (value) =>
      (value >>> 0)
        .toString(16)
        .padStart(8, "0")
        .match(/.{1,2}/g)
        .reduce((acc, curr) => acc + "0x" + curr + ", ", "");

    // compute total size
    const totalSize = 72 + loop_count * 16 + segments_count * 8;

    let out = "";
    out += "//" + (name || "TrackName") + "\n";
    out += toLE(totalSize) + "//" + totalSize + " bytes\n";
    out += toLE(segments_count) + "//segments_count = " + segments_count + "\n";
    out += toLE(loop_count) + "//loop_count = " + loop_count + "\n";

    // channel settings
    out += "//channel settings\n";
    const channelNames = ["onoff", "freq", "amp", "iw", "adjust"];
    for (let j = 0; j < 5; j++) {
      const spd = channelInputs[j].spd;
      const diff = channelInputs[j].diff;
      out += `${toLE(channelStart[j])}${toLE(spd)}${toLE(diff)}`;
      out += ` //segment index=${channelStart[j]}  min_spd=${spd}  min_diff=${diff}\n`;
    }

    // loops
    out += "//loops\n";
    for (let i = 0; i < loop_count; i++) {
      const [a, b, c, d] = [loops[0][i], loops[1][i], loops[2][i], loops[3][i]];
      out += `${toLE(a)}\n${toLE(b)}\n${toLE(c)}\n${toLE(d)}`;
      out += ` //loop ${i}: ${a}, ${b}, ${c}, ${d}\n`;
    }

    // time
    out += "//time\n";
    const channelSegEnd = [];
    for (let j = 0; j < 4; j++) {
      let count = 0;
      for (let i = 0; i < used_loops[j].length; i++) {
        count += this.data[trackNames[j]][used_loops[j][i]].length + 1;
      }
      channelSegEnd.push(channelStart[j] + count);
    }
    channelSegEnd.push(adjustStart + adjust.length + 1);

    for (let i = 0; i < segments_count; i++) {
      const x = segments[i].x; // time
      out += toLE(x);

      // determine which channel this segment belongs to
      let label = "";
      for (let c = 4; c >= 0; c--) {
        if (i >= channelStart[c] && i < channelSegEnd[c]) {
          const index = this.rjust(i, 5);
          if (segments[i].y === 0xffff) {
            const loopTarget = x & 0x00ffffff;
            label = ` //${index}: ^ ${loopTarget}`;
          } else {
            const seconds = Math.floor(x / 48000);
            const samples = (x % 48000).toString().padStart(5, "0");
            const name = this.rjust(channelNames[c], 6);
            label = ` //${index}: ${name} ${seconds}:${samples} s`;
          }
          break;
        }
      }
      out += label + "\n";
    }

    // value
    out += "//value\n";
    for (let i = 0; i < segments_count; i++) {
      const y = segments[i].y;
      out += toLE(y); // value

      let label = "";
      for (let c = 4; c >= 0; c--) {
        if (i >= channelStart[c] && i < channelSegEnd[c]) {
          const index = this.rjust(i, 5);
          if (y === 0xffff) {
            const loopTarget = segments[i].x & 0x00ffffff;
            label = ` //${index}: ^ ${loopTarget}`;
          } else {
            const name = this.rjust(channelNames[c], 6);
            label = ` //${index}: ${name} ${y}`;
          }
          break;
        }
      }
      out += label + "\n";
    }
    return out;
  }

  rjust(str, width) {
    str = String(str);
    while (str.length < width) str = " " + str;
    return str;
  }

  import(text) {
    // Remove all comments (// to end of line) and parse hex bytes
    const cleaned = text.replace(/\/\/[^\n]*/g, "");
    const hexValues = cleaned.match(/0x[0-9a-fA-F]+/g);
    if (!hexValues) return null;

    const bytes = hexValues.map((h) => parseInt(h, 16) & 0xff);
    const numbers = hexValues
      .map((h) => h.slice(2))
      .join("")
      .match(/.{1,8}/g)
      .map((i) =>
        parseInt(
          i
            .match(/.{1,2}/g)
            .reverse()
            .join(""),
          16,
        ),
      );

    let pos = 0;

    const u32 = (offset) => numbers[offset];
    const i32 = (offset) => numbers[offset] & 0xffffffff;

    const totalSize = u32(pos++);
    const segments_count = u32(pos++);
    const loop_count = u32(pos++);
    // channel settings
    const trackNames = ["onoff", "freq", "amp", "iw", "adjust"];
    const channels = [];
    for (let j = 0; j < 5; j++) {
      const startSeg = u32(pos++);
      const minSpd = i32(pos++);
      const minDiff = i32(pos++);
      channels.push({ startSeg, minSpd, minDiff });
    }

    // loops
    const loops = [];
    for (let i = 0; i < loop_count; i++) {
      const l = [];
      for (let j = 0; j < 4; j++) {
        l.push(u32(pos++));
      }
      loops.push(l);
    }

    // time values
    const times = [];
    for (let i = 0; i < segments_count; i++) {
      times.push(u32(pos++));
    }

    // point values
    const values = [];
    for (let i = 0; i < segments_count; i++) {
      values.push(u32(pos++));
    }

    // reconstruct segments
    const segments = [];
    for (let i = 0; i < segments_count; i++) {
      segments.push({ x: times[i], y: values[i] });
    }

    // split segments into per-channel point arrays, removing loop-to markers
    // determine channel boundaries
    const channelRanges = [];
    for (let j = 0; j < 5; j++) {
      const start = channels[j].startSeg;
      let end;
      if (j < 4) {
        end = channels[j + 1].startSeg;
      } else {
        end = segments_count;
      }
      channelRanges.push({ start, end });
    }

    // for the first 4 tracks, split by loop variants
    this.data = {};
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    for (let j = 0; j < 4; j++) {
      const trackName = trackNames[j];
      this.data[trackName] = {};

      // find all loop-to markers within this channel's range to split variants
      const range = channelRanges[j];
      const variantStarts = [];
      // first variant always starts at range.start
      variantStarts.push(range.start);
      for (let i = range.start; i < range.end; i++) {
        if (segments[i].y === 0xffff) {
          // this is a loop-to marker; next segment (if any within range) starts a new variant
          if (i + 1 < range.end) {
            variantStarts.push(i + 1);
          }
        }
      }

      for (let v = 0; v < variantStarts.length; v++) {
        const vStart = variantStarts[v];
        const points = [];
        for (let i = vStart; i < range.end; i++) {
          if (segments[i].y === 0xffff) break; // loop-to marker = end of variant
          points.push({ x: segments[i].x, y: segments[i].y });
        }
        this.data[trackName][alphabet[v]] = points;
      }
    }

    // adjust track (single variant "A")
    {
      const range = channelRanges[4];
      const points = [];
      for (let i = range.start; i < range.end; i++) {
        if (segments[i].y === 0xffff) break;
        points.push({ x: segments[i].x, y: segments[i].y });
      }

      // restore tags on adjust points from loop data
      // each loop entry maps to a tag combination
      if (loop_count > 0 && points.length > 0) {
        // build reverse map: for each track j, map segment_index -> variant letter
        const segToVariant = [{}, {}, {}, {}];
        for (let j = 0; j < 4; j++) {
          const range = channelRanges[j];
          const variantStarts = [range.start];
          for (let i = range.start; i < range.end; i++) {
            if (segments[i].y === 0xffff && i + 1 < range.end) {
              variantStarts.push(i + 1);
            }
          }
          for (let v = 0; v < variantStarts.length; v++) {
            segToVariant[j][variantStarts[v]] = alphabet[v];
          }
        }

        // build loop index -> tag string
        const loopTags = [];
        for (let i = 0; i < loop_count; i++) {
          let tag = "";
          for (let j = 0; j < 4; j++) {
            tag += segToVariant[j][loops[i][j]] || alphabet[0];
          }
          loopTags.push(tag);
        }

        // assign first tag to first point
        if (loopTags.length > 0) {
          points[0].tag = loopTags[0];
        }
      }

      this.data["adjust"] = { A: points };
    }

    // return input values so caller can restore UI fields
    return {
      onf_spd: channels[0].minSpd,
      frq_spd: channels[1].minSpd,
      frq_chg: channels[1].minDiff,
      amp_spd: channels[2].minSpd,
      amp_chg: channels[2].minDiff,
      iw_spd: channels[3].minSpd,
      iw_chg: channels[3].minDiff,
    };
  }
}
