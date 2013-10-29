var positionedWord = require('./positionedword');
var rect = require('./rect');

/*  A Line is returned by the wrap function. It contains an array of PositionedWord objects that are
    all on the same physical line in the wrapped text.

     It has a width (which is actually the same for all lines returned by the same wrap). It also has
     coordinates for baseline, ascent and descent. The ascent and descent have the maximum values of
     the individual words' ascent and descent coordinates.

    It has methods:

        draw(ctx, x, y)
                  - Draw all the words in the line applying the specified (x, y) offset.
        bounds()
                  - Returns a Rect for the bounding box.
 */
var prototype = {
    draw: function(ctx, x, y) {
        this.positionedWords.forEach(function(word) {
            word.draw(ctx, x, y);
        });
    },
    bounds: function() {
        return rect(0,
            this.baseline - this.ascent,
            this.width,
            this.ascent + this.descent);
    },
    characterByOrdinal: function(index) {
        if (index >= this.ordinal && index < this.ordinal + this.length) {
            var result = null;
            if (this.positionedWords.some(function(word) {
                result = word.characterByOrdinal(index);
                if (result) {
                    return true;
                }
            })) {
                return result;
            }
        }
    }
};

module.exports = function(doc, width, baseline, ascent, descent, words, ordinal) {

    var line = Object.create(prototype, {
        doc: { value: doc },
        width: { value: width },
        baseline: { value: baseline },
        ascent: { value: ascent },
        descent: { value: descent },
        ordinal: { value: ordinal }
    });

    var x = 0;
    Object.defineProperty(line, 'positionedWords', {
        value: words.map(function(word) {
            var left = x;
            x += word.width;
            var wordOrdinal = ordinal;
            ordinal += (word.text.length + word.space.length);
            return positionedWord(word, line, left, wordOrdinal);
        })
    });

    Object.defineProperty(line, 'length', { value: ordinal - line.ordinal });
    return line;
};
