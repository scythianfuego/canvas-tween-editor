//line

TweenPolyline = function (editor) {
  this.e = editor;
  this.points = [];
  this.highlighted = [];
};

TweenPolyline.prototype.smartPoint = function (index) {
  var point = {};
  var pointIndex = index; //closure
  var self = this;
  point.x = function (value) {
    if (typeof value !== "undefined") {
      self.points[pointIndex].x = value;
      return point;
    } else {
      return self.points[pointIndex].x;
    }
  };

  point.y = function (value) {
    if (typeof value !== "undefined") {
      self.points[pointIndex].y = value;
      self.e.setUpdate();
      return point;
    } else {
      return self.points[pointIndex].y;
    }
  };

  point.formatY = function (value) {
    if (typeof value !== "undefined") {
      self.e.setUpdate();
      value = self.e.mapToValue(value);
      return point.y(value);
    } else {
      var y = point.y();
      y = self.e.valueToMap(y);
      return Math.round(y);
    }
  };
  point.formatX = function (value) {
    if (typeof value !== "undefined") {
      var time = value.split(".");
      var samples = 0;
      var seconds = 0;
      var minutes = 0;
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
      var x = point.x();
      var minutes = Math.floor(x / (48000 * 60));
      var seconds = Math.floor((x / 48000) % 60);
      var samples = x % 48000;

      var xText = seconds + "." + ("00000" + samples).slice(-5);
      if (minutes)
        xText =
          minutes +
          ":" +
          ("00" + seconds).slice(-2) +
          "." +
          ("00000" + samples).slice(-5);
      return xText;
    }
  };

  point.index = function () {
    return pointIndex;
  };
  return point;
};

TweenPolyline.prototype.Draw = function (ctx) {
  for (var i = this.points.length - 1; i > 0; i--) {
    var sx = this.e.timestampToX(this.points[i - 1].x);
    var sy = this.e.valueToY(this.points[i - 1].y);
    var ex = this.e.timestampToX(this.points[i].x);
    var ey = this.e.valueToY(this.points[i].y);

    if (this.highlighted.indexOf(i) != -1) ctx.fillStyle = "red";

    this.e.DrawAnchoredLine(ctx, sx, sy, ex, ey);

    if (this.points[i].tag && this.points[i].tag.length) {
      this.e.DrawTag(ctx, ex, ey, this.points[i].tag);
    }
    ctx.fillStyle = "#000";
  }

  if (this.highlighted.indexOf(0) != -1)
    //first point
    ctx.fillStyle = "red";

  var zeroX = this.e.timestampToX(this.points[0].x);
  var zeroY = this.e.valueToY(this.points[0].y);
  this.e.DrawAnchor(ctx, zeroX, zeroY);

  if (this.points[0].tag && this.points[0].tag.length) {
    this.e.DrawTag(ctx, zeroX, zeroY, this.points[0].tag);
  }
  ctx.fillStyle = "#000";
};

TweenPolyline.prototype.push = function (point) {
  this.points.push(point);
};

TweenPolyline.prototype.findPointAt = function (x, y) {
  for (var i = this.points.length - 1; i >= 0; i--) {
    var px = this.e.timestampToX(this.points[i].x);
    var py = this.e.valueToY(this.points[i].y);
    var delta = 10;
    if (Math.abs(px - x) < delta && Math.abs(py - y) < delta) return i;
  }
  return -1;
};

TweenPolyline.prototype.beforeMove = function (i) {
  var selectionOffsets = [];
  var dy_arr = [];
  this.highlighted.sort(function (a, b) {
    return a - b;
  });
  for (j in this.highlighted) {
    //point index
    var k = this.highlighted[j];
    var n = this.highlighted[0];
    var dx = this.points[k].x - this.points[n].x;
    var dy = this.points[k].y - this.points[n].y;
    selectionOffsets[j] = { dx: dx, dy: dy };
    dy_arr.push(dy);
  }
  this.selectionOffsets = selectionOffsets;
  var maxOffsetY = Math.max.apply(Math, dy_arr);
  var minOffsetY = Math.min.apply(Math, dy_arr);
  this.maxY = this.e.options.maxUnmapped - maxOffsetY;
  this.minY = -minOffsetY;
  this.maxOffset = selectionOffsets[selectionOffsets.length - 1].dx;
};

TweenPolyline.prototype.movePoints = function (i, x, y) {
  var index = this.highlighted.indexOf(i);
  x -= this.selectionOffsets[index].dx;
  y -= this.selectionOffsets[index].dy;

  //bounding box
  var first = this.highlighted[0];
  if (first != 0)
    if (x < this.points[first - 1].x) x = this.points[first - 1].x;

  var last = this.highlighted[this.highlighted.length - 1];
  if (this.points.length - 1 > last)
    if (x + this.maxOffset > this.points[last + 1].x)
      x = this.points[last + 1].x - this.maxOffset;

  if (y > this.maxY) y = this.maxY;

  if (y < this.minY) y = this.minY;

  //move
  for (j in this.highlighted) {
    var k = this.highlighted[j]; //point index
    if (first == k) {
      this.points[k].y = y;
      if (k != 0) this.points[k].x = x;
    } else {
      this.points[k].y = this.points[first].y + this.selectionOffsets[j].dy;
      if (k != 0)
        this.points[k].x = this.points[first].x + this.selectionOffsets[j].dx;
    }
  }
};

TweenPolyline.prototype.deletePoint = function (i) {
  if (i > 0) this.points.splice(i, 1);
};

TweenPolyline.prototype.highlightPoint = function (i) {
  if (i >= 0) {
    if (this.highlighted.indexOf(i) == -1) this.highlighted.push(i);
  }
};

TweenPolyline.prototype.setTag = function (tag) {
  for (j in this.highlighted) {
    //point index
    var k = this.highlighted[j];
    this.points[k].tag = tag;
  }
  //this.cleanTags('AAAA');
};

TweenPolyline.prototype.cleanTags = function (firstTag) {
  if (!this.points[0].tag) this.points[0].tag = firstTag;

  for (var i = 1; i < this.points.length; i++) {
    if (this.points[i].tag && this.points[i].tag != firstTag) {
      firstTag = this.points[i].tag;
    } else {
      delete this.points[i].tag;
    }
  }
};

TweenPolyline.prototype.highlightRange = function (x1, x2) {
  if (x1 > x2) x1 = [x2, (x2 = x1)][0]; //swap

  for (var i = 0; i < this.points.length; i++)
    if (this.points[i].x < x2 && this.points[i].x > x1)
      this.highlighted.push(i);
};

TweenPolyline.prototype.clearHighlight = function (i) {
  this.highlighted = [];
};

TweenPolyline.prototype.addPoint = function (x, y) {
  var l = this.points.length - 1;
  if (x > this.points[l].x) {
    this.points.push({ x: x, y: y });
  } else {
    for (var i = this.points.length - 1; i > 0; i--)
      if (this.points[i - 1].x < x && this.points[i].x > x) {
        this.points.splice(i, 0, { x: x, y: y });
        return;
      }
  }
};
