var rect = require('./rect');
var part = require('./part');
var text = require('./text');
var node = require('./node');
var word = require('./word');
var runs = require('./runs');

var newLineWidth = function(run) {
    return text.measure(text.enter, run).width;
};

var positionedChar = node.derive({
    bounds: function() {
        var wb = this.word.bounds();
        var width = this.word.word.isNewLine()
            ? newLineWidth(this.word.word.run)
            : this.width || this.part.width;
        return rect(wb.l + this.left, wb.t, width, wb.h);
    },
    parent: function() {
        return this.word;
    },
    byOrdinal: function() {
        return this;
    },
    byCoordinate: function(x, y) {
        if (x <= this.bounds().center().x) {
            return this;
        }
        return this.next();
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
        this.word.draw(ctx, this.line.left + this.left, this.line.baseline);

        // Handy for showing how word boundaries work
        // var b = this.bounds();
        // ctx.strokeRect(b.l, b.t, b.w, b.h);
    },
    bounds: function() {
        return rect(
            this.line.left + this.left,
            this.line.baseline - this.line.ascent,
            this.word.isNewLine() ? newLineWidth(this.word.run) : this.width,
            this.line.ascent + this.line.descent);
    },
    parts: function(eachPart) {
        this.word.text.parts.some(eachPart) ||
        this.word.space.parts.some(eachPart);
    },
    realiseCharacters: function() {
        if (!this._characters) {
            var cache = [];
            var x = 0, self = this, ordinal = this.ordinal,
                codes = this.parentOfType('document').codes;
            this.parts(function(wordPart) {
                runs.pieceCharacters(function(char) {
                    var charRun = Object.create(wordPart.run);
                    charRun.text = char;
                    var p = part(charRun, codes);
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
                if (this.word.isNewLine() || (this.word.code() && this.word.code().eof)) {
                    Object.defineProperty(lastChar, 'newLine', { value: true });
                }
            }
            this._characters = cache;
        }
    },
    children: function() {
        this.realiseCharacters();
        return this._characters;
    },
    parent: function() {
        return this.line;
    },
    type: 'word'
});

module.exports = function(word, line, left, ordinal, width) {
    var pword = Object.create(prototype, {
        word: { value: word },
        line: { value: line },
        left: { value: left },
        width: { value: width }, // can be different to word.width if (align == 'justify')
        ordinal: { value: ordinal },
        length: { value: word.text.length + word.space.length }
    });
    return pword;
};
