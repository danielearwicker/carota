
var prototype = {
    contains: function(x, y) {
        return x >= this.l && x < (this.l + this.w) &&
            y >= this.t && y < (this.t + this.h);

    },
    stroke: function(ctx) {
        ctx.strokeRect(this.l, this.t, this.w, this.h);
    },
    fill: function(ctx) {
        ctx.fillRect(this.l, this.t, this.w, this.h);
    },
    offset: function(x, y) {
        return rect(this.l + x, this.t + y, this.w, this.h);
    },
    equals: function(other) {
        return this.l === other.l && this.t === other.t &&
               this.w === other.w && this.h === other.h;
    },
    center: function() {
        return { x: this.l + this.w/2, y: this.t + this.h/2 };
    }
};

var rect = module.exports = function(l, t, w, h) {
    return Object.create(prototype, {
        l: { value: l },
        t: { value: t },
        w: { value: w },
        h: { value: h },
        r: { value: l + w },
        b: { value: t + h }
    });
};
