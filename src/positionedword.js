var rect = require('./rect');
var part = require('./part');

var positionedChar = {
    bounds: function() {
        var wb = this.word.bounds();
        var width = this.word.word.isNewLine() ? 20 : this.part.width;
        return rect(wb.l + this.left, wb.t, width, wb.h);
    }
};

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
    },
    parts: function(eachPart) {
        this.word.text.parts.some(eachPart) ||
        this.word.space.parts.some(eachPart);
    },
    characterByOrdinal: function(index) {
        if (index >= this.ordinal && index < this.ordinal + this.length) {
            return this.positionedCharacters()[index - this.ordinal];
        }
    },
    realiseCharacters: function() {
        if (!this._characters) {
            var cache = [];
            var x = 0, self = this, ordinal = this.ordinal;
            this.parts(function(wordPart) {
                var text = wordPart.run.text;
                for (var c = 0; c < text.length; c++) {
                    var charRun = Object.create(wordPart.run);
                    charRun.text = text[c];
                    var p = part(charRun);
                    cache.push(Object.create(positionedChar, {
                        left: { value: x },
                        part: { value: p },
                        word: { value: self },
                        ordinal: { value: ordinal }
                    }));
                    x += p.width;
                    ordinal++;
                }
            });
            this._characters = cache;
        }
    },
    positionedCharacters: function() {
        this.realiseCharacters();
        return this._characters;
    }
};

module.exports = function(word, line, left, ordinal) {
    return Object.create(prototype, {
        word: { value: word },
        line: { value: line },
        left: { value: left },
        ordinal: { value: ordinal },
        length: { value: word.text.length + word.space.length }
    });
};
