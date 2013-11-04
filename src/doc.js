var per = require('per');
var characters = require('./characters');
var split = require('./split');
var wrap = require('./wrap');
var word = require('./word');
var node = require('./node');
var runs = require('./runs');
var measure = require('./measure');
var range = require('./range');
var util = require('./util');

var wordCharRuns = function(positionedWord) {
    return positionedWord.children().map(function(char) {
        return char.part.run;
    });
};

var makeEditCommand = function(doc, start, count, words) {
    var selStart = doc.selection.start, selEnd = doc.selection.end;
    return function(redo) {
        var oldWords = Array.prototype.splice.apply(doc.words, [start, count].concat(words));
        var stack = doc[redo ? 'redo' : 'undo'];
        while (stack.length > 50) {
            stack.shift();
        }
        stack.push(makeEditCommand(doc, start, words.length, oldWords));
        doc.layout();
        doc.contentChanged.fire();
        doc.select(selStart, selEnd);
    };
};

var prototype = node.derive({
    load: function(runs) {
        var self = this;
        this.undo = [];
        this.redo = [];
        this.words = per(characters(runs)).per(split()).map(function(w) {
            return word(w, self.inlines);
        }).all();
        this.layout();
        this.contentChanged.fire();
        this.select(0, 0);
    },
    layout: function() {
        this.lines = per(this.words).per(wrap(this._width, this)).all();
        var lastLine = this.last();
        this.height = !lastLine ? 0 : lastLine.baseline + lastLine.descent;
    },
    plainText: function() {
        return this.words.map(function(word) {
            return word.plainText;
        }).join('');
    },
    runs: function(emit) {
        this.lines.forEach(function(line) {
            line.runs(emit);
        });
    },
    range: function(start, end) {
        return range(this, start, end);
    },
    documentRange: function() {
        return this.range(0, this.length());
    },
    selectedRange: function() {
        return this.range(this.selection.start, this.selection.end);
    },
    save: function() {
        return this.documentRange().save();
    },
    paragraphRange: function(start, end) {
        // find the character after the nearest newline before start
        var ch = this.characterByOrdinal(start), word;
        if (ch) {
            word = ch.word;
            while (word.ordinal > 0) {
                var prev = word.previous();
                if (prev.word.isNewLine()) {
                    break;
                }
                word = prev;
            }
            start = word.ordinal;
        }
        // find the nearest newline after end
        ch = this.characterByOrdinal(end);
        if (ch) {
            word = ch.word;
            while (!word.word.isNewLine()) {
                word = word.next();
            }
            end = word.ordinal;
        }
        return this.range(start, end);
    },
    insert: function(text) {
        this.select(this.selection.end + this.selectedRange().setText(text));
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
    splice: function(start, end, text) {
        var startChar = this.characterByOrdinal(start),
            endChar = start === end ? startChar : this.characterByOrdinal(end);
        if (typeof text === 'string') {
            text = [
                Object.create((startChar.previous() || startChar).part.run, {
                    text: { value: text }
                })
            ];
        } else if (!Array.isArray(text)) {
            text = [{ text: text }];
        }

        this.applyInsertFormatting(text);

        var startWord = startChar.parent();
        var startWordIndex = this.words.indexOf(startWord.word);
        var startWordChars = wordCharRuns(startWord);

        var endWord = endChar.parent();
        var endWordIndex = endWord === startWord ? startWordIndex : this.words.indexOf(endWord.word);
        var endWordChars = endWord === startWord ? startWordChars : wordCharRuns(endWord);

        var prefix;
        if (startChar.ordinal === startWord.ordinal) {
            var previousWord = startWord.previous();
            if (previousWord) {
                prefix = wordCharRuns(previousWord);
                startWordIndex--;
            } else {
                prefix = [];
            }
        } else {
            prefix = startWordChars.slice(0, startChar.ordinal - startWord.ordinal);
        }

        var suffix;
        if (endChar.ordinal === endWord.ordinal) {
            if (endChar.ordinal === this.length()) {
                suffix = [];
                endWordIndex--;
            } else {
                suffix = wordCharRuns(endWord);
            }
        } else {
            suffix = endWordChars.slice(endChar.ordinal - endWord.ordinal);
        }

        var self = this;
        var oldLength = this.length();
        var newRuns = per(prefix).concat(text).concat(suffix).per(runs.consolidate()).all();
        var newWords = per(characters(newRuns))
            .per(split())
            .truthy()
            .map(function(w) {
                return word(w, self.inlines);
            })
            .all();

        this.redo.length = 0;
        makeEditCommand(this, startWordIndex, (endWordIndex - startWordIndex) + 1, newWords)();
        return this.length() - oldLength;
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
        var lastLine = this.last();
        return !lastLine ? 0 : lastLine.last().last().ordinal;
    },
    draw: function(ctx, bottom) {
        bottom = bottom || Number.MAX_VALUE;
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
    drawSelection: function(ctx, hasFocus) {
        if (this.selection.end === this.selection.start) {
            if (this.selectionJustChanged || hasFocus && this.caretVisible) {
                var char = this.characterByOrdinal(this.selection.start);
                if (char) {
                    var charBounds = char.bounds(),
                        lineBounds = char.word.line.bounds(true);
                    ctx.beginPath();
                    ctx.moveTo(charBounds.l, lineBounds.t);
                    ctx.lineTo(charBounds.l, lineBounds.t + lineBounds.h);
                    ctx.stroke();
                }
            }
        } else {
            ctx.save();
            ctx.fillStyle = hasFocus ? 'rgba(0, 100, 200, 0.3)' : 'rgba(160, 160, 160, 0.3)';
            this.selectedRange().parts(function(part) {
                var b = part.bounds(true);
                ctx.fillRect(b.l, b.t, b.w, b.h);
            });
            ctx.restore();
        }
    },
    notifySelectionChanged: function() {
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
        this.selectionChanged.fire(getFormatting);
    },
    select: function(ordinal, ordinalEnd, forceEvent) {
        var oldStart = this.selection.start, oldEnd = this.selection.end;
        this.selection.start = Math.max(0, ordinal);
        this.selection.end = Math.min(
            typeof ordinalEnd === 'number' ? ordinalEnd : this.selection.start,
            this.length()
        );
        this.selectionJustChanged = true;
        this.caretVisible = true;
        this.nextInsertFormatting = {};
        if (this.selection.start != oldStart || this.selection.end != oldEnd) {
            this.notifySelectionChanged();
        }
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
    },
    performUndo: function(redo) {
        var op = (redo ? this.redo : this.undo).pop();
        if (op) {
            op(!redo);
        }
    },
    canUndo: function(redo) {
        return redo ? !!this.redo.length : !!this.undo.length;
    }
});

exports = module.exports = function() {
    var doc = Object.create(prototype);
    doc._width = 0;
    doc.height = 0;
    doc.selection = { start: 0, end: 0 };
    doc.caretVisible = true;
    doc.inlines = function() {};
    doc.selectionChanged = util.event();
    doc.contentChanged = util.event();
    doc.load([]);
    return doc;
};
