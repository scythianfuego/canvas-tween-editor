

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
    this.Draw();

    this.options.min = 0;
    this.options.max = 60 * 48000;

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


LineEditor.prototype.DrawGrid = function() {

    var ctx = this.GetContextFromCache('grid');
    ctx.strokeStyle = "#ccc";

    var stepCount = 32;
    var hstep = (this.width-1)/stepCount;
    for (var i = stepCount; i >= 0; i--) {
        var x = Math.floor(i*hstep);
        this.DrawLine(ctx, x, 0, x, this.height);
    };

    stepCount = 8;
    var vstep = (this.height-1)/stepCount;
    for (var i = 8; i >= 0; i--) {
        var y = Math.floor(i*vstep);
        if (i == 4)
            ctx.strokeStyle = "#0c0";
        this.DrawLine(ctx, 0, y, this.width, y);
        if (i == 4)
            ctx.strokeStyle = "#ccc";
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

    this.Echo(ctx, "100%", 0, 10);

    this.ctx.drawImage(ctx.canvas, 0, 0);

}



LineEditor.prototype.Draw = function() {
    this.DrawGrid();
    this.DrawData();
    this.DrawTickers();
}