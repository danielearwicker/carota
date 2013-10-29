var per = require('per');
var part = require('./part');

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
    }
};

var measure = function(runs) {
    var section = {
        parts: runs.map(part),
        ascent: 0,
        descent: 0,
        width: 0,
        length: 0
    };
    section.parts.forEach(function(p) {
        section.ascent = Math.max(section.ascent, p.ascent);
        section.descent = Math.max(section.descent, p.descent);
        section.width += p.width;
        section.length += p.run.text.length;
    });
    return section;
};

module.exports = function(coords) {
    if (!coords) {
        return coords;
    }
    var text = measure(per.toArray(coords.text.cut(coords.spaces)));
    var space = measure(per.toArray(coords.spaces.cut(coords.end)));
    return Object.create(prototype, {
        text: { value: text },
        space: { value: space },
        ascent: { value: Math.max(text.ascent, space.ascent) },
        descent: { value: Math.max(text.descent, space.descent) },
        width: { value: text.width + space.width }
    });
};
