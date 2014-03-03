

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

    this.Draw();
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
    }
    return handler;
}

LineEditor.prototype.onmousedown = function() {
    var self = this;
    var handler = function(e) {
    }
    return handler;
}

LineEditor.prototype.onmouseup = function() {
    var self = this;
    var handler = function(e) {
    }
    return handler;
}

LineEditor.prototype.onclick = function() {
    var self = this;
    var handler = function(e) {
    }
    return handler;
}

LineEditor.prototype.ondblclick = function() {
    var self = this;
    var handler = function(e) {
        self.startTime = 0;
        self.endTime = 48000 * 10 * 1;
        self.Draw();
    }
    return handler;
}

//body
LineEditor.prototype.xToTimestamp = function(x) {
    var proportion = (x - this.options.marginLeft ) / this.options.gridWidth;
    var dt =  (this.endTime - this.startTime) * proportion;
    return Math.round(dt);
}

LineEditor.prototype.Zoom = function(e) {
    var self = this;

    var x = e.offsetX ? e.offsetX : e.layerX;
    var t = self.xToTimestamp(x);
    var delta = e.wheelDelta ? (-e.wheelDelta / 120) :  e.deltaY;
    var zoomfactor = delta;    //120 per click, -> 1

    var proportion = Math.abs(self.startTime - self.endTime) * 0.05; // %
    var proportion_y = t / Math.abs(self.startTime - self.endTime);
    zoomfactor *= proportion;

    self.endTime += zoomfactor * proportion_y;
    self.startTime -= zoomfactor * (1 - proportion_y);
    
    //self.animForceUpdate = 1;
    self.Draw();
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
    var minCellSizePx = this.options.gridHeight / vStepCount;     //square cell w=h
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

LineEditor.prototype.Echo = function(ctx, text, x, y) {
    ctx.font="12px Arial";
    ctx.fillText(text, x, y);
}


LineEditor.prototype.DrawData = function() {

    var ctx = this.GetContextFromCache('lines');
    ctx.strokeStyle = "#000";

    this.DrawAnchoredLine(ctx, 0, this.height, this.width/2, 25);

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