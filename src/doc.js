var html = require('./html');
var per = require('per');
var characters = require('./characters');
var split = require('./split');
var word = require('./word');
var node = require('./node');
var runs = require('./runs');
var range = require('./range');
var util = require('./util');
var frame = require('./frame');
var codes = require('./codes');
var rect = require('./rect');
var he = require('he');
var isUrlValid = require('url-validation');

var makeEditCommand = function(doc, start, count, words) {
    var selStart = doc.selection.start, selEnd = doc.selection.end;
    return function(log) {
        doc._wordOrdinals = [];
        var oldWords = Array.prototype.splice.apply(doc.words, [start, count].concat(words));
        log(makeEditCommand(doc, start, words.length, oldWords));
        doc._nextSelection = { start: selStart, end: selEnd };
    };
};

var makeTransaction = function(perform) {
    var commands = [];
    var log = function(command) {
        commands.push(command);
        log.length = commands.length;
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

var isBreaker = function(word) {
    if (word.isNewLine()) {
        return true;
    }
    var code = word.code();
    return !!(code && (code.block || code.eof));
};

var prototype = node.derive({
    load: function(value, takeFocus) {
        if ( !this.defaultFormatting ) {
            throw new Error( 'defaultFormatting for carota editor is not set' );
        }
        var runs;
        if ( value === '' ) {
            runs = [{ text: '' }];
        } else if( typeof value === 'string' ) {
            runs = html.parse( value, this.defaultFormatting );
            /**
             * FIXME - The carota html parser adds an aditional new line element
             * for P tags and also adds a newline to the last text value depending on the
             * html string.
             * <p>hi</p>   ->  [{ text: 'hi/n' }]
             * <p><span>hi</span></p><p><span>hi</span></p>   ->  [{ text: 'hi' }, { text: '\n' }],[{ text: 'hi' }, { text: '\n' }]
             */
            var last = runs[ runs.length  - 1 ];
            if ( last.text === '\n'  ) {
                runs.splice( -1, 1 );
            }
            if ( runs.length > 0 ) {
                last = runs[ runs.length  - 1 ];
                if ( last.text ) {
                    last.text = last.text.trimRight();
                }
            }
        } else {
            runs = value.map(function (run) {
                return Object.assign({}, run);
            });
        }

        var self = this;
        this.undo = [];
        this.redo = [];
        this._wordOrdinals = [];
        this.words = per(characters(runs)).per(split(self.codes)).map(function(w) {
            return word( self.defaultFormatting, w, self.codes);
        }).all();
        this.layout();
        this.contentChanged.fire();
        this.select(0, 0, takeFocus);
    },
    layout: function(takeFocus) {
        this.frame = null;
        try {
            this.frame = per(this.words).per(frame(0, 0, this._width, 0, this)).first();
        } catch (x) {
            console.error(x);
        }
        if (!this.frame) {
            console.error('A bug somewhere has produced an invalid state - rolling back');
            this.performUndo();
        } else if (this._nextSelection) {
            var next = this._nextSelection;
            delete this._nextSelection;
            this.select(next.start, next.end,takeFocus);
        }
    },
    range: function(start, end) {
        return range(this, start, end);
    },
    documentRange: function() {
        return this.range(0, this.frame.length - 1);
    },
    getDrawableContent: function() {
        var words = [];
        var underLines = [];        
        var strikLines = [];        
        for (let i = 0; i < this.frame.lines.length; i++) {
            var line = this.frame.lines[i];
            if ( line.positionedWords ) {
                for (let j = 0; j < line.positionedWords.length; j++) {
                    var left = line.positionedWords[j].left;
                    var word = line.positionedWords[j].word;

                    if ( !word.text.parts || !word.text.parts.length || !word.text.parts[0] ) {
                        continue;
                    }

                    for (let k = 0; k < word.text.parts.length; k++) {
                        var text = word.text.parts[k];
                        if ( text.run.underline === true ) {
                            underLines.push({
                                baseline: line.baseline,
                                width: word.width, // text width + space width,
                                left,
                                color: text.run.color || this.defaultFormatting.color,
                            })
                        }
    
                        if ( text.run.strikeout === true ) {
                            strikLines.push({
                                ascent: word.ascent,
                                baseline: line.baseline,
                                width: word.width, // text width + space width,
                                left,
                                color: text.run.color || this.defaultFormatting.color,
                            })
                        }
    
                        words.push({
                            baseline: line.baseline,
                            left,
                            content: {
                                text: he.encode( text.run.text.trim()) + '&#160;'.repeat( word.space.length ),
                                size: text.run.size || this.defaultFormatting.size,
                                font: text.run.font || this.defaultFormatting.font,
                                color: text.run.color || this.defaultFormatting.color,
                                bold: text.run.bold || this.defaultFormatting.bold,
                                italic: text.run.italic || this.defaultFormatting.italic,
                                underline: text.run.underline || this.defaultFormatting.underline,
                                strikeout: text.run.strikeout || this.defaultFormatting.strikeout,
                                align: text.run.align || this.defaultFormatting.align,
                                script: text.run.script || this.defaultFormatting.script,
                                link: text.run.link,
                            }
                        })
                        left = left + text.width;
                    }
                }
            }
            
        }
        return { words, underLines, strikLines };
    },
    getLinksData: function() {
        var links = [];        
        for (let i = 0; i < this.frame.lines.length; i++) {
            var line = this.frame.lines[i];
            if ( line.positionedWords ) {
                for (let j = 0; j < line.positionedWords.length; j++) {
                    var left = line.positionedWords[j].left;
                    var word = line.positionedWords[j].word;

                    if ( !word.text.parts || !word.text.parts.length || !word.text.parts[0] ) {
                        continue;
                    }
                    var text = word.text.parts[0];
                    for (let k = 0; k < word.text.parts.length; k++) {
                        var text = word.text.parts[k];
                        if ( text.run.link ) {
                            links.push({
                                value: text.run.link,
                                text: text.run.text,
                                x: left,
                                y: line.baseline - text.ascent,
                                width: text.width,
                                height: text.ascent + text.descent,
                            });
                        }
                        left = left + text.width;    
                    }
                }
            }
        }
        return links;
    },    
    isMultiLine: function() {
        return this.frame.lines.length > 1;
    },
    isCaretAtEnd: function() {
        return this.documentRange().end === this.selection.end;
    },
    isCaretAtStart: function() {
        return this.documentRange().start === this.selection.end;
    },
    isCaretAtLastLine: function() {
        var endCaret = this.getCaretCoords( this.documentRange().end );
        var currentCaret = this.getCurrentCaret();
        return endCaret.t === currentCaret.t;
    },
    isCaretAtFirstLine: function() {
        var startCaret = this.getCaretCoords( this.documentRange().start );
        var currentCaret = this.getCurrentCaret();
        return startCaret.t === currentCaret.t;
    },
    getCurrentCaret: function() {
        return this.getCaretCoords( this.selection.end );
    },

    getSelectionBounds: function() {
        var startCaret = this.getCaretCoords( this.selection.start );
        if ( this.selection.end === this.selection.start ) {
            return {
                x: startCaret.l,
                y: startCaret.t,
                width: 0,
                height: startCaret.h,
            };
        }
        var endCaret = this.getCaretCoords( this.selection.end );
        if ( startCaret.t === endCaret.t ) {
            return {
                x: startCaret.l,
                y: startCaret.t,
                width: endCaret.l - startCaret.l,
                height: endCaret.b - startCaret.t,
            }
        } else {
            return {
                x: 0,
                y: startCaret.t,
                width: this.frame._bounds.w,
                height: endCaret.b - startCaret.t,
            }
        }
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
        if (startInfo && !isBreaker(startInfo.word)) {
            for (i = startInfo.index; i > 0; i--) {
                if (isBreaker(this.words[i - 1])) {
                    start = this.wordOrdinal(i);
                    break;
                }
            }
        }

        // find the nearest breaker after end
        var endInfo = this.wordContainingOrdinal(end);
        end = this.frame.length - 1;
        if (endInfo && !isBreaker(endInfo.word)) {
            for (i = endInfo.index; i < this.words.length; i++) {
                if (isBreaker(this.words[i])) {
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
    modifyInsertFormatting: function(attribute, value, takeFocus) {
        this.nextInsertFormatting[attribute] = value;
        this.notifySelectionChanged(takeFocus);
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
                var o = cached > 0 ? this._wordOrdinals[cached - 1] : 0;
                for (var n = cached; n <= index; n++) {
                    this._wordOrdinals[n] = o;
                    o += this.words[n].length;
                }
            }
            return this._wordOrdinals[index];
        }
    },
    wordContainingOrdinal: function(ordinal) {
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
        var startDetails = this.wordContainingOrdinal(Math.max(0, range.start)),
            endDetails = this.wordContainingOrdinal(Math.min(range.end, this.frame.length - 1));
        if (startDetails && endDetails) {
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
        }
    },
    spliceWordsWithRuns: function(wordIndex, count, runs, takeFocus) {
        var self = this;

        var newWords = per(characters(runs))
            .per(split(self.codes))
            .truthy()
            .map(function(w) {
                return word( self.defaultFormatting, w, self.codes);
            })
            .all();

        // Check if old or new content contains any fancy control codes:
        var runFilters = false;

        if ('_filtersRunning' in self) {
            self._filtersRunning++;
        } else {
            for (var n = 0; n < count; n++) {
                if (this.words[wordIndex + n].code()) {
                    runFilters = true;
                }
            }
            if (!runFilters) {
                runFilters = newWords.some(function(word) {
                    return !!word.code();
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
        }, takeFocus);
    },
    splice: function(start, end, text, takeFocus) {

        // This if block added to fix the carota editor new line caret position is
        // not in accordance with the text alignment
        if ( this.words.length > 1 ) {
            var last = this.words[ this.words.length - 1 ];
            if ( last.text.plainText === '\n' && !last.text.parts[0].run.align ) {
                var prevTextpart =  this.words[ this.words.length - 2 ].text.parts[0];
                if ( prevTextpart && prevTextpart.run && prevTextpart.run.align ) {
                    last.text.parts[0].run.align = prevTextpart.run.align;
                }                
            }
        }

        if (typeof text === 'string') {
            var sample = Math.max(0, start - 1);
            var sampleRun = per({ start: sample, end: sample + 1 })
                .per(this.runs, this)
                .first();
            text = [
                sampleRun ? Object.create(sampleRun, { text: { value: text } }) : { text: text }
            ];
        } else if (!Array.isArray(text)) {
            text = [{ text: text }];
        }

        this.applyInsertFormatting(text);

        var startWord = this.wordContainingOrdinal(start),
            endWord = this.wordContainingOrdinal(end);

        var prefix;
        if(startWord) {
            if (start === startWord.ordinal) {
                if (startWord.index > 0 && !isBreaker(this.words[startWord.index - 1])) {
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
        }

        var suffix;
        if(endWord) {
            if (end === endWord.ordinal) {
                if ((end === this.frame.length - 1) || isBreaker(endWord.word)) {
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
        }

        var oldLength = this.frame.length;

        if(startWord && endWord) {
            this.spliceWordsWithRuns(startWord.index, (endWord.index - startWord.index) + 1,
                per(prefix).concat(text).concat(suffix).per(runs.consolidate( this.defaultFormatting )).all(), takeFocus);
        }

        return this.frame ? (this.frame.length - oldLength) : 0;
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
    children: function() {
        return [this.frame];
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
    getCaretCoords: function(ordinal) {
        var node = this.byOrdinal(ordinal), b;
        if (node) {
            if (node.block && ordinal > 0) {
                var nodeBefore = this.byOrdinal(ordinal - 1);
                if (nodeBefore.newLine) {
                    var newLineBounds = nodeBefore.bounds();
                    var lineBounds = nodeBefore.parent().parent().bounds();
                    b = rect(lineBounds.l, lineBounds.b, 1, newLineBounds.h);
                } else {
                    b = nodeBefore.bounds();
                    b = rect(b.r, b.t, 1, b.h);
                }
            } else {
                b = node.bounds();
                if (b.h) {
                    b = rect(b.l, b.t, 1, b.h);
                } else {
                    b = rect(b.l, b.t, b.w, 1);
                }
            }
            return b;
        }
    },
    byCoordinate: function(x, y) {
        var ordinal = this.frame.byCoordinate(x, y).ordinal;
        var caret = this.getCaretCoords(ordinal);
        while (caret.b <= y && ordinal < (this.frame.length - 1)) {
            ordinal++;
            caret = this.getCaretCoords(ordinal);
        }
        while (caret.t >= y && ordinal > 0) {
            ordinal--;
            caret = this.getCaretCoords(ordinal);
        }
        return this.byOrdinal(ordinal);
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
            this.selectedRange().parts(function(part) {
                part.bounds(true).fill(ctx);
            });
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
        if (!this.frame) {
            // Something has gone terribly wrong - doc.transaction will rollback soon
            return;
        }
        this.selection.start = Math.max(0, ordinal);
        this.selection.end = Math.min(
            typeof ordinalEnd === 'number' ? ordinalEnd : this.selection.start,
            this.frame.length - 1
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
    selectFrom: function( start, takeFocus ){
        this.select( start, this.frame.length - 1, takeFocus );
    },
    selectAll: function(){
        this.select( 0, this.frame.length - 1, true );
    },

    /**
     * Returns a range, to left and right, relative to the current caret position,
     * where each value of specified properties are uniform.
     * @param styles string array that specifies the properties to check
     */
    selectByProperties: function( styles ){
        const currentCaret = this.selection.start;
        const currentFormat = this.selectedRange().getFormatting();
        const middleFormat = {};
        styles.map( key => {
            middleFormat[ key ] = currentFormat[ key ];
        });        

        let left = 1;
        if ( currentCaret > 0 ) {
            let leftFormat;
            while ( currentCaret - left >= 0 ) {
                leftFormat = this.range( currentCaret - left, currentCaret ).getFormatting();   
                if ( !Object.keys( middleFormat ).every( key => middleFormat[ key ] === leftFormat[ key ])) {
                    break;
                }
                left++;
            }
        }

        let right = 1;
        if ( currentCaret < this.frame.length ) {
            let rightFormat;
            while ( currentCaret + right <= this.frame.length - 1 ) {
                rightFormat = this.range( currentCaret, currentCaret + right ).getFormatting();
                if ( !Object.keys( middleFormat ).every( key => middleFormat[ key ] === rightFormat[ key ])) {
                    break;
                }
                right++;
            }
        }
        return this.range( currentCaret - left + 1, currentCaret + right - 1 );
    },

    /**
     * This function applies the previouse value to the newly entered char.
     * replacing the link and link related styles
     */
    breakHyperlink: function () {
        var currentCaret = this.selection.start;
        var newCharRange = this.range( currentCaret - 1, currentCaret );
        var prevFormat = this.getPreviousFormat([ 'link' ], currentCaret - 1 );
        newCharRange.setFormatting( 'link', undefined, true );
        newCharRange.setFormatting( 'color', prevFormat.color, true );
        newCharRange.setFormatting( 'underline', prevFormat.underline, true );
    },

    /**
     * This function returns true if the caret is at the begining or end of a link
     */
    isCaretAtHyperlinkEdge: function () {
        if ( this.selection.start !== this.selection.end && this.frame.length < 1 ) {
            return false
        }
        if ( this.selection.start === 0 && this.range( 0, 0 ).getFormatting().link ) {
            return true;
        }
        var last = this.frame.length - 1;
        if ( this.selection.start === last && this.range( last, last ).getFormatting().link ) {
            return true;
        }
        var caret = this.selection.start;
        var leftFormat = this.range( caret, caret ).getFormatting();
        var rightFormat = this.range( caret, caret + 1 ).getFormatting();
        if ( leftFormat.link !== rightFormat.link ) {
            return true;
        }
        return false;
    },

    autoLink: function () {
        var links =this.words.filter( w => isUrlValid( w.text.plainText ));
        links.forEach( link =>  {
            link.text.parts[0].run.link = link.text.plainText;
            link.text.parts[0].run.color =  'rgb(94, 156, 211)';
            link.text.parts[0].run.underline = true;
        });
        this.notifySelectionChanged( true );
    },
    /**
     * This method is to be run immediately after enter or space key is subjected to `keyup` event.
     * This method will check if the previous word is a link and sets the link and link styles.
     */
    autolinkOnKeyup: function() {
        var currentCaret = this.selection.start;
        var wordRange = this.getLeftWordRange( currentCaret - 1 ); // -1 to skip the space or enter
        var word = wordRange.plainText();
        if ( !isUrlValid( word )){
            return;
        }
        wordRange.setFormatting( 'link', word.trim(), true );
        wordRange.setFormatting( 'color', 'rgb(94, 156, 211)', true );
        wordRange.setFormatting( 'underline', true, true );

        var spaceRange = this.range( currentCaret - 1, currentCaret );
        var prevFormat = this.getPreviousFormat([ 'link' ], currentCaret - 1 );
        spaceRange.setFormatting( 'link', undefined, true );
        spaceRange.setFormatting( 'color', prevFormat.color, true );
        spaceRange.setFormatting( 'underline', prevFormat.underline, true );
    },

    /**
     * This method returns the range of the word that is at the left side to the
     * `current` position
     */
    getLeftWordRange: function( current ) {
        let left = 1;
        if ( current > 0 ) {
            while ( current - left >= 0 ) {
                var text = this.range( current - left, current ).getFormatting().text;
                if ( !text || text === ' ' ) {
                    break;
                }
                left++;
            }
        }
        return this.range( current - left + 1, current );
    },

    /**
     * Returns the format of the previous text to the text that
     * the caret is on.
     * @param styles The styles to consider the difference
     * @param current The position of the caret
    */
    getPreviousFormat: function( styles, current ) {
        var currentFormat = this.range( current, current ).getFormatting();
        var middleFormat = {};
        styles.map( key => {
            middleFormat[ key ] = currentFormat[ key ];
        });        

        let left = 1;
        if ( current > 0 ) {
            let leftFormat;
            while ( current - left >= 0 ) {
                leftFormat = this.range( current - left, current ).getFormatting();
                if ( !Object.keys( middleFormat ).every( key => middleFormat[ key ] === leftFormat[ key ])) {
                    break;
                }
                left++;
            }
        }
        var rigth = current - left + 1;
        if ( left < 0 ) {
            return this.defaultFormatting;
        } else {
            return this.range( rigth - 1, rigth ).getFormatting();
        }
    },

    moveCaretToPoint: function( point ){
        var node = this.byCoordinate( point.x, point.y );
        this.select( node.ordinal, node.ordinal, true );
    },
    moveCaretToEnd: function(){
        this.select( this.frame.length - 1, this.frame.length - 1, true );
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
    transaction: function(perform, takeFocus) {
        if (this._currentTransaction) {
            perform(this._currentTransaction);
        } else {
            var self = this;
            while (this.undo.length > 50) {
                self.undo.shift();
            }
            this.redo.length = 0;
            var changed = false;
            this.undo.push(makeTransaction(function(log) {
                self._currentTransaction = log;
                try {
                    perform(log);
                } finally {
                    changed = log.length > 0;
                    self._currentTransaction = null;
                }
            }));
            if (changed) {
                self.layout(takeFocus);
                self.contentChanged.fire();
            }
        }
    },
    type: 'document'
});

exports = module.exports = function( defaultFormatting ) {
    var doc = Object.create(prototype);
    doc.defaultFormatting = defaultFormatting;
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
    doc.setDefaultStyles = function( val ){
        doc.defaultFormatting = val;
    }
    return doc;
};
