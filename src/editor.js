var per = require('per');
var carotaDoc = require('./doc');
var dom = require('./dom');

setInterval(function() {
    var editors = document.querySelectorAll('.carotaEditorCanvas');

    var ev = document.createEvent('Event');
    ev.initEvent('carotaEditorSharedTimer', true, true);

    // not in IE, apparently:
    // var ev = new CustomEvent('carotaEditorSharedTimer');

    for (var n = 0; n < editors.length; n++) {
        editors[n].dispatchEvent(ev);
    }
}, 200);

exports.create = function(element) {

    // We need the host element to be a container:
    if (dom.effectiveStyle(element, 'position') !== 'absolute') {
        element.style.position = 'relative';
    }

    element.innerHTML =
        '<canvas width="100" height="100" class="carotaEditorCanvas"></canvas>' +
        '<div style="overflow: hidden; position: absolute; height: 0;">' +
            '<textarea autocorrect="off" autocapitalize="off" spellcheck="false" tabindex="0" ' +
            'style="position: absolute; padding: 0px; width: 1000px; height: 1em; ' +
            'outline: none; font-size: 4px;"></textarea>'
        '</div>';

    var canvas = element.querySelector('canvas'),
        textAreaDiv = element.querySelector('div'),
        textArea = element.querySelector('textarea'),
        doc = carotaDoc(),
        keyboardSelect = 0,
        keyboardX = null,
        hoverChar,
        selectDragStart = null,
        focusChar = null,
        textAreaContent = '',
        richClipboard = null,
        plainClipboard = null;

    var toggles = {
        66: 'bold',
        73: 'italic',
        85: 'underline',
        83: 'strikeout'
    };

    var handleKey = function(key, selecting, ctrlKey) {
        var start = doc.selection.start,
            end = doc.selection.end,
            length = doc.length();

        var handled = false;

        if (!selecting) {
            keyboardSelect = 0;
        } else if (!keyboardSelect) {
            switch (key) {
                case 37: // left arrow
                case 38: // up - find character above
                case 36: // start of line
                case 33: // page up
                    keyboardSelect = -1;
                    break;
                case 39: // right arrow
                case 40: // down arrow - find character below
                case 35: // end of line
                case 34: // page down
                    keyboardSelect = 1;
                    break;
            }
        }

        var ordinal = keyboardSelect === 1 ? end : start;

        var changeLine = function(direction, limit) {
            var char = doc.characterByOrdinal(ordinal);
            if (char) {
                if (keyboardX === null) {
                    var charBounds = char.bounds();
                    keyboardX = charBounds.l + (charBounds.w / 2);
                }
                keyboardX = Math.min(Math.max(keyboardX, 0), doc.width() - 1);

                var nextLine = char.parent().parent()[direction]();
                if (!nextLine) {
                    ordinal = limit;
                } else {
                    var lineBounds = nextLine.bounds();
                    var y = lineBounds.t + (lineBounds.h / 2);
                    var hit = doc.characterByCoordinate(keyboardX, y);
                    if (hit) {
                        if (ordinal === hit.ordinal) {
                            ordinal += (direction === 'next' ? 1 : -1);
                        } else {
                            ordinal = hit.ordinal;
                        }
                    }
                }
            }
        };

        var changingCaret = false;
        switch (key) {
            case 37: // left arrow
                if (!selecting && start != end) {
                    ordinal = start;
                } else {
                    if (ordinal > 0) {
                        if (ctrlKey) {
                            var c = doc.characterByOrdinal(ordinal);
                            if (c.ordinal === c.word.ordinal) {
                                ordinal = c.word.previous().ordinal;
                            } else {
                                ordinal = c.word.ordinal;
                            }
                        } else {
                            ordinal--;
                        }
                    }
                }
                keyboardX = null;
                changingCaret = true;
                break;
            case 39: // right arrow
                if (!selecting && start != end) {
                    ordinal = end;
                } else {
                    if (ordinal < length) {
                        if (ctrlKey) {
                            ordinal = doc.characterByOrdinal(ordinal).word.next().ordinal;
                        } else {
                            ordinal++;
                        }
                    }
                }
                keyboardX = null;
                changingCaret = true;
                break;
            case 40: // down arrow - find character below
                changeLine('next', length);
                changingCaret = true;
                break;
            case 38: // up - find character above
                changeLine('previous', 0);
                changingCaret = true;
                break;
            case 36: // start of line
                ordinal = doc.characterByOrdinal(ordinal).word.line.ordinal;
                changingCaret = true;
                break;
            case 35: // end of line
                ordinal = doc.characterByOrdinal(ordinal).word.line.last().last().ordinal;
                changingCaret = true;
                break;
            case 33: // page up
                ordinal = 0;
                changingCaret = true;
                break;
            case 34: // page down
                ordinal = doc.length();
                changingCaret = true;
                break;
            case 8: // backspace
                if (start === end && start > 0) {
                    doc.range(start - 1, start).clear();
                    focusChar = start - 1;
                    doc.select(focusChar, focusChar);
                    handled = true;
                }
                break;
            case 46: // del
                if (start === end && start < length) {
                    doc.range(start, start + 1).clear();
                    handled = true;
                }
                break;
            case 90: // Z undo
                if (ctrlKey) {
                    handled = true;
                    doc.performUndo();
                }
                break;
            case 89: // Y undo
                if (ctrlKey) {
                    handled = true;
                    doc.performUndo(true);
                }
                break;
            case 65: // A select all
                if (ctrlKey) {
                    handled = true;
                    doc.select(0, doc.length());
                }
                break;
            case 67: // C - copy to clipboard
            case 88: // X - cut to clipboard
                if (ctrlKey) {
                    // Allow standard handling to take place as well
                    richClipboard = doc.selectedRange().save();
                    plainClipboard = doc.selectedRange().plainText();
                }
                break;
        }

        var toggle = toggles[key];
        if (ctrlKey && toggle) {
            var selRange = doc.selectedRange();
            selRange.setFormatting(toggle, selRange.getFormatting()[toggle] !== true);
            paint();
            handled = true;
        }

        if (changingCaret) {
            switch (keyboardSelect) {
                case 0:
                    start = end = ordinal;
                    break;
                case -1:
                    start = ordinal;
                    break;
                case 1:
                    end = ordinal;
                    break;
            }

            if (start === end) {
                keyboardSelect = 0;
            } else {
                if (start > end) {
                    keyboardSelect = -keyboardSelect;
                    var t = end;
                    end = start;
                    start = t;
                }
            }
            focusChar = ordinal;
            doc.select(start, end);
            handled = true;
        }

        return handled;
    };

    dom.handleEvent(textArea, 'keydown', function(ev) {
        if (handleKey(ev.keyCode, ev.shiftKey, ev.ctrlKey)) {
            return false;
        }
        console.log(ev.which);
    });

    var paint = function() {

        if (doc.width() !== element.clientWidth) {
            doc.width(element.clientWidth);
        }

        canvas.width = element.clientWidth;
        canvas.height = Math.max(doc.height, element.clientHeight);
        if (doc.height < element.clientHeight) {
            element.style.overflow = 'hidden';
        } else {
            element.style.overflow = 'auto';
        }
        if (element.clientWidth < canvas.width) {
            doc.width(element.clientWidth);
        }

        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        doc.draw(ctx);
        doc.drawSelection(ctx, selectDragStart || (document.activeElement === textArea));
    };

    dom.handleEvent(textArea, 'input', function() {
        var newText = textArea.value;
        if (textAreaContent != newText) {
            textAreaContent = '';
            textArea.value = '';
            if (newText === plainClipboard) {
                newText = richClipboard;
            }
            doc.insert(newText);
        }
    });

    var updateTextArea = function() {
        focusChar = focusChar === null ? doc.selection.end : focusChar;
        var endChar = doc.characterByOrdinal(focusChar);
        focusChar = null;
        if (endChar) {
            var bounds = endChar.bounds();
            textAreaDiv.style.left = bounds.l + 'px';
            textAreaDiv.style.top = bounds.t + 'px';
            textArea.focus();
            var scrollDownBy = Math.max(0, bounds.t + bounds.h -
                    (element.scrollTop + element.clientHeight));
            if (scrollDownBy) {
                element.scrollTop += scrollDownBy;
            }
            var scrollUpBy = Math.max(0, element.scrollTop - bounds.t);
            if (scrollUpBy) {
                element.scrollTop -= scrollUpBy;
            }
        }
        textAreaContent = doc.selectedRange().plainText();
        textArea.value = textAreaContent;
        textArea.select();

        setTimeout(function() {
            textArea.focus();
        }, 10);
    };

    doc.selectionChanged(function() {
        paint();
        if (!selectDragStart) {
            updateTextArea();
        }
    });

    dom.handleMouseEvent(canvas, 'mousedown', function(ev, x, y) {
        var char = doc.characterByCoordinate(x, y);
        selectDragStart = char.ordinal;
        doc.select(char.ordinal, char.ordinal);
    });

    dom.handleMouseEvent(canvas, 'dblclick', function(ev, x, y) {
        var char = doc.characterByCoordinate(x, y);
        doc.select(char.word.ordinal, char.word.ordinal + char.word.word.text.length);
    });

    var areCharsEqual = function(a, b) {
        return a ? (b && a.ordinal == b.ordinal) : !b;
    };

    dom.handleMouseEvent(canvas, 'mousemove', function(ev, x, y) {
        if (selectDragStart !== null) {
            var newHoverChar = doc.characterByCoordinate(x, y, true);
            if (!areCharsEqual(hoverChar, newHoverChar)) {
                hoverChar = newHoverChar;
                if (hoverChar) {
                    focusChar = hoverChar.ordinal;
                    if (selectDragStart > hoverChar.ordinal) {
                        doc.select(hoverChar.ordinal, selectDragStart);
                    } else {
                        doc.select(selectDragStart, hoverChar.ordinal);
                    }
                }
            }
        }
    });

    dom.handleMouseEvent(canvas, 'mouseup', function(ev, x, y) {
        selectDragStart = null;
        keyboardX = null;
        updateTextArea();
        textArea.focus();
    });

    var nextCaretToggle = new Date().getTime(),
        focused = false,
        cachedWidth = element.clientWidth,
        cachedHeight = element.clientHeight;

    var update = function() {
        var requirePaint = false;
        var newFocused = document.activeElement === textArea;
        if (focused !== newFocused) {
            focused = newFocused;
            requirePaint = true;
        }

        var now = new Date().getTime();
        if (now > nextCaretToggle) {
            nextCaretToggle = now + 500;
            if (doc.toggleCaret()) {
                requirePaint = true;
            }
        }

        if (element.clientWidth !== cachedWidth ||
            element.clientHeight !== cachedHeight) {
            requirePaint = true;
            cachedWidth =element.clientWidth;
            cachedHeight = element.clientHeight;
        }

        if (requirePaint) {
            paint();
        }
    };

    dom.handleEvent(canvas, 'carotaEditorSharedTimer', update);
    update();

    doc.sendKey = handleKey;
    return doc;
};
