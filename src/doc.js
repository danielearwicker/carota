var per = require('per');
var characters = require('./characters');
var split = require('./split');
var wrap = require('./wrap');
var word = require('./word');
var measure = require('./measure');

var prototype = {
    load: function(runs) {
        this.words = per(characters).per(split()).map(word).toArray(runs);
        this.layout();
    },
    layout: function() {
        this.lines = per.forEach().per(wrap(this._width, this)).toArray(this.words);
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
                line.positionedWords.some(function(positionedWord) {
                    bounds = positionedWord.bounds();
                    if (bounds.contains(x, y)) {
                        positionedWord.characters(function(pchar) {
                            bounds = pchar.bounds();
                            if (bounds.contains(x, y)) {
                                found = pchar
                                return true;
                            }
                        });
                        return true;
                    }
                });
                if (!found) {
                    var lastWord = line.positionedWords[line.positionedWords.length - 1];
                    found = per.last(lastWord.characters, lastWord);
                }
                return true;
            }
        });
        return found;
    }
};

exports = module.exports = function() {
    var doc = Object.create(prototype);
    doc._width = 0;
    doc.words = [];
    doc.lines = [];
    return doc;
};

exports.areCharsEqual = function(a, b) {
    return a ? (b && a.ordinal == b.ordinal) : !b;
};