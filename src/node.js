var per = require('per');
var runs = require('./runs');
var rect = require('./rect');
var util = require('./util');

exports.prototype = {
    children: function() {
        return [];
    },
    parent: function() {
        return null;
    },
    first: function() {
        return this.children()[0];
    },
    last: function() {
        return this.children()[this.children().length - 1];
    },
    next: function() {
        var self = this;
        for (;;) {
            var parent = self.parent();
            if (!parent) {
                return null;
            }
            var siblings = parent.children();
            var next = siblings[siblings.indexOf(self) + 1];
            if (next) {
                for (;;)  {
                    var first = next.first();
                    if (!first) {
                        break;
                    }
                    next = first;
                }
                return next;
            }
            self = parent;
        }
    },
    previous: function() {
        var parent = this.parent();
        if (!parent) {
            return null;
        }
        var siblings = parent.children();
        var prev = siblings[siblings.indexOf(this) - 1];
        if (prev) {
            return prev;
        }
        var prevParent = parent.previous();
        return !prevParent ? null : prevParent.last();
    },
    byOrdinal: function(index) {
        var found = null;
        if (this.children().some(function(child) {
            if (index >= child.ordinal && index < child.ordinal + child.length) {
                found = child.byOrdinal(index);
                if (found) {
                    return true;
                }
            }
        })) {
            return found;
        }
        return this;
    },
    byCoordinate: function(x, y) {
        var found;
        this.children().some(function(child) {
            var b = child.bounds();
            if (b.contains(x, y)) {
                found = child.byCoordinate(x, y);
                if (found) {
                    return true;
                }
            }
        });
        if (!found) {
            found = this.last();
            while (found) {
                var next = found.last();
                if (!next) {
                    break;
                }
                found = next;
            }
            var foundNext = found.next();
            if (foundNext && foundNext.block) {
                found = foundNext;
            }
        }
        return found;
    },
    draw: function(ctx, viewPort) {
        this.children().forEach(function(child) {
            child.draw(ctx, viewPort);
        });
    },
    parentOfType: function(type) {
        var p = this.parent();
        return p && (p.type === type ? p : p.parentOfType(type));
    },
    bounds: function() {
        var l = this._left, t = this._top, r = 0, b = 0;
        this.children().forEach(function(child) {
            var cb = child.bounds();
            l = Math.min(l, cb.l);
            t = Math.min(t, cb.t);
            r = Math.max(r, cb.l + cb.w);
            b = Math.max(b, cb.t + cb.h);
        });
        return rect(l, t, r - l, b - t);
    }
};

exports.derive = function(methods) {
    return util.derive(exports.prototype, methods);
};

var generic = exports.derive({
    children: function() {
        return this._children;
    },
    parent: function() {
        return this._parent;
    },
    finalize: function(startDecrement, lengthIncrement) {
        var start = Number.MAX_VALUE, end = 0;
        this._children.forEach(function(child) {
            start = Math.min(start, child.ordinal);
            end = Math.max(end, child.ordinal + child.length);
        });
        Object.defineProperty(this, 'ordinal', { value: start - (startDecrement || 0) });
        Object.defineProperty(this, 'length', { value: (lengthIncrement || 0) + end - start });
    }
});

exports.generic = function(type, parent, left, top) {
    return Object.create(generic, {
        type: { value: type },
        _children: { value: [] },
        _parent: { value: parent },
        _left: { value: typeof left === 'number' ? left : Number.MAX_VALUE },
        _top: { value: typeof top === 'number' ? top : Number.MAX_VALUE }
    });
};
