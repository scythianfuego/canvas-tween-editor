class MouseInfo {
  constructor(element) {
    //mouse tools
    this.pressed = false;
    this.startTime = null;
    this.endTime = null;
    this.drag = false;
    this.pointDrag = false;
    this.time = null;
    this.element = element;
    this.cursor = "auto";
    this.foundPoint = -1;

    this.set = (obj2) => {
      for (const attrname of Object.keys(obj2)) {
        this[attrname] = obj2[attrname];
      }
      if (obj2.cursor) {
        this.element.style.cursor = obj2.cursor;
      }
    };
  }
}

class TweenEditor {
  constructor(element, options) {
    const defaults = {
      width: 800,
      height: 250,
      startTime: 0,
      endTime: 10 * 48000,
      marginTop: 5,
      marginBottom: 15,
      marginLeft: 40,
      marginRight: 10,
      fontSize: 12,
      gridVSubdiv: 8,
      font: "11px Arial",
      maxUnmapped: 4096,
      max: 100,
      min: 1,
      units: "%",
    };

    //overwrite options
    this.options = { ...defaults, ...options };

    const canvas = document.createElement("canvas");
    canvas.width = this.options.width;
    canvas.height = this.options.height;
    element.appendChild(canvas);
    this.element = element;
    this.ctx = canvas.getContext("2d");
    this.width = canvas.width;
    this.height = canvas.height;
    this.mouse = new MouseInfo(element);
    this.line = new TweenPolyline(this);

    this.onPointSelection = this.options.onPointSelection;

    this.siblings = [];

    this.line.push({ x: 0, y: this.options.maxUnmapped / 2 });

    //performance test
    // for (let i = 0; i < 10000; i++) {
    //   this.line.push({ x: i * 2000, y: (i % 2) * 400 });
    // }

    this.options.gridHeight =
      this.height - this.options.marginTop - this.options.marginBottom;
    this.options.gridWidth =
      this.width - this.options.marginLeft - this.options.marginRight;

    this.startTime = this.options.startTime;
    this.endTime = this.options.endTime;

    this.onmousemovehandler = this.onmousemove();
    this.onmousedownhandler = this.onmousedown();
    this.onmouseuphandler = this.onmouseup();
    document.body.addEventListener("mousemove", this.onmousemovehandler);
    document.body.addEventListener("mousedown", this.onmousedownhandler);
    document.body.addEventListener("mouseup", this.onmouseuphandler);

    element.oncontextmenu = this.oncontextmenu();
    this.dblclick = this.ondblclick();
    element.onwheel = this.onmousewheel();

    this.animLastFrameTimestamp = 0;
    this.animForceUpdate = 0;
    this.frameRequest = window.requestAnimationFrame(
      this.updateAnimationFunc(this),
    );
    this.Draw();
  }

  static link(siblings) {
    for (let i = siblings.length - 1; i >= 0; i--) {
      siblings[i].listenToEvent("subscribe", siblings);
    }
  }

  emitEvent(eventName, event) {
    for (let i = this.siblings.length - 1; i >= 0; i--) {
      this.siblings[i].listenToEvent(eventName, event);
    }
  }

  listenToEvent(eventName, event) {
    switch (eventName) {
      case "subscribe":
        const me = event.indexOf(this);
        if (me != -1) {
          this.siblings = event.slice(0); //clone
          this.siblings.splice(me, 1); //remove self
        }
        break;

      case "mouse":
        this.mouse.set(event);
        this.animForceUpdate = 1;
        break;

      case "time":
        this.startTime = event.startTime;
        this.endTime = event.endTime;
        this.animForceUpdate = 1;
        break;
    }
  }

  getPoints() {
    return this.line.points;
  }

  setPoints(points) {
    if (points && points.length > 0) {
      this.line.points = points.map((p) => ({
        x: p.x,
        y: p.y,
      }));
    } else {
      this.line.points = [];
      this.line.push({ x: 0, y: this.options.maxUnmapped / 2 });
    }

    this.animForceUpdate = 1;
  }

  destroy() {
    window.cancelAnimationFrame(this.frameRequest);
    document.body.removeEventListener("mousemove", this.onmousemovehandler);
    document.body.removeEventListener("mousedown", this.onmousedownhandler);
    document.body.removeEventListener("mouseup", this.onmouseuphandler);
  }

  updateAnimationFunc(self) {
    const result = (timestamp) => {
      if (self.animForceUpdate) {
        self.animLastFrameTimestamp = timestamp;
        self.animForceUpdate = 0;
        self.Draw();
      }
      window.cancelAnimationFrame(self.frameRequest);
      self.frameRequest = window.requestAnimationFrame(
        self.updateAnimationFunc(self),
      );
    };
    return result;
  }

  //tools

  formatTs(ts) {
    const samples = Math.floor(ts % 48000)
      .toString()
      .padStart(5, "0");
    return Math.floor(ts / 48000) + "." + samples + "s";
  }

  comment(str) {
    const el = document.getElementById("comment");
    el.innerHTML = str;
  }

  //handlers
  /*
  click at point = select one
  drag at selected point =  drag
  left mouse drag = select
  click = deselect
  click = add point
  click = split

  right click at point = delete
  right drag = bg-drag

  wheel = zoom

  left click:
  check if drag
  check if point is under and points selected
  */

  onmousewheel() {
    const self = this;
    return (event) => {
      event.preventDefault();
      self.Zoom(event);
    };
  }

  onmousemove() {
    return (event) => {
      if (event.target != this.element.getElementsByTagName("canvas")[0])
        return;

      this.animForceUpdate = 1;
      const x = event.offsetX;
      const y = event.offsetY;
      const ts = this.xToTimestamp(x);
      this.comment(
        this.formatTs(ts) +
          "&emsp;" +
          this.formatTs(this.startTime) +
          "&emsp;" +
          this.formatTs(this.endTime) +
          "&emsp;",
      );
      const mouse = { x: x, y: y };
      this.mouse.set(mouse);
      this.emitEvent("mouse", mouse);

      const foundPoint = this.line.findPointAt(x, y);
      if (!this.mouse.pressed) {
        this.mouse.set({ foundPoint: foundPoint });
        if (foundPoint != -1) this.mouse.set({ cursor: "pointer" });
        else this.mouse.set({ cursor: "auto" });
      }

      //drag detection: antijitter 5px;
      if (
        (Math.abs(this.mouse.originalX - x) > 5 ||
          Math.abs(this.mouse.originalY - y) > 5) &&
        !this.mouse.drag &&
        !this.mouse.pointDrag &&
        this.mouse.pressed
      ) {
        if (this.mouse.foundPoint == -1) {
          this.mouse.drag = true;
        } else {
          this.mouse.pointDrag = true;
          this.mouse.pointDragAnchor = this.mouse.foundPoint;
          this.line.highlightPoint(this.mouse.foundPoint);
          this.line.beforeMove(this.mouse.pointDragAnchor);
        }
      }

      if (!this.mouse.drag && !this.mouse.pointDrag) return; //all the other actions are made in onclick

      if (this.mouse.button == 0 && this.mouse.pressed) {
        //left

        if (this.mouse.pointDrag) {
          //point dragging
          const px = this.xToTimestamp(x);
          const py = this.yToValue(y);
          this.line.movePoints(this.mouse.pointDragAnchor, px, py);

          if (this.line.highlighted.length == 1 && this.onPointSelection) {
            this.onPointSelection(
              this.line.smartPoint(this.line.highlighted[0]),
            );
          }

          return;
        }

        //range selection
        const x1 = this.mouse.time;
        const x2 = ts;
        this.line.clearHighlight();
        this.line.highlightRange(x1, x2);

        if (this.onPointSelection) {
          this.onPointSelection(null);
        }
      }

      if (this.mouse.button == 2 && this.mouse.pressed) {
        //right

        const t = this.xToTimestamp(x);
        const delta = this.mouse.time - t;
        this.startTime = this.mouse.startTime + delta;
        this.endTime = this.mouse.endTime + delta;
        const rightMouse = {
          startTime: this.startTime,
          endTime: this.endTime,
          cursor: "move",
          drag: true,
        };
        this.mouse.set(rightMouse);
        this.emitEvent("time", {
          startTime: this.startTime,
          endTime: this.endTime,
        });
      }
    };
  }

  onmousedown() {
    const self = this;
    const handler = (event) => {
      if (event.target != self.element.getElementsByTagName("canvas")[0])
        return;

      self.animForceUpdate = 1;
      event.preventDefault();
      const x = event.offsetX;
      const y = event.offsetY;
      const t = self.xToTimestamp(x);

      const foundPoint = self.line.findPointAt(x, y);
      setTimeout(
        () => self.mouse.set({ cursor: foundPoint != -1 ? "move" : "text" }),
        10,
      );

      if (foundPoint != -1 && !self.line.highlighted.includes(foundPoint))
        self.line.clearHighlight(); //clear previous selection

      const mouse = {
        pressed: true,
        time: t,
        originalX: x,
        originalY: y,
        startTime: self.startTime,
        endTime: self.endTime,
        button: event.button,
      };
      self.mouse.set(mouse);
    };

    return handler;
  }

  onmouseup() {
    const self = this;
    const handler = (event) => {
      const x = event.offsetX;
      self.mouse.set({
        pressed: false,
        cursor: "auto",
      });

      if (self.mouse.drag || self.mouse.pointDrag) {
        self.mouse.set({ drag: false, pointDrag: false }); //reset drag event
      }

      if (Math.abs(self.mouse.originalX - x) < 3) {
        //click
        if (self.mouse.button == 0) self.onleftclick(event);
        if (self.mouse.button == 2) self.onrightclick(event);
      }
    };
    return handler;
  }

  onleftclick(event) {
    const self = this;
    self.animForceUpdate = 1;

    //handle click
    let x = event.offsetX;
    let y = event.offsetY;

    //find point at xy
    const point = self.line.findPointAt(x, y);
    if (self.onPointSelection) {
      point == -1
        ? self.onPointSelection(null)
        : self.onPointSelection(self.line.smartPoint(point));
    }

    if (point != -1) {
      //select point
      self.line.clearHighlight();
      self.line.highlightPoint(point);
    } else {
      if (event.button == 0) {
        //left

        if (self.line.highlighted.length > 0) {
          //deselect
          self.line.clearHighlight();
          return;
        }

        x = self.xToTimestamp(x);
        y = self.yToValue(y);
        self.line.addPoint(x, y);
      }
    }
  }

  onrightclick(event) {
    const self = this;
    event.preventDefault();
    const x = event.offsetX;
    const y = event.offsetY;
    const point = self.line.findPointAt(x, y);
    if (point != -1) {
      //select point
      self.line.deletePoint(point);
      this.mouse.foundPoint = -1;
      self.animForceUpdate = 1;
    } else {
      // reset zoom
      self.dblclick();
    }
  }

  oncontextmenu() {
    return (event) => event.preventDefault();
  }

  ondblclick() {
    const self = this;
    let timeout = 0;
    let clicked = false;
    return () => {
      if (clicked) {
        clearTimeout(timeout);
        clicked = false;
        self.endTime =
          self.line.points.length > 1
            ? self.line.points[self.line.points.length - 1].x
            : 48000 * 10 * 1;

        self.startTime = 0;
        self.animForceUpdate = 1;
        self.emitEvent("time", {
          startTime: self.startTime,
          endTime: self.endTime,
        });
      } else {
        clicked = true;
        timeout = setTimeout(() => (clicked = false), 300);
      }
    };
  }

  //body
  xToTimestamp(x) {
    const proportion = (x - this.options.marginLeft) / this.options.gridWidth;
    const dt = (this.endTime - this.startTime) * proportion + this.startTime;
    return Math.round(dt);
  }

  timestampToX(timestamp) {
    const proportion =
      (timestamp - this.startTime) / (this.endTime - this.startTime);
    const positionX =
      this.options.gridWidth * proportion + this.options.marginLeft;
    return Math.round(positionX);
  }

  yToValue(y) {
    const proportion = (y - this.options.marginTop) / this.options.gridHeight;
    let value = this.options.maxUnmapped * (1 - proportion);
    if (value > this.options.maxUnmapped) value = this.options.maxUnmapped;
    if (value < 0) value = 0;
    return value;
  }

  valueToY(value) {
    const proportion =
      (this.options.maxUnmapped - value) / this.options.maxUnmapped;
    const y = this.options.gridHeight * proportion + this.options.marginTop;
    return y;
  }

  map(x, in_min, in_max, out_min, out_max) {
    //arduino
    return ((x - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min;
  }

  valueToMap(value) {
    return this.map(
      value,
      0,
      this.options.maxUnmapped,
      this.options.min,
      this.options.max,
    );
  }

  mapToValue(map) {
    return this.map(
      map,
      this.options.min,
      this.options.max,
      0,
      this.options.maxUnmapped,
    );
  }

  Zoom(event) {
    const self = this;

    const x = event.offsetX;
    const t = self.xToTimestamp(x);
    let zoomfactor = event.deltaY > 0 ? 1 : -1; // 5% per scroll event, ignore units
    const proportion = Math.abs(self.startTime - self.endTime) * 0.05; // %
    const proportion_y =
      (t - self.startTime) / Math.abs(self.startTime - self.endTime);
    zoomfactor *= proportion;
    self.endTime += zoomfactor * (1 - proportion_y);
    self.startTime -= zoomfactor * proportion_y;

    self.animForceUpdate = 1;

    self.emitEvent("time", {
      startTime: self.startTime,
      endTime: self.endTime,
    });
  }

  static canvasCache = {};

  GetContextFromCache(name) {
    if (!TweenEditor.canvasCache[name]) {
      const canvas = new OffscreenCanvas(this.width, this.height);
      TweenEditor.canvasCache[name] = canvas;
    }
    const canvasTemp = TweenEditor.canvasCache[name];
    canvasTemp.width = this.width;
    canvasTemp.height = this.height;
    const ctx = canvasTemp.getContext("2d");
    ctx.translate(0.5, 0.5);
    return ctx;
  }

  calcCellSize() {
    const vStepCount = this.options.gridVSubdiv;
    const minCellSizePx = (3 * this.options.gridHeight) / vStepCount; //square cell w=h
    const hStepCount = Math.floor(this.options.gridWidth / minCellSizePx);
    let cellSizeSamples = (this.endTime - this.startTime) / hStepCount;

    if (cellSizeSamples > 48000) {
      // > 1s
      cellSizeSamples = Math.floor(cellSizeSamples / 48000) * 48000;
    } else {
      //
      for (let i = 48000; i > 1; i = i / 2) {
        if (cellSizeSamples > i) {
          cellSizeSamples = i * 2;
          break;
        }
      }
    }

    const samplesToPx = (samples) =>
      (samples * this.options.gridWidth) / (this.endTime - this.startTime);
    const cellSizePx = samplesToPx(cellSizeSamples);
    const firstCellNumber = Math.ceil(this.startTime / cellSizeSamples);
    const firstCellStart = firstCellNumber * cellSizeSamples;
    const firsetCellOffsetPX = samplesToPx(firstCellStart - this.startTime);

    return {
      px: cellSizePx,
      samples: cellSizeSamples,
      offset: firsetCellOffsetPX,
      start: firstCellStart,
    };
  }

  samplesToTick(samples) {
    if (samples < 0) return "";

    samples = Math.floor(samples);
    const seconds = Math.floor(samples / 48000);
    const minutes = Math.floor(seconds / 60);
    samples = samples % 48000;
    const modseconds = (seconds % 60).toString().padStart(2, "0");

    if (minutes) return minutes + ":" + modseconds + "s";
    if (samples) return seconds + "." + samples;
    return seconds + "s";
  }

  DrawGrid() {
    const ctx = this.GetContextFromCache("grid");
    ctx.strokeStyle = "#ccc";

    const cellSize = this.calcCellSize();

    let stepCount = Math.ceil(
      (this.endTime - this.startTime) / cellSize.samples,
    );
    const width = this.options.gridWidth;
    const height = this.options.gridHeight;

    for (let i = stepCount; i >= 0; i--) {
      const x = Math.floor(
        i * cellSize.px + this.options.marginLeft + cellSize.offset,
      );
      this.DrawLine(
        ctx,
        x,
        this.options.marginTop,
        x,
        height + this.options.marginTop,
      );

      const text = this.samplesToTick(i * cellSize.samples + cellSize.start);
      const textWidth = ctx.measureText(text).width;

      const textY = height + this.options.fontSize + 5;
      //if (i % 2 == 0)
      this.Echo(ctx, text, x - textWidth / 2, textY);
    }

    stepCount = this.options.gridVSubdiv;
    const vstep = height / stepCount;
    for (let i = stepCount; i >= 0; i--) {
      const y = Math.floor(i * vstep) + this.options.marginTop;
      if (i == stepCount / 2) ctx.strokeStyle = "#0c0";
      this.DrawLine(
        ctx,
        this.options.marginLeft,
        y,
        width + this.options.marginLeft,
        y,
      );
      if (i == stepCount / 2) ctx.strokeStyle = "#ccc";

      const stepSize = (this.options.max - this.options.min) / stepCount;
      if (i % 2 == 0)
        this.Echo(
          ctx,
          Math.floor(this.options.max - i * stepSize) + this.options.units,
          0,
          y + 4,
        );
    }

    ctx.strokeStyle = "rgb(255, 140, 0)";
    ctx.fillStyle = "rgba(255, 165, 0, 0.2)";
    const cursorX = Math.floor(this.mouse.x);
    this.DrawLine(
      ctx,
      cursorX,
      this.options.marginTop,
      cursorX,
      this.options.gridHeight + this.options.marginTop,
    );
    if (this.mouse.drag && this.mouse.button == 0) {
      const x1 = this.timestampToX(this.mouse.time);
      this.DrawBox(
        ctx,
        x1,
        this.options.marginTop,
        cursorX,
        this.options.gridHeight + this.options.marginTop,
      );

      this.DrawLine(
        ctx,
        x1,
        this.options.marginTop,
        x1,
        this.options.gridHeight + this.options.marginTop,
      );
    }

    if (this.mouse.foundPoint != -1) {
      const hx = this.timestampToX(this.line.points[this.mouse.foundPoint].x);
      const hy = this.valueToY(this.line.points[this.mouse.foundPoint].y);
      this.DrawAnchorHighlight(ctx, hx, hy);
    }
    this.ctx.drawImage(ctx.canvas, 0, 0);
  }

  DrawBox(ctx, sx, sy, ex, ey) {
    ctx.beginPath();
    ctx.rect(sx, sy, ex - sx, ey - sy);
    ctx.fill();
  }

  DrawLine(ctx, sx, sy, ex, ey) {
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.closePath();
    ctx.stroke();
  }

  DrawAnchoredLine(ctx, sx, sy, ex, ey) {
    this.DrawLine(ctx, sx, sy, ex, ey);
    ctx.beginPath();
    ctx.arc(ex, ey, 3, 0, 2 * Math.PI);
    ctx.fill();
  }

  DrawAnchor(ctx, x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fill();
  }

  DrawAnchorHighlight(ctx, x, y) {
    ctx.fillStyle = "rgba(255, 165, 0, 0.6)";
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, 2 * Math.PI); //x,y,radius,angles
    ctx.fill();
  }

  Echo(ctx, text, x, y) {
    ctx.font = this.options.font;
    ctx.fillText(text, x, y);
  }

  DrawData() {
    const ctx = this.GetContextFromCache("lines");
    ctx.strokeStyle = "#000";
    this.line.Draw(ctx);
    this.ctx.drawImage(ctx.canvas, 0, 0);
  }

  DrawTickers() {
    const ctx = this.GetContextFromCache("tickers");
    ctx.strokeStyle = "#000";

    this.ctx.drawImage(ctx.canvas, 0, 0);
  }

  Draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.DrawGrid();
    this.DrawData();
    this.DrawTickers();
  }

  /* http://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-on-html-canvas */
  RoundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  }

  DrawTag(ctx, x, y, text) {
    const textW = ctx.measureText(text).width;
    const textH = ctx.measureText("M").width;
    const boxW = textW + textH;
    const boxH = textH * 1.5;
    const boxX = x - boxW / 2;
    let boxY = y - boxH - boxH / 2;
    if (boxY < 10) boxY = y + boxH + textH / 2;

    const textX = boxX + boxW / 2 - textW / 2;
    const textY = boxY + boxH / 2 + textH / 2;
    ctx.fillStyle = "#FFB356";
    this.RoundRect(ctx, boxX, boxY, boxW, boxH, 2);
    ctx.fillStyle = "#000";
    this.Echo(ctx, text, textX, textY);
  }

  setUpdate() {
    this.animForceUpdate = 1;
  }

  setTag(tag) {
    this.animForceUpdate = 1;
    return this.line.setTag(tag);
  }

  cleanTags(firstTag) {
    this.animForceUpdate = 1;
    return this.line.cleanTags(firstTag);
  }
}
