var rect = require('./rect');

/*  A positionedWord is just a realised Word plus a reference back to the containing Line and
    the left coordinate (x coordinate of the left edge of the word).

    It has methods:

        draw(ctx, x, y)
                  - Draw the word within its containing line, applying the specified (x, y)
                    offset.
        bounds()
                  - Returns a rect for the bounding box.
 */
var prototype = {
    draw: function(ctx, x, y) {
        this.word.draw(ctx, this.left + x, this.line.baseline + y);
    },
    bounds: function() {
        return rect(
            this.left,
            this.line.baseline - this.line.ascent,
            this.word.width,
            this.line.ascent + this.line.descent);
    }
};

module.exports = function(word, line, left) {
    return Object.create(prototype, {
        word: { value: word },
        line: { value: line },
        left: { value: left }
    });
};
