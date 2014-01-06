'use strict';

var per = require('per');
var characters = require('./characters');
var split = require('./split');
var word = require('./word');
var runs = require('./runs');
var range = require('./range');
var util = require('./util');
var codes = require('./codes');
var rect = require('./rect');
var wrap = require('./wrap');
var iterator = require('./iterator');
var text = require('./text');

var lengthOfWords = function(words) {
    return words.map(function(w) {
        return w.length;
    }).reduce(util.plus, 0);
};

var makeEditCommand = function(doc, start, count, words) {
    var selStart = doc.selection.start, selEnd = doc.selection.end;
    return function(log) {
        doc._wordOrdinals = [];
        var oldWords = Array.prototype.splice.apply(doc.words, [start, count].concat(words));
        doc.length += (lengthOfWords(words) - lengthOfWords(oldWords));
        log(makeEditCommand(doc, start, words.length, oldWords));

        selStart = Math.min(selStart, doc.length);
        selEnd = Math.min(selEnd, doc.length);

        if (doc.selection.start !== selStart || doc.selection.end !== selEnd) {
            setTimeout(function() {
                doc.select(selStart, selEnd);
            }, 10);
        }
    };
};

var makeTransaction = function(perform) {
    var commands = [];
    var log = function(command) {
        commands.push(command);
        log.nonEmptyTransaction = true;
    };
    perform(log);

    return function(outerLog) {
        outerLog(makeTransaction(function(innerLog) {
            while (commands.length) {
                commands.pop()(innerLog);
            }
        }));
    };
};

var bandHeight = 100;

var prototype = {
    load: function(runs, takeFocus) {
        this.undo = [];
        this.redo = [];
        this._wordOrdinals = [];
        this.length = 0;
        var self = this;
        this.words = per(characters(runs)).per(split(self.codes)).map(function(w) {
            w = word(w, self.codes);
            self.length += w.length;
            return w;
        }).all();
        this.contentChanged.fire();
        this.select(0, 0, takeFocus);
    },
    bands: function(top, bottom) {
        var result = [],
            startBand = Math.floor(top / bandHeight),
            endBand = Math.floor(bottom / bandHeight);

        if (!this._bands) {
            this._bands = [];
        }

        for (var b = startBand; b <= endBand; b++) {
            result.push(this._bands[b] || (this._bands[b] = []));
        }

        return result;
    },
    layout: function() {
        var self = this;

        self._output = [];
        self.actualWidth = 0;
        self._bands = [];

        self.height = wrap({
            words: iterator(this.words),
            bounds: rect(0, 0, this._width, 100000),
            output: function(info) {

                var existing = self._output[info.index];
                if (existing) {
                    Object.keys(info).forEach(function(key) {
                        existing[key] = info[key];
                    });
                } else {
                    self._output[info.index] = existing = info;
                    var pos = info.caret;
                    self.bands(pos.t, pos.b).forEach(function(band) {
                        band.push(info);
                    });
                }

                self.actualWidth = Math.max(self.actualWidth,
                        Math.max(existing.caret.r, existing.bounds.r));
            }
        });
    },
    range: function(start, end) {
        return range(this, start, end);
    },
    documentRange: function() {
        return this.range(0, this.length - 1);
    },
    selectedRange: function() {
        return this.range(this.selection.start, this.selection.end);
    },
    save: function() {
        return this.documentRange().save();
    },
    paragraphRange: function(start, end) {
        var i;

        // find the character after the nearest breaker before start
        var startInfo = this.wordContainingOrdinal(start);
        start = 0;
        if (startInfo && !startInfo.word.isBreaker()) {
            for (i = startInfo.index; i > 0; i--) {
                if (this.words[i - 1].isBreaker()) {
                    start = this.wordOrdinal(i);
                    break;
                }
            }
        }

        // find the nearest breaker after end
        var endInfo = this.wordContainingOrdinal(end);
        end = this.length - 1;
        if (endInfo && !endInfo.word.isBreaker()) {
            for (i = endInfo.index; i < this.words.length; i++) {
                if (this.words[i].isBreaker()) {
                    end = this.wordOrdinal(i);
                    break;
                }
            }
        }

        return this.range(start, end);
    },
    insert: function(text, takeFocus) {
        this.select(this.selection.end + this.selectedRange().setText(text), null, takeFocus);
    },
    modifyInsertFormatting: function(attribute, value) {
        this.nextInsertFormatting[attribute] = value;
        this.notifySelectionChanged();
    },
    applyInsertFormatting: function(text) {
        var formatting = this.nextInsertFormatting;
        var insertFormattingProperties = Object.keys(formatting);
        if (insertFormattingProperties.length) {
            text.forEach(function(run) {
                insertFormattingProperties.forEach(function(property) {
                    run[property] = formatting[property];
                });
            });
        }
    },
    wordOrdinal: function(index) {
        if (index < this.words.length) {
            var cached = this._wordOrdinals.length;
            if (cached < (index + 1)) {
                var o = 0;
                if (cached > 0) {
                    o = this._wordOrdinals[cached - 1] + this.words[cached - 1].length;
                }
                for (var n = cached; n <= index; n++) {
                    this._wordOrdinals[n] = o;
                    o += this.words[n].length;
                }
            }
            return this._wordOrdinals[index];
        }
    },
    wordContainingOrdinal: function(ordinal) {
        ordinal = Math.min(Math.max(0, ordinal), this.length - 1);

        // could rewrite to be faster using binary search over this.wordOrdinal
        var result;
        var pos = 0;
        this.words.some(function(word, i) {
            if (ordinal >= pos && ordinal < (pos + word.length)) {
                result = {
                    word: word,
                    ordinal: pos,
                    index: i,
                    offset: ordinal - pos
                };
                return true;
            }
            pos += word.length;
        });
        return result;
    },
    runs: function(emit, range) {
        var startDetails = this.wordContainingOrdinal(range.start),
            endDetails = this.wordContainingOrdinal(range.end);
        if (startDetails.index === endDetails.index) {
            startDetails.word.runs(emit, {
                start: startDetails.offset,
                end: endDetails.offset
            });
        } else {
            startDetails.word.runs(emit, { start: startDetails.offset });
            for (var n = startDetails.index + 1; n < endDetails.index; n++) {
                this.words[n].runs(emit);
            }
            endDetails.word.runs(emit, { end: endDetails.offset });
        }
    },
    spliceWordsWithRuns: function(wordIndex, count, runs) {
        var self = this;

        var newWords = per(characters(runs))
            .per(split(self.codes))
            .truthy()
            .map(function(w) {
                return word(w, self.codes);
            })
            .all();

        // Check if old or new content contains any fancy control codes:
        var runFilters = false;

        if ('_filtersRunning' in self) {
            self._filtersRunning++;
        } else {
            for (var n = 0; n < count; n++) {
                if (this.words[wordIndex + n].code) {
                    runFilters = true;
                }
            }
            if (!runFilters) {
                runFilters = newWords.some(function(word) {
                    return !!word.code;
                });
            }
        }

        this.transaction(function(log) {
            makeEditCommand(self, wordIndex, count, newWords)(log);
            if (runFilters) {
                self._filtersRunning = 0;
                try {
                    for (;;) {
                        var spliceCount = self._filtersRunning;
                        if (!self.editFilters.some(function(filter) {
                            filter(self);
                            return spliceCount !== self._filtersRunning;
                        })) {
                            break; // No further changes were made
                        }
                    }
                } finally {
                    delete self._filtersRunning;
                }
            }
        });

        this.layout();
    },
    splice: function(start, end, text) {
        if (typeof text === 'string') {
            var sample = Math.max(0, start - 1);
            var sampleRun = per({ start: sample, end: sample + 1 })
                .per(this.runs, this)
                .first();
            text = [
                Object.create(sampleRun || {}, { text: { value: text } })
            ];
        } else if (!Array.isArray(text)) {
            text = [{ text: text }];
        }

        this.applyInsertFormatting(text);

        var startWord = this.wordContainingOrdinal(start),
            endWord = this.wordContainingOrdinal(end);

        var prefix;
        if (start === startWord.ordinal) {
            if (startWord.index > 0 && !this.words[startWord.index - 1].isBreaker()) {
                startWord.index--;
                var previousWord = this.words[startWord.index];
                prefix = per({}).per(previousWord.runs, previousWord).all();
            } else {
                prefix = [];
            }
        } else {
            prefix = per({ end: startWord.offset })
                    .per(startWord.word.runs, startWord.word)
                    .all();
        }

        var suffix;
        if (end === endWord.ordinal) {
            if ((end === this.length - 1) || endWord.word.isBreaker()) {
                suffix = [];
                endWord.index--;
            } else {
                suffix = per({}).per(endWord.word.runs, endWord.word).all();
            }
        } else {
            suffix = per({ start: endWord.offset })
                    .per(endWord.word.runs, endWord.word)
                    .all();
        }

        var oldLength = this.length;

        this.spliceWordsWithRuns(startWord.index, (endWord.index - startWord.index) + 1,
            per(prefix).concat(text).concat(suffix).per(runs.consolidate()).all());

        return this.length - oldLength;
    },
    registerEditFilter: function(filter) {
        this.editFilters.push(filter);
    },
    width: function(width) {
        if (arguments.length === 0) {
            return this._width;
        }
        this._width = width;
        this.layout();
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
    getWordCharacters: function(index) {
        var word = this.words[index];
        var outputInfo = this._output[index];
        if (!outputInfo.characters) {
            outputInfo.characters = word.characters();
        }
        return outputInfo.characters;
    },
    getCaretCoords: function(ordinal) {
        var wordInfo = this.wordContainingOrdinal(ordinal);
        var outputInfo = this._output[wordInfo.index];
        if (wordInfo.word.isBreaker()) {
            return outputInfo.caret;
        }
        var chars = this.getWordCharacters(wordInfo.index);
        return rect(
            outputInfo.bounds.l + chars[wordInfo.offset],
            outputInfo.bounds.t, 1, outputInfo.bounds.h
        );
    },
    byCoordinate: function(x, y) {
        var closest = null, distance;
        this.bands(y, y)[0].some(function(outputInfo) {
            var pos = outputInfo.bounds;
            if (pos.t <= y && pos.b >= y) {
                var d = (x >= pos.l && x < pos.r) ? -1 :
                    Math.min(Math.abs(x - pos.l),
                             Math.abs(x - pos.r));
                if (!closest || d < distance) {
                    closest = outputInfo;
                    distance = d;
                }
                if (distance < 0) {
                    return true;
                }
            }
        });
        if (!closest) {
            return this.length - 1;
        }
        var baseOrdinal = this.wordOrdinal(closest.index);
        if (this.words[closest.index].code) {
            return baseOrdinal;
        }
        if (x < closest.caret.l) {
            return baseOrdinal;
        }
        var chars = this.getWordCharacters(closest.index);
        var last = chars.length - 1;
        for (var c = 0; c <= last; c++) {
            var l = closest.bounds.l + chars[c];
            var r = c < last ? (closest.bounds.l + chars[c + 1]) : closest.bounds.r;
            var m = (l + r) / 2;
            if (x >= l && x < r) {
                return baseOrdinal + c + (x > m ? 1 : 0);
            }
        }
        // must be right of last character
        return baseOrdinal + chars.length;
    },
    draw: function(ctx, viewPortTop, viewPortBottom) {
        var self = this;
        this._output.forEach(function(outputInfo, index) {
            if (outputInfo.draw) {
                outputInfo.draw(ctx);
            } else {
                var word = self.words[index];
                word.draw(ctx, outputInfo.bounds.l, outputInfo.baseline);
            }
        });
    },
    drawSelection: function(ctx, hasFocus) {
        if (this.selection.end === this.selection.start) {
            if (this.selectionJustChanged || hasFocus && this.caretVisible) {
                var caret = this.getCaretCoords(this.selection.start);
                if (caret) {
                    ctx.save();
                    ctx.fillStyle = 'black';
                    caret.fill(ctx);
                    ctx.restore();
                }
            }
        } else {
            ctx.save();
            ctx.fillStyle = hasFocus ? 'rgba(0, 100, 200, 0.3)' : 'rgba(160, 160, 160, 0.3)';

            var startWord = this.wordContainingOrdinal(this.selection.start),
                endWord = this.wordContainingOrdinal(this.selection.end),
                startIndex = startWord.index, endIndex = endWord.index, b, c;

            if (startWord.index === endWord.index) {
                var cs = this.getWordCharacters(startWord.index),
                    c1 = cs[startWord.offset], c2 = cs[endWord.offset];
                b = this._output[startWord.index].bounds;
                rect(b.l + c1, b.t, c2 - c1, b.h).fill(ctx);
            } else {
                if (startWord.offset > 0) {
                    startIndex++;
                    b = this._output[startWord.index].bounds;
                    c = this.getWordCharacters(startWord.index)[startWord.offset];
                    rect(b.l + c, b.t, b.r - (b.l + c), b.h).fill(ctx);
                }
                for (var i = startIndex; i < endIndex; i++) {
                    this._output[i].bounds.fill(ctx);
                }
                if (endWord.offset > 0) {
                    b = this._output[endWord.index].bounds;
                    c = this.getWordCharacters(endWord.index)[endWord.offset];
                    rect(b.l, b.t, c, b.h).fill(ctx);
                }
            }

            ctx.restore();
        }
    },
    notifySelectionChanged: function(takeFocus) {
        // When firing selectionChanged, we pass a function can be used
        // to obtain the formatting, as this highly likely to be needed
        var cachedFormatting = null;
        var self = this;
        var getFormatting = function() {
            if (!cachedFormatting) {
                cachedFormatting = self.selectedRange().getFormatting();
            }
            return cachedFormatting;
        };
        this.selectionChanged.fire(getFormatting, takeFocus);
    },
    select: function(ordinal, ordinalEnd, takeFocus) {
        this.selection.start = Math.max(0, ordinal);
        this.selection.end = Math.min(
            typeof ordinalEnd === 'number' ? ordinalEnd : this.selection.start,
            this.length
        );
        this.selectionJustChanged = true;
        this.caretVisible = true;
        this.nextInsertFormatting = {};

        /*  NB. always fire this even if the positions stayed the same. The
            event means that the formatting of the selection has changed
            (which can happen either by moving the selection range or by
            altering the formatting)
        */
        this.notifySelectionChanged(takeFocus);
    },
    performUndo: function(redo) {
        var fromStack = redo ? this.redo : this.undo,
            toStack = redo ? this.undo : this.redo,
            oldCommand = fromStack.pop();

        if (oldCommand) {
            oldCommand(function(newCommand) {
                toStack.push(newCommand);
            });
            this.layout();
            this.contentChanged.fire();
        }
    },
    canUndo: function(redo) {
        return redo ? !!this.redo.length : !!this.undo.length;
    },
    transaction: function(perform) {
        if (this._currentTransaction) {
            perform(this._currentTransaction);
        } else {
            var self = this;
            while (this.undo.length > 50) {
                self.undo.shift();
            }
            this.redo.length = 0;
            var changed = false;
            var trans = makeTransaction(function(log) {
                self._currentTransaction = log;
                try {
                    perform(log);
                } finally {
                    changed = log.nonEmptyTransaction;
                    self._currentTransaction = null;
                }
            });
            if (changed) {
                this.undo.push(trans);
                self.layout();
                self.contentChanged.fire();
            }
        }
    },
    type: 'document'
};

module.exports = function() {
    var doc = Object.create(prototype);
    doc._width = 0;
    doc.selection = { start: 0, end: 0 };
    doc.caretVisible = true;
    doc.customCodes = function(code, data, allCodes) {};
    doc.codes = function(code, data) {
        var instance = codes(code, data, doc.codes);
        return instance || doc.customCodes(code, data, doc.codes);
    };
    doc.selectionChanged = util.event();
    doc.contentChanged = util.event();
    doc.editFilters = [codes.editFilter];
    doc.load([]);
    return doc;
};
