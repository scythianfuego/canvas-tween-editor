
//render
window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       || 
          window.webkitRequestAnimationFrame || 
          window.mozRequestAnimationFrame    || 
          window.oRequestAnimationFrame      || 
          window.msRequestAnimationFrame     || 
          function( callback ){
            window.setTimeout(callback, 1000 / 60);
          };
})();

window.cancelRequestAnimFrame = ( function() {
    return window.cancelAnimationFrame          ||
        window.webkitCancelRequestAnimationFrame    ||
        window.mozCancelRequestAnimationFrame       ||
        window.oCancelRequestAnimationFrame     ||
        window.msCancelRequestAnimationFrame        ||
        clearTimeout
})();

//line 

var Polyline = function(editor) {
    this.e = editor;
    this.points = [];
    this.highlighted = -1;
}

Polyline.prototype.Draw = function(ctx) {



    for (var i = this.points.length - 1; i > 0; i--) {
        var sx = this.e.timestampToX(this.points[i-1].x);
        var sy = this.e.valueToY(this.points[i-1].y);
        var ex = this.e.timestampToX(this.points[i].x);
        var ey = this.e.valueToY(this.points[i].y);

        if (this.highlighted == i)
            ctx.fillStyle = 'red';

        this.e.DrawAnchoredLine(ctx, sx, sy, ex, ey);
        ctx.fillStyle = '#000';
    };

    if (this.highlighted == 0)
        ctx.fillStyle = 'darkorange';

    this.e.DrawAnchor(ctx,
        this.e.timestampToX(this.points[0].x), 
        this.e.valueToY(this.points[0].y)
    );
} 

Polyline.prototype.push = function(point) {
    this.points.push(point);
} 

Polyline.prototype.highlight = function(x, y) {
    this.highlighted = this.findPointAt(x, y);
}

Polyline.prototype.findPointAt = function(x, y) {
    for (var i = this.points.length - 1; i >= 0; i--) {
        var px = this.e.timestampToX(this.points[i].x);
        var py = this.e.valueToY(this.points[i].y);
        var delta = 5;
        if (Math.abs(px - x) < delta && Math.abs(py - y))
            return i;
    }
    return -1;
}

Polyline.prototype.movePoint = function(i, x, y) {
    this.points[i].y = y;
    if (i != 0)
        this.points[i].x = x;
}

Polyline.prototype.deletePoint = function(i) {
    if (i > 0)
        this.points.splice(i, 1);
}

Polyline.prototype.addPoint = function(x, y) {
    var l = this.points.length - 1;
    if (x > this.points[l].x) {
        this.points.push({x : x, y : y});
    } else {
        for (var i = this.points.length - 1; i > 0; i--)
            if (this.points[i-1].x < x && this.points[i].x > x) {
                this.points.splice(i, 0, {x : x, y : y});
                return;
            }
    }
}



//mouse tools
var Mouse = function(element) {
    this.pressed = false;
    this.startTime = null;
    this.endTime = null;
    this.time = null;
    this.element = element;
    this.cursor = 'auto';
}

Mouse.prototype.set = function(obj2) {
    for (var attrname in obj2) { this[attrname] = obj2[attrname]; }
    if (obj2.cursor) {
        this.element.style.cursor = obj2.cursor;
    }
}


//editor
var LineEditor = function(element, data, options) {

    this.options = options;
    var canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 250;
    element.appendChild(canvas)
    this.ctx = canvas.getContext("2d");
    this.width = canvas.width;
    this.height = canvas.height;
    this.data = data;
    this.mouse = new Mouse(element);
    this.line = new Polyline(this);

    this.line.push({x: 0, y : 7000});
    this.line.push({x: 96000, y: 65535})

    this.options = {
        min : 0,
        max : 60 * 48000,
        marginTop : 5,
        marginBottom : 15,
        marginLeft : 40,
        marginRight : 10,
        fontSize : 12,
        gridVSubdiv : 8
    }

    this.options.gridHeight = this.height - this.options.marginTop - this.options.marginBottom;
    this.options.gridWidth = this.width - this.options.marginLeft - this.options.marginRight;

    this.startTime = 0;
    this.endTime = 48000 * 10 * 1;

    element.onmousemove = this.onmousemove();
    element.onmousedown = this.onmousedown();
    element.onmouseup = this.onmouseup();
    if ('onwheel' in document) {
        element.onwheel = this.onmousewheel();
    } else {
        element.onmousewheel = this.onmousewheel();
    }
    element.onclick = this.onclick();
    element.ondblclick = this.ondblclick(); 
    element.oncontextmenu = this.oncontextmenu();

    this.animLastFrameTimestamp = 0;
    this.animForceUpdate = 0;
    this.frameRequest = requestAnimFrame(this.updateAnimationFunc(this));
    this.Draw();
}

LineEditor.prototype.destroy = function() {
    cancelRequestAnimFrame(this.frameRequest);
}

LineEditor.prototype.updateAnimationFunc = function(self) {
    var result = function(timestamp) {
        //var delta = timestamp - self.animLastFrameTimestamp;
        if (self.animForceUpdate) {
            self.animLastFrameTimestamp = timestamp;
            self.animForceUpdate = 0;
            self.Draw();
        }
        self.frameRequest = requestAnimFrame(self.updateAnimationFunc(self));
    }
    return result;
}

//tools

LineEditor.prototype.formatTs = function(ts) {
    var pad = "00000";
    var str = Math.floor(ts%48000)+"";
    var samples = pad.substring(0, pad.length - str.length) + str;
    return Math.floor(ts/48000) + '.'+ samples + 's';
}

LineEditor.prototype.comment = function(str) {
    var el = document.getElementById('comment');
    el.innerHTML = str;
}

//handlers
LineEditor.prototype.onmousewheel = function() {
    var self = this;
    return function(e) {
        e.preventDefault();
        self.Zoom(e);
    }
}

LineEditor.prototype.onmousemove = function() {
    var self = this;
    var handler = function(e) {
        var x = e.offsetX ? e.offsetX : e.layerX;
        var y = e.offsetY ? e.offsetY : e.layerY;
        var ts = self.xToTimestamp(x);
        self.comment( self.formatTs(ts)  + '&emsp;' 
            + self.formatTs(self.startTime) + '&emsp;' 
            + self.formatTs(self.endTime) + '&emsp;' 
         );

        self.animForceUpdate = 1;
        self.mouse.set({ x : x, y : y});
        if (!self.mouse.pointDrag)
            self.line.highlight(x, y);

        if (self.mouse.pressed) {
            
            if (Math.abs(self.mouse.originalX - x) < 5 && !self.mouse.drag)
                return; //antijitter 5px;

            if (self.line.highlighted != -1) {  //point dragging
                var px = self.xToTimestamp(x);
                var py = self.yToValue(y);
                self.line.movePoint(self.line.highlighted, px, py);
                self.mouse.set({ 
                    pointDrag : true,
                    cursor : 'move',
                });
                return;
            }

            var t = self.xToTimestamp(x);
            var delta = self.mouse.time - t;
            self.startTime =  self.mouse.startTime + delta;
            self.endTime = self.mouse.endTime + delta;
            self.mouse.set({ 
                startTime : self.startTime,
                endTime : self.endTime,
                cursor : 'move',
                drag : true
            });
        }
    }
    return handler;
}

LineEditor.prototype.onmousedown = function() {
    var self = this;
    var handler = function(e) {
        e.preventDefault();
        var x = e.offsetX ? e.offsetX : e.layerX;
        var t = self.xToTimestamp(x);
        self.mouse.set({ 
            pressed : true,
            time : t,
            originalX : x,
            startTime : self.startTime,
            endTime : self.endTime
        });
    }

    return handler;
}

LineEditor.prototype.onmouseup = function() {
    var self = this;
    var handler = function(e) {
        self.mouse.set({ 
            pressed : false,
            cursor : 'auto'
        });
        event.preventDefault();
    }
    return handler;
}

LineEditor.prototype.onclick = function() {
    var self = this;
    var handler = function(e) {

        if (self.mouse.drag || self.mouse.pointDrag) {  //last event was drag
            self.mouse.set({ drag : false, pointDrag : false });
            return;
        }

        var x = e.offsetX ? e.offsetX : e.layerX;
        var y = e.offsetY ? e.offsetY : e.layerY;
        x = self.xToTimestamp(x);
        y = self.yToValue(y);

        self.line.addPoint(x, y);
        self.animForceUpdate = 1; 
    }
    return handler;
}

LineEditor.prototype.oncontextmenu = function() {
    var self = this;
    var handler = function(e) {
        e.preventDefault();
        if (self.line.highlighted) {
            self.line.deletePoint(self.line.highlighted);
            self.animForceUpdate = 1;
        }
    }
    return handler;
} 

LineEditor.prototype.ondblclick = function() {
    var self = this;
    var handler = function(e) {
        self.startTime = 0;
        self.endTime = 48000 * 10 * 1;
        self.animForceUpdate = 1; 
    }
    return handler;
}

//body
LineEditor.prototype.xToTimestamp = function(x) {
    var proportion = (x - this.options.marginLeft ) / this.options.gridWidth;
    var dt = (this.endTime - this.startTime) * proportion + this.startTime;
    return Math.round(dt);
}

LineEditor.prototype.timestampToX = function(timestamp) {
    var proportion = (timestamp - this.startTime) / (this.endTime - this.startTime);
    var positionX = this.options.gridWidth * proportion + this.options.marginLeft;
    return Math.round(positionX);
}

LineEditor.prototype.yToValue = function(y) {
    var proportion = (y - this.options.marginTop ) / this.options.gridHeight;
    var value = 0xffff * (1 - proportion);
    if (value > 0xffff) value = 0xffff;
    if (value < 0) value = 0;
    return value;
}

LineEditor.prototype.valueToY = function(value) {
    var proportion = (0xffff - value) / 0xffff;
    var y =  this.options.gridHeight * proportion + this.options.marginTop;
    return y;
}



LineEditor.prototype.Zoom = function(e) {
    var self = this;

    var x = e.offsetX ? e.offsetX : e.layerX;
    var t = self.xToTimestamp(x);
    var delta = e.wheelDelta ? (-e.wheelDelta / 120) :  e.deltaY;
    var zoomfactor = delta;    //120 per click, -> 1

    var proportion = Math.abs(self.startTime - self.endTime) * 0.05; // %
    var proportion_y = (t - self.startTime) / Math.abs(self.startTime - self.endTime);
    zoomfactor *= proportion;

    self.endTime += zoomfactor * (1 - proportion_y);
    self.startTime -= zoomfactor * proportion_y;
    
    self.animForceUpdate = 1; 
}    

LineEditor.prototype.GetContextFromCache = function(name) {
    this.canvasCache = {};
    var canvasTemp = document.createElement("canvas");
    canvasTemp.width = this.width;
    canvasTemp.height = this.height;
    var ctx = canvasTemp.getContext("2d");
    ctx.translate(0.5, 0.5);
    return ctx;
}



LineEditor.prototype.calcCellSize = function() {

    var self = this;
    var vStepCount = this.options.gridVSubdiv;
    var minCellSizePx = 2 * this.options.gridHeight / vStepCount;     //square cell w=h
    var hStepCount = Math.floor(this.options.gridWidth / minCellSizePx);
    var cellSizeSamples = (this.endTime - this.startTime) / hStepCount; 

    if (cellSizeSamples > 48000) {   // > 1s
        cellSizeSamples = Math.floor(cellSizeSamples / 48000) * 48000;
    } else {    //
        for (var i = 48000; i > 1; i = i / 2) {
            if (cellSizeSamples > i) {
                cellSizeSamples = i*2;
                break;
            }
        }
    }

    var samplesToPx = function(samples) {
        return (samples * self.options.gridWidth) / (self.endTime - self.startTime);
    }

    var cellSizePx = samplesToPx(cellSizeSamples);
    var firstCellNumber = Math.ceil(this.startTime / cellSizeSamples);
    var firstCellStart = firstCellNumber * cellSizeSamples;
    var firsetCellOffsetPX = samplesToPx(firstCellStart - this.startTime);

    return { 
        px : cellSizePx,
        samples : cellSizeSamples,
        offset : firsetCellOffsetPX,
        start : firstCellStart
    };
}


LineEditor.prototype.samplesToTick = function(samples) {
    if (samples < 0)
        return "";
    var seconds = Math.floor(samples / 48000);
    var minutes = Math.floor(seconds / 60);
    var samples = samples % 48000;
    var modseconds = (seconds % 60);
    if (modseconds < 10)
        modseconds = "0"+modseconds; 

    if (minutes)
        return minutes + ":" + modseconds + "s";
    
    if (samples)
        return seconds + "." + samples;

    return seconds + "s"
}

LineEditor.prototype.DrawGrid = function() {



    var ctx = this.GetContextFromCache('grid');
    ctx.strokeStyle = "#ccc";

    var cellSize = this.calcCellSize();

    var stepCount = 16;
    var width = this.options.gridWidth;
    var height = this.options.gridHeight;
    var hstep = width / stepCount;
    for (var i = stepCount; i >= 0; i--) {
        var x = Math.floor(i * cellSize.px + this.options.marginLeft + cellSize.offset);
        this.DrawLine(ctx, x, this.options.marginTop, x, height + this.options.marginTop);

        var text = this.samplesToTick(i*cellSize.samples + cellSize.start);
        var textWidth = ctx.measureText(text).width;

        var textY = height + this.options.fontSize + 5;
        //if (i % 2 == 0)
        this.Echo(ctx, text, x - textWidth/2, textY);
    };

    stepCount = this.options.gridVSubdiv;
    var vstep = height / stepCount;
    for (var i = 8; i >= 0; i--) {
        var y = Math.floor(i*vstep) + this.options.marginTop;
        if (i == 4)
            ctx.strokeStyle = "#0c0";
        this.DrawLine(ctx, this.options.marginLeft, y, width+this.options.marginLeft, y);
        if (i == 4)
            ctx.strokeStyle = "#ccc";

        if (i % 2 == 0)
            this.Echo(ctx, (100-i*(100/stepCount))+"%", 0, y + 4);

    };


    var x = Math.floor(this.mouse.x);
    ctx.strokeStyle = "darkorange";
    this.DrawLine(ctx, x, this.options.marginTop, x, this.options.gridHeight);


    this.ctx.drawImage(ctx.canvas, 0, 0);

}

LineEditor.prototype.DrawLine = function (ctx, sx, sy, ex, ey) {
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.closePath();
    ctx.stroke();
}

LineEditor.prototype.DrawAnchoredLine = function(ctx, sx, sy, ex, ey) {
    this.DrawLine(ctx, sx, sy, ex, ey);
    ctx.beginPath();
    ctx.arc(ex, ey, 3, 0, 2*Math.PI);
    ctx.fill();
}

LineEditor.prototype.DrawAnchor = function(ctx, x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2*Math.PI);
    ctx.fill();
}

LineEditor.prototype.Echo = function(ctx, text, x, y) {
    ctx.font="11px Arial";
    ctx.fillText(text, x, y);
}


LineEditor.prototype.DrawData = function() {

    var ctx = this.GetContextFromCache('lines');
    ctx.strokeStyle = "#000";
    this.line.Draw(ctx);
    this.ctx.drawImage(ctx.canvas, 0, 0);

}

LineEditor.prototype.DrawTickers = function() {

    var ctx = this.GetContextFromCache('tickers');
    ctx.strokeStyle = "#000";


    this.ctx.drawImage(ctx.canvas, 0, 0);

}



LineEditor.prototype.Draw = function() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.DrawGrid();
    this.DrawData();
    this.DrawTickers();

}