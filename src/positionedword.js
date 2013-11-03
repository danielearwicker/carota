var per = require('per');
var rect = require('./rect');
var part = require('./part');
var measure = require('./measure');
var node = require('./node');
var split = require('./split');
var word = require('./word');
var runs = require('./runs');
var characters = require('./characters');

var newLineWidth = function(run) {
    return measure.cachedMeasureText(measure.enter, measure.getFontString(run)).width;
};

var positionedChar = node.derive({
    bounds: function() {
        var wb = this.word.bounds();
        var width = this.word.word.isNewLine()
            ? newLineWidth(this.word.word.run)
            : this.width || this.part.width;
        return rect(wb.l + this.left, wb.t, width, wb.h);
    },
    plainText: function() {
        return this.part.run.text;
    },
    runs: function(emit) {
        emit(this.part.run);
    },
    parent: function() {
        return this.word;
    },
    type: 'character'
});

/*  A positionedWord is just a realised Word plus a reference back to the containing Line and
    the left coordinate (x coordinate of the left edge of the word).

    It has methods:

        draw(ctx, x, y)
                  - Draw the word within its containing line, applying the specified (x, y)
                    offset.
        bounds()
                  - Returns a rect for the bounding box.
 */
var prototype = node.derive({
    draw: function(ctx) {
        this.word.draw(ctx, this.left, this.line.baseline);

        // Handy for showing how word boundaries work
        // var b = this.bounds();
        // ctx.strokeRect(b.l, b.t, b.w, b.h);
    },
    bounds: function() {
        return rect(
            this.left,
            this.line.baseline - this.line.ascent,
            this.word.isNewLine() ? newLineWidth(this.word.run) : this.width,
            this.line.ascent + this.line.descent);
    },
    parts: function(eachPart) {
        this.word.text.parts.some(eachPart) ||
        this.word.space.parts.some(eachPart);
    },
    characterByOrdinal: function(index) {
        if (index >= this.ordinal && index < this.ordinal + this.length) {
            return this.children()[index - this.ordinal];
        }
    },
    runs: function(emit) {
        this.parts(function(part) {
            emit(part.run);
        });
    },
    realiseCharacters: function() {
        if (!this._characters) {
            var cache = [];
            var x = 0, self = this, ordinal = this.ordinal,
                inlines = this.line.doc.inlines;
            this.parts(function(wordPart) {
                runs.pieceCharacters(function(char) {
                    var charRun = Object.create(wordPart.run);
                    charRun.text = char;
                    var p = part(charRun, inlines);
                    cache.push(Object.create(positionedChar, {
                        left: { value: x },
                        part: { value: p },
                        word: { value: self },
                        ordinal: { value: ordinal },
                        length: { value: 1 }
                    }));
                    x += p.width;
                    ordinal++;
                }, wordPart.run.text);
            });
            // Last character is artificially widened to match the length of the
            // word taking into account (align === 'justify')
            var lastChar = cache[cache.length - 1];
            if (lastChar) {
                Object.defineProperty(lastChar, 'width',
                    { value: this.width - lastChar.left });
            }
            this._characters = cache;
        }
    },
    children: function() {
        this.realiseCharacters();
        return this._characters;
    },
    plainText: function() {
        return this.word.plainText();
    },
    parent: function() {
        return this.line;
    },
    type: 'word'
});

module.exports = function(word, line, left, ordinal, width) {
    return Object.create(prototype, {
        word: { value: word },
        line: { value: line },
        left: { value: left },
        width: { value: width }, // can be different to word.width if (align == 'justify')
        ordinal: { value: ordinal },
        length: { value: word.text.length + word.space.length }
    });
};
