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
    width: function(width) {
        if (arguments.length === 0) {
            return this._width;
        }
        this._width = width;
        this.layout();
    },
    draw: function(ctx, x, y, bottom) {
        measure.prepareContext(ctx);
        this.lines.some(function(line) {
            if (line.baseline - line.ascent > bottom) {
                return true;
            }
            line.draw(ctx, x, y);
        });
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
    characterByCoordinate: function(x, y) {
        var found;
        this.lines.some(function(line) {
            var bounds = line.bounds();
            if (bounds.contains(x, y)) {
                line.positionedWords.some(function(pword) {
                    bounds = pword.bounds();
                    if (bounds.contains(x, y)) {
                        var next = false;
                        pword.positionedCharacters().some(function(pchar) {
                            if (next) {
                                found = pchar;
                                return true;
                            }
                            bounds = pchar.bounds();
                            if (bounds.contains(x, y)) {
                                if ((x - bounds.l) > (bounds.w / 2)) {
                                    next = true;
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
                    found = last(last(line.positionedWords).positionedCharacters());
                }
                return true;
            }
        });
        if (!found) {
            found = last(last(last(this.lines).positionedWords).positionedCharacters());
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
    return doc;
};

exports.areCharsEqual = function(a, b) {
    return a ? (b && a.ordinal == b.ordinal) : !b;
};