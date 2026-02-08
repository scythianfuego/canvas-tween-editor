//line
class TweenPolyline {
  constructor(editor) {
    this.e = editor;
    this.points = [];
    this.highlighted = [];
  }

  smartPoint(index) {
    const point = {};
    const pointIndex = index; //closure
    const self = this;
    point.x = (value) => {
      if (typeof value !== "undefined") {
        self.points[pointIndex].x = value;
        return point;
      } else {
        return self.points[pointIndex].x;
      }
    };

    point.y = (value) => {
      if (typeof value !== "undefined") {
        self.points[pointIndex].y = value;
        self.e.setUpdate();
        return point;
      } else {
        return self.points[pointIndex].y;
      }
    };

    point.formatY = (value) => {
      if (typeof value !== "undefined") {
        self.e.setUpdate();
        value = self.e.mapToValue(value);
        return point.y(value);
      } else {
        let y = point.y();
        y = self.e.valueToMap(y);
        return Math.round(y);
      }
    };
    point.formatX = (value) => {
      if (typeof value !== "undefined") {
        let time = value.split(".");
        let samples = 0;
        let seconds = 0;
        let minutes = 0;
        if (time.length > 1) {
          samples = Number(time[1]);
          seconds = time[0].split(":");
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
        return point.x(time);
      } else {
        const x = point.x();
        const minutes = Math.floor(x / (48000 * 60));
        const seconds = Math.floor((x / 48000) % 60);
        const samples = x % 48000;

        let xText = `${seconds}.${samples.toString().padStart(5, "0")}`;
        if (minutes) xText = `${minutes}:${xText}`;
        return xText;
      }
    };

    point.index = function () {
      return pointIndex;
    };
    return point;
  }

  Draw(ctx) {
    for (let i = this.points.length - 1; i > 0; i--) {
      const sx = this.e.timestampToX(this.points[i - 1].x);
      const sy = this.e.valueToY(this.points[i - 1].y);
      const ex = this.e.timestampToX(this.points[i].x);
      const ey = this.e.valueToY(this.points[i].y);

      if (this.highlighted.includes(i)) ctx.fillStyle = "red";

      this.e.DrawAnchoredLine(ctx, sx, sy, ex, ey);

      if (this.points[i].tag && this.points[i].tag.length) {
        this.e.DrawTag(ctx, ex, ey, this.points[i].tag);
      }
      ctx.fillStyle = "#000";
    }

    if (this.highlighted.includes(0))
      //first point
      ctx.fillStyle = "red";

    const zeroX = this.e.timestampToX(this.points[0].x);
    const zeroY = this.e.valueToY(this.points[0].y);
    this.e.DrawAnchor(ctx, zeroX, zeroY);

    if (this.points[0].tag && this.points[0].tag.length) {
      this.e.DrawTag(ctx, zeroX, zeroY, this.points[0].tag);
    }
    ctx.fillStyle = "#000";
  }

  push(point) {
    this.points.push(point);
  }

  findPointAt(x, y) {
    for (let i = this.points.length - 1; i >= 0; i--) {
      const px = this.e.timestampToX(this.points[i].x);
      const py = this.e.valueToY(this.points[i].y);
      const delta = 10;
      if (Math.abs(px - x) < delta && Math.abs(py - y) < delta) return i;
    }
    return -1;
  }

  beforeMove(i) {
    const selectionOffsets = [];
    const dy_arr = [];
    this.highlighted.sort(function (a, b) {
      return a - b;
    });
    for (const [j, k] of this.highlighted.entries()) {
      //point index
      const n = this.highlighted[0];
      const dx = this.points[k].x - this.points[n].x;
      const dy = this.points[k].y - this.points[n].y;
      selectionOffsets[j] = { dx: dx, dy: dy };
      dy_arr.push(dy);
    }
    this.selectionOffsets = selectionOffsets;
    const maxOffsetY = Math.max(...dy_arr);
    const minOffsetY = Math.min(...dy_arr);
    this.maxY = this.e.options.maxUnmapped - maxOffsetY;
    this.minY = -minOffsetY;
    this.maxOffset = selectionOffsets[selectionOffsets.length - 1].dx;
  }

  movePoints(i, x, y) {
    const index = this.highlighted.indexOf(i);
    x -= this.selectionOffsets[index].dx;
    y -= this.selectionOffsets[index].dy;

    //bounding box
    const first = this.highlighted[0];
    if (first != 0)
      if (x < this.points[first - 1].x) x = this.points[first - 1].x;

    const last = this.highlighted[this.highlighted.length - 1];
    if (this.points.length - 1 > last)
      if (x + this.maxOffset > this.points[last + 1].x)
        x = this.points[last + 1].x - this.maxOffset;

    if (y > this.maxY) y = this.maxY;

    if (y < this.minY) y = this.minY;

    //move
    for (const [j, k] of this.highlighted.entries()) {
      if (first == k) {
        this.points[k].y = y;
        if (k != 0) this.points[k].x = x;
      } else {
        this.points[k].y = this.points[first].y + this.selectionOffsets[j].dy;
        if (k != 0)
          this.points[k].x = this.points[first].x + this.selectionOffsets[j].dx;
      }
    }
  }

  deletePoint(i) {
    if (i > 0) this.points.splice(i, 1);
  }

  highlightPoint(i) {
    if (i >= 0) {
      if (!this.highlighted.includes(i)) this.highlighted.push(i);
    }
  }

  setTag(tag) {
    for (const k of this.highlighted) {
      this.points[k].tag = tag;
    }
  }

  cleanTags(firstTag) {
    if (!this.points[0].tag) this.points[0].tag = firstTag;

    for (let i = 1; i < this.points.length; i++) {
      if (this.points[i].tag && this.points[i].tag != firstTag) {
        firstTag = this.points[i].tag;
      } else {
        delete this.points[i].tag;
      }
    }
  }

  highlightRange(x1, x2) {
    if (x1 > x2) x1 = [x2, (x2 = x1)][0]; //swap

    for (let i = 0; i < this.points.length; i++)
      if (this.points[i].x < x2 && this.points[i].x > x1)
        this.highlighted.push(i);
  }

  clearHighlight() {
    this.highlighted = [];
  }

  addPoint(x, y) {
    const l = this.points.length - 1;
    if (x > this.points[l].x) {
      this.points.push({ x: x, y: y });
    } else {
      for (let i = this.points.length - 1; i > 0; i--)
        if (this.points[i - 1].x < x && this.points[i].x > x) {
          this.points.splice(i, 0, { x: x, y: y });
          return;
        }
    }
  }
}
