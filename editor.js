
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
    this.highlighted = [];
}

Polyline.prototype.Draw = function(ctx) {

    for (var i = this.points.length - 1; i > 0; i--) {
        var sx = this.e.timestampToX(this.points[i-1].x);
        var sy = this.e.valueToY(this.points[i-1].y);
        var ex = this.e.timestampToX(this.points[i].x);
        var ey = this.e.valueToY(this.points[i].y);

        if (this.highlighted.indexOf(i) != -1)
            ctx.fillStyle = 'red';

        this.e.DrawAnchoredLine(ctx, sx, sy, ex, ey);

        if (this.points[i].tag && this.points[i].tag.length) {
            this.e.DrawTag(ctx, ex, ey, this.points[i].tag);
        }
        ctx.fillStyle = '#000';
    };

    if (this.highlighted.indexOf(0) != -1)  //first point
        ctx.fillStyle = 'red';

    var zeroX = this.e.timestampToX(this.points[0].x);
    var zeroY = this.e.valueToY(this.points[0].y)
    this.e.DrawAnchor(ctx, zeroX, zeroY);

    if (this.points[0].tag && this.points[0].tag.length) {
        this.e.DrawTag(ctx, zeroX, zeroY, this.points[0].tag);
    }
    ctx.fillStyle = '#000';
} 

Polyline.prototype.push = function(point) {
    this.points.push(point);
} 

Polyline.prototype.findPointAt = function(x, y) {
    for (var i = this.points.length - 1; i >= 0; i--) {
        var px = this.e.timestampToX(this.points[i].x);
        var py = this.e.valueToY(this.points[i].y);
        var delta = 10;
        if (Math.abs(px - x) < delta && Math.abs(py - y) < delta)
            return i;
    }
    return -1;
}

Polyline.prototype.beforeMove = function(i) {
    var selectionOffsets = [];
    var dy_arr = [];
    this.highlighted.sort(function(a,b) { return a - b; });
    for (j in this.highlighted) {   //point index
        var k = this.highlighted[j];
        var n = this.highlighted[0];
        var dx = this.points[k].x - this.points[n].x;
        var dy = this.points[k].y - this.points[n].y;
        selectionOffsets[j] =  { dx : dx, dy : dy }
        dy_arr.push(dy);
    }
    this.selectionOffsets = selectionOffsets;
    var maxOffsetY = Math.max.apply( Math, dy_arr );
    var minOffsetY = Math.min.apply( Math, dy_arr );
    this.maxY = 0xffff-maxOffsetY;
    this.minY = -minOffsetY;
    this.maxOffset = selectionOffsets[selectionOffsets.length-1].dx;
}


Polyline.prototype.movePoints = function(i, x, y) {

    var index = this.highlighted.indexOf(i);
    x -= this.selectionOffsets[index].dx;
    y -= this.selectionOffsets[index].dy;
 

    //bounding box
    var first = this.highlighted[0];
    if (first != 0)
        if (x < this.points[first-1].x)
            x = this.points[first-1].x;

    var last = this.highlighted[this.highlighted.length-1];
    if (this.points.length-1 > last)
        if (x + this.maxOffset > this.points[last+1].x)
            x = this.points[last+1].x - this.maxOffset;

    if (y > this.maxY)
        y = this.maxY;

    if (y < this.minY)
        y = this.minY;

    //move
    for (j in this.highlighted) {
        var k = this.highlighted[j];    //point index
        if (first == k) {
            this.points[k].y = y;
            if (k != 0)
                this.points[k].x = x;
        } else {
            this.points[k].y = this.points[first].y + this.selectionOffsets[j].dy;
            if (k != 0)
                this.points[k].x = this.points[first].x + this.selectionOffsets[j].dx;
        }
    }


}

Polyline.prototype.deletePoint = function(i) {
    if (i > 0)
        this.points.splice(i, 1);
}

Polyline.prototype.highlightPoint = function(i) {
    if (i >= 0) {
        if (this.highlighted.indexOf(i) == -1)
            this.highlighted.push(i);
    }
}

Polyline.prototype.setTag = function(tag) {
    for (j in this.highlighted) {   //point index
        var k = this.highlighted[j];
        this.points[k].tag = tag;
    }
    //this.cleanTags('AAAA');
}

Polyline.prototype.cleanTags = function(firstTag) {

    if (!this.points[0].tag)
        this.points[0].tag  = firstTag;

    for (var i = 1; i < this.points.length; i++) {
        if (this.points[i].tag && this.points[i].tag != firstTag) {
            firstTag = this.points[i].tag;
        } else {
            delete this.points[i].tag;
        }
    }
}

Polyline.prototype.highlightRange = function(x1, x2) {
    if (x1 > x2)
        x1 = [x2, x2 = x1][0];  //swap

    for (var i = 0; i < this.points.length ; i++)
        if (this.points[i].x < x2 && this.points[i].x > x1)
            this.highlighted.push(i);
}

Polyline.prototype.clearHighlight = function(i) {
    this.highlighted = [];
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
    this.drag = false;
    this.pointDrag = false;
    this.time = null;
    this.element = element;
    this.cursor = 'auto';
    this.foundPoint = -1;
}

Mouse.prototype.set = function(obj2) {
    for (var attrname in obj2) { this[attrname] = obj2[attrname]; }
    if (obj2.cursor) {
        this.element.style.cursor = obj2.cursor;
    }
}


//editor
var LineEditor = function(element, options) {

    var defaults = {
        width : 800,
        height : 250,
        startTime : 0,
        endTime : 10 * 48000,
        marginTop : 5,
        marginBottom : 15,
        marginLeft : 40,
        marginRight : 10,
        fontSize : 12,
        gridVSubdiv : 8,
        font: "11px Arial"
    }

    //overwrite options
    this.options = defaults;
    for (var attrname in options) {  this.options[attrname] = options[attrname]; }

    var canvas = document.createElement("canvas");
    canvas.width = this.options.width;
    canvas.height = this.options.height;
    element.appendChild(canvas);
    this.element = element;
    this.ctx = canvas.getContext("2d");
    this.width = canvas.width;
    this.height = canvas.height;
    this.mouse = new Mouse(element);
    this.line = new Polyline(this);

    this.siblings = [];

    this.line.push({x: 0, y : 32767});

    //speed test
    /*
    for (var i = 0; i < 100; i++) {
        this.line.push({x: i*2000, y : (i % 2)*32768});
    };*/
    

    this.options.gridHeight = this.height - this.options.marginTop - this.options.marginBottom;
    this.options.gridWidth = this.width - this.options.marginLeft - this.options.marginRight;

    this.startTime = this.options.startTime;
    this.endTime = this.options.endTime;

    element.onmousemove = this.onmousemove();
    element.onmousedown = this.onmousedown();
    element.onmouseup = this.onmouseup();
    element.oncontextmenu = this.oncontextmenu();
    this.dblclick = this.ondblclick();

    if ('onwheel' in document) {
        element.onwheel = this.onmousewheel();
    } else {
        element.onmousewheel = this.onmousewheel();
    }

    this.animLastFrameTimestamp = 0;
    this.animForceUpdate = 0;
    this.frameRequest = requestAnimFrame(this.updateAnimationFunc(this));
    this.Draw();
}


LineEditor.link = function(siblings) {
    for (var i = siblings.length - 1; i >= 0; i--) {
        siblings[i].listenToEvent('subscribe', siblings);
    };
}


LineEditor.prototype.emitEvent = function(eventName, event) {
    for (var i = this.siblings.length - 1; i >= 0; i--) {
        this.siblings[i].listenToEvent(eventName, event);
    };
}

LineEditor.prototype.listenToEvent = function(eventName, event) {
    switch(eventName) {
        case 'subscribe':
            var me = event.indexOf(this);
            if (me != -1) {
                this.siblings = event.slice(0);    //clone
                this.siblings.splice(me, 1);    //remove self
            }
            break;

        case 'mouse':
            this.mouse.set(event);
            this.animForceUpdate = 1;
            break;

        case 'time':
            this.startTime  = event.startTime;
            this.endTime = event.endTime;           
            this.animForceUpdate = 1;
            break;
            
    }
}

LineEditor.prototype.getPoints = function() {
    return this.line.points;
}

LineEditor.prototype.setPoints = function(points) {

    if(points && points.length > 0) {
        this.line.points = points;
    } else {
        this.line.points = [];
        this.line.push({x: 0, y : 32767});
    } 

    this.animForceUpdate = 1;
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

LineEditor.prototype.calcOffsets = function(event) {
    if(!event.hasOwnProperty('offsetX')) {
        event.offsetX = event.layerX - event.currentTarget.offsetLeft;
        event.offsetY = event.layerY - event.currentTarget.offsetTop;
    }
}

LineEditor.prototype.onmousewheel = function() {
    var self = this;
    return function(event) {
        event.preventDefault();
        self.Zoom(event);
    }
}

LineEditor.prototype.onmousemove = function() {
    var self = this;
    var handler = function(event) {
        self.animForceUpdate = 1;
        self.calcOffsets(event);
        var x = event.offsetX;
        var y = event.offsetY;
        var ts = self.xToTimestamp(x);
        self.comment( self.formatTs(ts)  + '&emsp;' 
            + self.formatTs(self.startTime) + '&emsp;' 
            + self.formatTs(self.endTime) + '&emsp;' 
        );
        var mouse = { x : x, y : y};
        self.mouse.set(mouse);
        self.emitEvent('mouse', mouse);

        var foundPoint = self.line.findPointAt(x, y);
        if (!self.mouse.pressed) {
            self.mouse.set({foundPoint : foundPoint});
            if (foundPoint != -1)
                self.mouse.set({cursor : 'pointer'});
            else 
                self.mouse.set({cursor : 'auto'});
        }

        
        //drag detection: antijitter 5px;
        if ((Math.abs(self.mouse.originalX - x) > 5 || Math.abs(self.mouse.originalY - y) > 5)
            && !self.mouse.drag && !self.mouse.pointDrag && self.mouse.pressed) {
            if(self.mouse.foundPoint == -1) {
                self.mouse.drag = true; 
            } else {
                self.mouse.pointDrag = true; 
                self.mouse.pointDragAnchor = self.mouse.foundPoint; 
                self.line.highlightPoint(self.mouse.foundPoint);
                self.line.beforeMove(self.mouse.pointDragAnchor);
            }
        }

        if (!self.mouse.drag && !self.mouse.pointDrag)
            return; //all the other actions are made in onclick

        if (self.mouse.button == 1 && self.mouse.pressed) {     //left

            if (self.mouse.pointDrag) {   //point dragging
                var px = self.xToTimestamp(x);
                var py = self.yToValue(y);
                self.line.movePoints(self.mouse.pointDragAnchor, px, py);
                return;
            }

            //range selection
            var x1 = self.mouse.time;
            var x2 = ts;
            self.line.clearHighlight();
            self.line.highlightRange(x1, x2);
        }

        if (self.mouse.button == 3 && self.mouse.pressed) {     //right

            var t = self.xToTimestamp(x);
            var delta = self.mouse.time - t;
            self.startTime =  self.mouse.startTime + delta;
            self.endTime = self.mouse.endTime + delta;
            var mouse = { 
                startTime : self.startTime,
                endTime : self.endTime,
                cursor : 'move',
                drag : true
            }
            self.mouse.set(mouse);
            self.emitEvent('time', { startTime : self.startTime, endTime : self.endTime });
        }

    }


    return handler;
}

LineEditor.prototype.onmousedown = function() {
    var self = this;
    var handler = function(event) {
        self.animForceUpdate = 1;
        event.preventDefault();
        self.calcOffsets(event);
        var x = event.offsetX;
        var y = event.offsetY;
        var t = self.xToTimestamp(x);

        var foundPoint = self.line.findPointAt(x, y);
        setTimeout(function(){
            if (foundPoint != -1) {
                self.mouse.set({ cursor : 'move' });
            } else {
                self.mouse.set({ cursor : 'text' });
            }
        }, 10);

        if (foundPoint != -1 && self.line.highlighted.indexOf(foundPoint) == -1)
            self.line.clearHighlight();     //clear previous selection

        var mouse = { 
            pressed : true,
            time : t,
            originalX : x,
            originalY : y,
            startTime : self.startTime,
            endTime : self.endTime,
            button : event.which
        }
        self.mouse.set(mouse);
    }

    return handler;
}

LineEditor.prototype.onmouseup = function() {
    var self = this;
    var handler = function(event) {
        self.calcOffsets(event);
        var x = event.offsetX;
        var y = event.offsetY;
        self.mouse.set({ 
            pressed : false,
            cursor : 'auto'
        });

        if (self.mouse.drag || self.mouse.pointDrag) {  
            self.mouse.set({ drag : false, pointDrag : false });    //reset drag event
        }

        //if (self.line.highlighted.length == 1)
        //    self.line.clearHighlight();

        if (Math.abs(self.mouse.originalX - x) < 3) {  //click
            if (self.mouse.button == 1)
                self.onleftclick(event);
            if (self.mouse.button == 3)
                self.onrightclick(event);
        }
        //event.preventDefault();
    }
    return handler;
}

LineEditor.prototype.onleftclick = function(event) {
    var self = this;
    self.animForceUpdate = 1;

    //handle click
    self.calcOffsets(event);
    var x = event.offsetX;
    var y = event.offsetY;

    //find point at xy
    var point = self.line.findPointAt(x, y);
    if (point != -1) {  //select point
        self.line.clearHighlight();
        self.line.highlightPoint(point);
    } else {
        if (event.which == 1) {     //left

            if (self.line.highlighted.length > 0) { //deselect
                self.line.clearHighlight();
                return;
            }

            x = self.xToTimestamp(x);
            y = self.yToValue(y);
            self.line.addPoint(x, y);     
        }    
    }
}

LineEditor.prototype.onrightclick = function(event) {
    var self = this;
    event.preventDefault();
    self.calcOffsets(event);
    var x = event.offsetX;
    var y = event.offsetY;
    var point = self.line.findPointAt(x, y);
    if (point != -1) {  //select point
        self.line.deletePoint(point);
        this.mouse.foundPoint = -1;
        self.animForceUpdate = 1;
    }
    self.dblclick();
} 

LineEditor.prototype.oncontextmenu = function(event) {
    var self = this;
    var handler = function(event) {
        event.preventDefault();
    }
    return handler;
}

LineEditor.prototype.ondblclick = function() {

    var self = this;
    var timeout = 0, clicked = false;
    return function() {
        if( clicked ) {
            clearTimeout(timeout);
            clicked = false;
            if (self.line.points.length > 1) {
                self.endTime = self.line.points[self.line.points.length-1].x;
            } else {
                self.endTime = 48000 * 10 * 1;
            }
            self.startTime = 0;
            self.animForceUpdate = 1; 
        } else {
            clicked = true;
            timeout = setTimeout( function() {
                clicked = false;
            }, 300 );
        }
    };
}

/*
LineEditor.prototype.ondblclick = function() {
    var self = this;
    var handler = function(event) {
        self.startTime = 0;
        self.endTime = 48000 * 10 * 1;
        self.animForceUpdate = 1; 
    }
    return handler;
}
*/

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



LineEditor.prototype.Zoom = function(event, external) {
    var self = this;

    var x = event.offsetX ? event.offsetX : event.layerX;
    var t = self.xToTimestamp(x);
    var delta = event.wheelDelta ? (-event.wheelDelta / 120) :  event.deltaY;
    var zoomfactor = delta;    //120 per click, -> 1

    var proportion = Math.abs(self.startTime - self.endTime) * 0.05; // %
    var proportion_y = (t - self.startTime) / Math.abs(self.startTime - self.endTime);
    zoomfactor *= proportion;

    self.endTime += zoomfactor * (1 - proportion_y);
    self.startTime -= zoomfactor * proportion_y;
    
    self.animForceUpdate = 1; 

    self.emitEvent('time', { startTime : self.startTime, endTime : self.endTime });
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
    for (var i = stepCount; i >= 0; i--) {
        var y = Math.floor(i*vstep) + this.options.marginTop;
        if (i == stepCount/2)
            ctx.strokeStyle = "#0c0";
        this.DrawLine(ctx, this.options.marginLeft, y, width+this.options.marginLeft, y);
        if (i == stepCount/2)
            ctx.strokeStyle = "#ccc";

        if (i % 2 == 0)
            this.Echo(ctx, (100-i*(100/stepCount))+"%", 0, y + 4);

    };

    ctx.strokeStyle = "rgb(255, 140, 0)";
    ctx.fillStyle   = "rgba(255, 165, 0, 0.2)";
    var x = Math.floor(this.mouse.x);
    this.DrawLine(ctx, x, this.options.marginTop, x, this.options.gridHeight+this.options.marginTop);
    if (this.mouse.drag && this.mouse.button == 1) {
        var x1 = this.timestampToX(this.mouse.time);
        this.DrawBox(ctx,
            x1, this.options.marginTop, 
            x, this.options.gridHeight+this.options.marginTop);

        this.DrawLine(ctx, x1, this.options.marginTop, x1, this.options.gridHeight+this.options.marginTop);
    }

    if (this.mouse.foundPoint != -1) {
        var x = this.timestampToX(this.line.points[this.mouse.foundPoint].x);
        var y = this.valueToY(this.line.points[this.mouse.foundPoint].y);
        this.DrawAnchorHighlight(ctx, x, y);
    }
    this.ctx.drawImage(ctx.canvas, 0, 0);

}

LineEditor.prototype.DrawBox = function (ctx, sx, sy, ex, ey) {
    ctx.rect(sx, sy, ex - sx, ey - sy);
    ctx.fill();
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

LineEditor.prototype.DrawAnchorHighlight = function(ctx, x, y) {
    ctx.fillStyle = "rgba(255, 165, 0, 0.6)";
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, 2*Math.PI);    //x,y,radius,angles
    ctx.fill();
}

LineEditor.prototype.Echo = function(ctx, text, x, y) {
    ctx.font = this.options.font;
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

/* http://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-on-html-canvas */
LineEditor.prototype.RoundRect = function(ctx, x, y, width, height, radius) {
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

LineEditor.prototype.DrawTag = function(ctx, x, y, text) {
    var textW = ctx.measureText(text).width;
    var textH = ctx.measureText('M').width;
    var boxW = textW + textH;
    var boxH = textH * 1.5;
    var boxX = x - boxW/2;
    var boxY = y - boxH - boxH/2;
    if (boxY < 10)
        boxY = y + boxH + textH/2;

    var textX = boxX + boxW/2 - textW/2;
    var textY = boxY + boxH/2 + textH/2;
    ctx.fillStyle = '#FFB356';
    this.RoundRect(ctx,boxX, boxY, boxW, boxH, 2);
    ctx.fillStyle = '#000';
    this.Echo(ctx, text, textX, textY);
}

LineEditor.prototype.setTag = function(tag) {
    this.animForceUpdate = 1;
    return this.line.setTag(tag);
}

LineEditor.prototype.cleanTags = function(firstTag) {
    this.animForceUpdate = 1;
    return this.line.cleanTags(firstTag);
}

