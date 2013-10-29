
var prototype = {
    contains: function(x, y) {
        return x >= this.l && x < (this.l + this.w) &&
            y >= this.t && y < (this.t + this.h);

    },
    drawPath: function(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.l, this.t);
        ctx.lineTo(this.l + this.w, this.t);
        ctx.lineTo(this.l + this.w, this.t + this.h);
        ctx.lineTo(this.l, this.t + this.h);
        ctx.closePath();
    },
    offset: function(x, y) {
        return rect(this.l + x, this.t + y, this.w, this.h);
    },
    equals: function(other) {
        return this.l === other.l && this.t === other.t &&
               this.w === other.w && this.h === other.h;
    }
};

var rect = module.exports = function(l, t, w, h) {
    return Object.create(prototype, {
        l: { value: l },
        t: { value: t },
        w: { value: w },
        h: { value: h }
    });
};
