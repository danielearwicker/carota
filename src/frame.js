var node = require('./node');
var wrap = require('./wrap');
var rect = require('./rect');

var prototype = node.derive({
    bounds: function() {
        if (!this._bounds) {
            var left = 0, top = 0, right = 0, bottom = 0;
            if (this.lines.length) {
                var first = this.lines[0].bounds();
                left = first.l;
                top = first.t;
                this.lines.forEach(function(line) {
                    var b = line.bounds();
                    right = Math.max(right, b.l + b.w);
                    bottom = Math.max(bottom, b.t + b.h);
                });
            }
            this._bounds = rect(left, top, right - left, this.height || bottom - top);
        }
        return this._bounds;
    },
    actualWidth: function() {
        if (!this._actualWidth) {
            var result = 0;
            this.lines.forEach(function(line) {
                if (typeof line.actualWidth === 'number') {
                    result = Math.max(result, line.actualWidth);
                }
            });
            this._actualWidth = result;
        }
        return this._actualWidth;
    },
    children: function() {
        return this.lines;
    },
    parent: function() {
        return this._parent;
    },
    draw: function(ctx, viewPort) {
        var top = viewPort ? viewPort.t : 0;
        var bottom = viewPort ? (viewPort.t + viewPort.h) : Number.MAX_VALUE;
        this.lines.some(function(line) {
            var b = line.bounds();
            if (b.t + b.h < top) {
                return false;
            }
            if (b.t > bottom) {
                return true;
            }
            line.draw(ctx, viewPort);
        });
    },
    type: 'frame'
});

exports = module.exports = function(left, top, width, ordinal, parent,
                                    includeTerminator, initialAscent, initialDescent) {
    var lines = [];
    var frame = Object.create(prototype, {
        lines: { value: lines },
        _parent: { value: parent },
        ordinal: { value: ordinal }
    });
    var wrapper = wrap(left, top, width, ordinal, frame, includeTerminator, initialAscent, initialDescent);
    var length = 0, height = 0;
    return function(emit, word) {
        if (wrapper(function(line) {
            if (typeof line === 'number') {
                height = line;
            } else {
                length = (line.ordinal + line.length) - ordinal;
                lines.push(line);
            }
        }, word)) {
            Object.defineProperty(frame, 'length', { value: length });
            Object.defineProperty(frame, 'height', { value: height });
            emit(frame);
            return true;
        }
    };
};
