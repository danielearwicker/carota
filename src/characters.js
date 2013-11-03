var runs = require('./runs');

var compatible = function(a, b) {
    if (a._runs !== b._runs) {
        throw new Error('Characters for different documents');
    }
};

var prototype = {
    equals: function(other) {
        compatible(this, other);
        return this._run === other._run && this._offset === other._offset;
    },
    cut: function(upTo) {
        compatible(this, upTo);
        var self = this;
        return function(eachRun) {
            for (var runIndex = self._run; runIndex <= upTo._run; runIndex++) {
                var run = self._runs[runIndex];
                if (run) {
                    var start = (runIndex === self._run) ? self._offset : 0;
                    var stop = (runIndex === upTo._run) ? upTo._offset : runs.getTextLength(run.text);
                    if (start < stop) {
                        runs.getSubText(function(piece) {
                            var pieceRun = Object.create(run);
                            pieceRun.text = piece;
                            eachRun(pieceRun);
                        }, run.text, start, stop - start);
                    }
                }
            }
        };
    }
};

function character(runArray, run, offset) {
    return Object.create(prototype, {
        _runs: { value: runArray },
        _run: { value: run },
        _offset: { value: offset },
        char: {
            value: run >= runArray.length ? null :
                runs.getTextChar(runArray[run].text, offset)
        }
    });
}

function firstNonEmpty(runArray, n) {
    for (; n < runArray.length; n++) {
        if (runs.getTextLength(runArray[n].text) != 0) {
            return character(runArray, n, 0);
        }
    }
    return character(runArray, runArray.length, 0);
}

module.exports = function(runArray) {
    return function(emit) {
        var c = firstNonEmpty(runArray, 0);
        while (!emit(c) && (c.char !== null)) {
            c = (c._offset + 1 < runs.getTextLength(runArray[c._run].text))
                ? character(runArray, c._run, c._offset + 1)
                : firstNonEmpty(runArray, c._run + 1);
        }
    };
};