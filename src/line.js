var positionedWord = require('./positionedword');
var rect = require('./rect');
var node = require('./node');
var runs = require('./runs');

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

var prototype = node.derive({
    draw: function(ctx) {
        this.positionedWords.forEach(function(word) {
            word.draw(ctx);
        });
    },
    bounds: function(minimal) {
        if (minimal) {
            var firstWord = this.first().bounds(),
                lastWord = this.last().bounds();
            return rect(
                firstWord.l,
                this.baseline - this.ascent,
                lastWord.l + lastWord.w,
                this.ascent + this.descent);
        }
        return rect(0, this.baseline - this.ascent,
            this.width, this.ascent + this.descent);
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
    },
    plainText: function() {
        return this.positionedWords.map(function(pw) {
            return pw.plainText();
        }).join('');
    },
    getFormatting: function() {
        return this.positionedWords.reduce(runs.merge);
    },
    runs: function(emit) {
        this.positionedWords.forEach(function(word) {
            word.runs(emit);
        });
    },
    parent: function() {
        return this.doc;
    },
    children: function() {
        return this.positionedWords;
    },
    type: 'line'
});

module.exports = function(doc, width, baseline, ascent, descent, words, ordinal) {

    var align = words[0].align();

    var line = Object.create(prototype, {
        doc: { value: doc },
        width: { value: width },
        baseline: { value: baseline },
        ascent: { value: ascent },
        descent: { value: descent },
        ordinal: { value: ordinal },
        align: { value: align }
    });

    var actualWidth = 0;
    words.forEach(function(word) {
        actualWidth += word.width;
    });
    actualWidth -= words[words.length - 1].space.width;

    var x = 0, spacing = 0;
    if (actualWidth < width) {
        switch (align) {
            case 'right':
                x = width - actualWidth;
                break;
            case 'center':
                x = (width - actualWidth) / 2;
                break;
            case 'justify':
                if (words.length > 1 && !words[words.length - 1].isNewLine()) {
                    spacing = (width - actualWidth) / (words.length - 1);
                }
                break;
        }
    }

    Object.defineProperty(line, 'positionedWords', {
        value: words.map(function(word) {
            var left = x;
            x += (word.width + spacing);
            var wordOrdinal = ordinal;
            ordinal += (word.text.length + word.space.length);
            return positionedWord(word, line, left, wordOrdinal, word.width + spacing);
        })
    });

    Object.defineProperty(line, 'actualWidth', { value: actualWidth });
    Object.defineProperty(line, 'length', { value: ordinal - line.ordinal });
    return line;
};
