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
                    var stop = (runIndex === upTo._run) ? upTo._offset : run.text.length;
                    if (start < stop) {
                        run = Object.create(run);
                        run.text = run.text.substr(start, stop - start);
                        eachRun(run);
                    }
                }
            }
        };
    }
};

function character(runs, run, offset) {
    return Object.create(prototype, {
        _runs: { value: runs },
        _run: { value: run },
        _offset: { value: offset },
        char: { value: run >= runs.length ? null : runs[run].text[offset] }
    });
}

function firstNonEmpty(runs, n) {
    for (; n < runs.length; n++) {
        if (runs[n].text.length != 0) {
            return character(runs, n, 0);
        }
    }
    return character(runs, runs.length, 0);
}

module.exports = function(runs) {
    return function(emit) {
        var c = firstNonEmpty(runs, 0);
        while (!emit(c) && (c.char !== null)) {
            c = (c._offset + 1 < runs[c._run].text.length)
                ? character(runs, c._run, c._offset + 1)
                : firstNonEmpty(runs, c._run + 1);
        }
    };
};