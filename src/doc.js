var per = require('per');
var characters = require('./characters');
var split = require('./split');
var wrap = require('./wrap');
var word = require('./word');
var measure = require('./measure');

function last(ar) {
    return ar[ar.length - 1];
}

var prototype = {
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
    width: function(width) {
        if (arguments.length === 0) {
            return this._width;
        }
        this._width = width;
        this.layout();
    },
    firstLine: function() {
        return this.lines[0];
    },
    lastLine: function() {
        return this.lines[this.lines.length - 1];
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
        var start = this.characterByOrdinal(this.selection.start),
            startBounds = start.bounds(),
            line = start.word.line.bounds(true);
        if (this.selection.end === this.selection.start) {
            if (this.caretVisible) {
                ctx.beginPath();
                ctx.moveTo(startBounds.l, line.t);
                ctx.lineTo(startBounds.l, line.t + line.h);
                ctx.stroke();
            }
        } else {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 100, 200, 0.3)';

            var end = this.characterByOrdinal(this.selection.end),
                endBounds = end.bounds();

            if (start.word.line.ordinal === end.word.line.ordinal) {
                ctx.fillRect(startBounds.l, line.t, endBounds.l - startBounds.l, line.h);
            } else {
                ctx.fillRect(startBounds.l, line.t, line.w - startBounds.l, line.h);
                line = end.word.line.bounds(true);
                ctx.fillRect(line.l, line.t, endBounds.l - line.l, line.h);

                this.lines.some(function(line) {
                    if (line.ordinal <= start.ordinal) {
                        return false;
                    }
                    if (line.ordinal + line.length > end.ordinal) {
                        return true;
                    }
                    var b = line.bounds(true);
                    ctx.fillRect(b.l, b.t, b.w, b.h);
                    return false;
                });
            }

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
        this.lines.some(function(line) {
            if (nextLine) {
                found = line.characterByOrdinal(line.ordinal);
                return true;
            }
            var bounds = line.bounds();
            if (bounds.contains(x, y)) {
                line.positionedWords.some(function(pword) {
                    bounds = pword.bounds();
                    if (bounds.contains(x, y)) {
                        var nextChar = false;
                        pword.positionedCharacters().some(function(pchar) {
                            if (nextChar) {
                                found = pchar;
                                return true;
                            }
                            bounds = pchar.bounds();
                            if (bounds.contains(x, y)) {
                                if ((x - bounds.l) > (bounds.w / 2)) {
                                    nextChar = true;
                                } else {
                                    found = pchar;
                                    return true;
                                }
                            }
                        });
                        return true;
                    }
                });
                if (!found) {
                    if (right) {
                        nextLine = true;
                    } else {
                        found = line.lastWord().lastCharacter();
                    }
                } else {
                    return true;
                }
            }
        });
        if (!found) {
            found = this.lastLine().lastWord().lastCharacter();
        }
        return found;
    }
};

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