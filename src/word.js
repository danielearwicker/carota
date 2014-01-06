'use strict';

var per = require('per');
var part = require('./part');
var runs = require('./runs');
var text = require('./text');

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
    isBreaker: function() {
        return this.code && this.code.block;
    },
    draw: function(ctx, x, y) {
        per(this.text.parts).concat(this.space.parts).forEach(function(part) {
            part.draw(ctx, x, y);
            x += part.width;
        });
    },
    plainText: function() {
        return this.text.plainText + this.space.plainText;
    },
    align: function() {
        var first = this.text.parts[0];
        return first ? first.run.align : 'left';
    },
    runs: function(emit, range) {
        var start = range && range.start || 0,
            end = range && range.end;
        if (typeof end !== 'number') {
            end = Number.MAX_VALUE;
        }
        [this.text, this.space].forEach(function(section) {
            section.parts.some(function(part) {
                if (start >= end || end <= 0) {
                    return true;
                }
                var run = part.run, text = run.text;
                if (typeof text === 'string') {
                    if (start <= 0 && end >= text.length) {
                        emit(run);
                    } else if (start < text.length) {
                        var pieceRun = Object.create(run);
                        var firstChar = Math.max(0, start);
                        pieceRun.text = text.substr(
                            firstChar,
                            Math.min(text.length, end - firstChar)
                        );
                        emit(pieceRun);
                    }
                    start -= text.length;
                    end -= text.length;
                } else {
                    if (start <= 0 && end >= 1) {
                        emit(run);
                    }
                    start--;
                    end--;
                }
            });
        });
    },
    characters: function() {
        var cache = [0], x = 0, offset = 0;
        if (!this.code) {
            var eachPart = function(part) {
                runs.pieceCharacters(function(ch) {
                    cache[offset++] = x;
                    x += text.measure(ch, part.run).width;
                }, part.run.text);
            };
            this.text.parts.some(eachPart);
            this.space.parts.some(eachPart);
        }
        return cache;
    }
};

var section = function(runEmitter, codes) {
    var s = {
        parts: per(runEmitter).map(function(p) {
            return part(p, codes);
        }).all(),
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
        s.length += runs.getPieceLength(p.run.text);
        s.plainText += runs.getPiecePlainText(p.run.text);
    });
    return s;
};

var newLineCode = {
    block: function(params) {
        return params.bounds.t;
    }
};

module.exports = function(coords, codes) {
    var text, space;
    if (!coords) {
        // special end-of-document marker, mostly like a newline with no formatting
        text = [{ text: '' }];
        space = [];
    } else {
        text = coords.text.cut(coords.spaces);
        space = coords.spaces.cut(coords.end);
    }
    text = section(text, codes);
    space = section(space, codes);
    var word = Object.create(prototype, {
        text: { value: text },
        space: { value: space },
        ascent: { value: Math.max(text.ascent, space.ascent) },
        descent: { value: Math.max(text.descent, space.descent) },
        width: { value: text.width + space.width, configurable: true },
        length: { value: text.length + space.length }
    });

    if (word.text.parts.length === 1 && word.space.parts.length === 0) {

        Object.defineProperty(word, 'only', { value: word.text.parts[0] });

        if (word.only.isNewLine || !coords) {
            Object.defineProperty(word, 'code', { value: newLineCode });

        } else if (word.only.code) {
            Object.defineProperty(word, 'code', { value: word.only.code });
        }
    }

    if (!coords) {
        Object.defineProperty(word, 'eof', { value: true });
    }
    return word;
};
