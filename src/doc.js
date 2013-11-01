var per = require('per');
var characters = require('./characters');
var split = require('./split');
var wrap = require('./wrap');
var word = require('./word');
var node = require('./node');
var runs = require('./runs');
var measure = require('./measure');

function DocumentRange(doc, start, end) {
    this.doc = doc;
    this.start = start;
    this.end = end;
}

DocumentRange.prototype.parts = function(emit, list) {
    list = list || this.doc.lines;
    var self = this;

    list.some(function(item) {
        if (item.ordinal + item.length <= self.start) {
            return false;
        }
        if (item.ordinal >= self.end) {
            return true;
        }
        if (item.ordinal >= self.start &&
            item.ordinal + item.length <= self.end) {
            emit(item);
        } else {
            self.parts(emit, item.children());
        }
    });
};

DocumentRange.prototype.plainText = function() {
    return per(this.parts, this).map('x.plainText()').all().join('');
};

DocumentRange.prototype.clear = function() {
    this.doc.remove(this.start, this.end);
    this.end = this.start;
};

var wordCharRuns = function(positionedWord) {
    return positionedWord.children().map(function(char) {
        return char.part.run;
    });
};

var prototype = node.derive({
    load: function(runs) {
        this.words = per(characters(runs)).per(split()).map(word).all();
        this.layout();
    },
    layout: function() {
        this.lines = per(this.words).per(wrap(this._width, this)).all();
    },
    plainText: function() {
        return this.words.map(function(word) {
            return word.plainText;
        }).join('');
    },
    range: function(start, end) {
        return new DocumentRange(this, start, end);
    },
    selectedRange: function() {
        return this.range(this.selection.start, this.selection.end);
    },
    remove: function(start, end) {

    },
    insert: function(ordinal, runs) {
        var beforeChar = this.characterByOrdinal(ordinal);
        if (typeof runs === 'string') {
            runs = [
                Object.create((beforeChar.previous() || beforeChar).part.run, {
                    text: { value: runs }
                })
            ];
        }

        var length = 0;
        runs.forEach(function(run) {
            length += run.text.length;
        });

        var pword = beforeChar.parent();

        var allWords = this.words;
        var wordIndex = allWords.indexOf(pword.word);
        var wordChars = wordCharRuns(pword);

        var prefix, suffix, wordStart, wordCount;
        if (beforeChar.ordinal === pword.ordinal) {
            var previousWord = pword.previous();
            prefix = !previousWord ? [] : wordCharRuns(previousWord);
            suffix = wordChars;
            wordStart = wordIndex - 1;
            wordCount = 2;
        } else {
            var offset = beforeChar.ordinal - pword.ordinal;
            prefix = wordChars.slice(0, offset);
            suffix = wordChars.slice(offset);
            wordStart = wordIndex;
            wordCount = 1;
        }

        var newRuns = runs.consolidate(prefix.concat(runs).concat(suffix));
        var newWords = per(characters(newRuns))
            .per(split())
            .truthy()
            .map(word)
            .all();
        Array.prototype.splice.apply(
            allWords, [wordStart, wordCount].concat(newWords));
        this.layout();
        this.selection.start = this.selection.end = ordinal + length;
        return length;
    },
    width: function(width) {
        if (arguments.length === 0) {
            return this._width;
        }
        this._width = width;
        this.layout();
    },
    first: function() {
        return this.lines[0];
    },
    last: function() {
        return this.lines[this.lines.length - 1];
    },
    children: function() {
        return this.lines;
    },
    length: function() {
        return this.last().last().last().ordinal;
    },
    draw: function(ctx, bottom) {
        measure.prepareContext(ctx);
        this.lines.some(function(line) {
            if (line.baseline - line.ascent > bottom) {
                return true;
            }
            line.draw(ctx);
        });
    },
    toggleCaret: function() {
        var old = this.caretVisible;
        if (this.selection.start === this.selection.end) {
            if (this.selectionJustChanged) {
                this.selectionJustChanged = false;
            } else {
                this.caretVisible = !this.caretVisible;
            }
        }
        return this.caretVisible !== old;
    },
    drawSelection: function(ctx) {
        if (this.selection.end === this.selection.start) {
            if (this.caretVisible) {
                var char = this.characterByOrdinal(this.selection.start),
                    charBounds = char.bounds(),
                    lineBounds = char.word.line.bounds(true);
                ctx.beginPath();
                ctx.moveTo(charBounds.l, lineBounds.t);
                ctx.lineTo(charBounds.l, lineBounds.t + lineBounds.h);
                ctx.stroke();
            }
        } else {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 100, 200, 0.3)';
            this.selectedRange().parts(function(part) {
                var b = part.bounds(true);
                ctx.fillRect(b.l, b.t, b.w, b.h);
            });
            ctx.restore();
        }
    },
    select: function(ordinal, ordinalEnd) {
        this.selection.start = ordinal;
        this.selection.end = typeof ordinalEnd === 'number'
            ? ordinalEnd : ordinal;
        this.selectionJustChanged = true;
        this.caretVisible = true;
    },
    characterByOrdinal: function(index) {
        var result = null;
        if (this.lines.some(function(line) {
            result = line.characterByOrdinal(index);
            if (result) {
                return true;
            }
        })) {
            return result;
        }
    },
    characterByCoordinate: function(x, y, right) {
        var found, nextLine = false;
        this.children().some(function(line) {
            if (nextLine) {
                found = line.characterByOrdinal(line.ordinal);
                return true;
            }
            var bounds = line.bounds();
            if (bounds.contains(x, y)) {
                line.children().some(function(pword) {
                    bounds = pword.bounds();
                    if (bounds.contains(x, y)) {
                        pword.children().some(function(pchar) {
                            bounds = pchar.bounds();
                            if (bounds.contains(x, y)) {
                                if (!pchar.word.word.isNewLine() && (x - bounds.l) > (bounds.w / 2)) {
                                    found = pchar.next();
                                } else {
                                    found = pchar;
                                }
                                return true;
                            }
                        });
                        return true;
                    }
                });
                if (!found) {
                    if (right) {
                        nextLine = true;
                    } else {
                        found = line.last().last();
                    }
                } else {
                    return true;
                }
            }
        });
        if (!found) {
            found = this.last().last().last();
        }
        return found;
    }
});

exports = module.exports = function() {
    var doc = Object.create(prototype);
    doc._width = 0;
    doc.words = [];
    doc.lines = [];
    doc.selection = { start: 0, end: 0 };
    doc.caretVisible = true;
    return doc;
};

exports.areCharsEqual = function(a, b) {
    return a ? (b && a.ordinal == b.ordinal) : !b;
};