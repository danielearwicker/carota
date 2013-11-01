var per = require('per');
var part = require('./part');
var measure = require('./measure');

/*  A Word has the following properties:

        text      - Section (see below) for non-space portion of word.
        space     - Section for trailing space portion of word.
        ascent    - Ascent (distance from baseline to top) for whole word
        descent   - Descent (distance from baseline to bottom) for whole word
        width     - Width of the whole word (including trailing space)

    It has methods:

        isNewLine()
                  - Returns true if the Word represents a newline. Newlines are
                    always represented by separate words.

        draw(ctx, x, y)
                  - Draws the Word at x, y on the canvas context ctx.

    Note: a section (i.e. text and space) is an object containing:

        parts     - array of Parts
        ascent    - Ascent (distance from baseline to top) for whole section
        descent   - Descent (distance from baseline to bottom) for whole section
        width     - Width of the whole section
 */

var prototype = {
    isNewLine: function() {
        return this.text.parts.length == 1 && this.text.parts[0].isNewLine;
    },
    draw: function(ctx, x, y) {
        this.text.parts.forEach(function(part) {
            part.draw(ctx, x, y);
            x += part.width;
        });
    },
    plainText: function() {
        return this.text.plainText + this.space.plainText;
    }
};

var section = function(runs) {
    var s = {
        parts: per(runs).map(part).all(),
        ascent: 0,
        descent: 0,
        width: 0,
        length: 0,
        plainText: ''
    };
    s.parts.forEach(function(p) {
        s.ascent = Math.max(s.ascent, p.ascent);
        s.descent = Math.max(s.descent, p.descent);
        s.width += p.width;
        s.length += p.run.text.length;
        s.plainText += p.run.text;
    });
    return s;
};

module.exports = function(coords) {
    var text, space;
    if (!coords) {
        // special end-of-document marker, mostly like a newline with no formatting
        text = [{ text: measure.enter }];
        return Object.create(prototype, {
            text: { value: section(text) },
            space: { value: section([]) },
            ascent: { value: text.ascent },
            descent: { value: text.descent },
            width: { value: text.width },
            eof: { value: true }
        });
    }
    text = section(coords.text.cut(coords.spaces));
    space = section(coords.spaces.cut(coords.end));
    return Object.create(prototype, {
        text: { value: text },
        space: { value: space },
        ascent: { value: Math.max(text.ascent, space.ascent) },
        descent: { value: Math.max(text.descent, space.descent) },
        width: { value: text.width + space.width }
    });
};
