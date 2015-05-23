var per = require('per');
var carotaDoc = require('./doc');
var dom = require('./dom');
var rect = require('./rect');

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
        '<div class="carotaSpacer">' +
            '<canvas width="100" height="100" class="carotaEditorCanvas" style="position: absolute;"></canvas>' +
        '</div>' +
        '<div class="carotaTextArea" style="overflow: hidden; position: absolute; height: 0;">' +
            '<textarea autocorrect="off" autocapitalize="off" spellcheck="false" tabindex="0" ' +
            'style="position: absolute; padding: 0px; width: 1000px; height: 1em; ' +
            'outline: none; font-size: 4px;"></textarea>'
        '</div>';

    var canvas = element.querySelector('canvas'),
        spacer = element.querySelector('.carotaSpacer'),
        textAreaDiv = element.querySelector('.carotaTextArea'),
        textArea = element.querySelector('textarea'),
        doc = carotaDoc(),
        keyboardSelect = 0,
        keyboardX = null, nextKeyboardX = null,
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

    var exhausted = function(ordinal, direction) {
        return direction < 0 ? ordinal <= 0 : ordinal >= doc.frame.length - 1;
    };

    var differentLine = function(caret1, caret2) {
        return (caret1.b <= caret2.t) ||
               (caret2.b <= caret1.t);
    };

    var changeLine = function(ordinal, direction) {

        var originalCaret = doc.getCaretCoords(ordinal), newCaret;
        nextKeyboardX = (keyboardX !== null) ? keyboardX : originalCaret.l;

        while (!exhausted(ordinal, direction)) {
            ordinal += direction;
            newCaret = doc.getCaretCoords(ordinal);
            if (differentLine(newCaret, originalCaret)) {
                break;
            }
        }

        originalCaret = newCaret;
        while (!exhausted(ordinal, direction)) {
            if ((direction > 0 && newCaret.l >= nextKeyboardX) ||
                (direction < 0 && newCaret.l <= nextKeyboardX)) {
                break;
            }

            ordinal += direction;
            newCaret = doc.getCaretCoords(ordinal);
            if (differentLine(newCaret, originalCaret)) {
                ordinal -= direction;
                break;
            }
        }

        return ordinal;
    };

    var endOfline = function(ordinal, direction) {
        var originalCaret = doc.getCaretCoords(ordinal), newCaret;
        while (!exhausted(ordinal, direction)) {
            ordinal += direction;
            newCaret = doc.getCaretCoords(ordinal);
            if (differentLine(newCaret, originalCaret)) {
                ordinal -= direction;
                break;
            }
        }
        return ordinal;
    };

    var handleKey = function(key, selecting, ctrlKey) {
        var start = doc.selection.start,
            end = doc.selection.end,
            length = doc.frame.length - 1,
            handled = false;

        nextKeyboardX = null;

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

        var changingCaret = false;
        switch (key) {
            case 37: // left arrow
                if (!selecting && start != end) {
                    ordinal = start;
                } else {
                    if (ordinal > 0) {
                        if (ctrlKey) {
                            var wordInfo = doc.wordContainingOrdinal(ordinal);
                            if (wordInfo.ordinal === ordinal) {
                                ordinal = wordInfo.index > 0 ? doc.wordOrdinal(wordInfo.index - 1) : 0;
                            } else {
                                ordinal = wordInfo.ordinal;
                            }
                        } else {
                            ordinal--;
                        }
                    }
                }
                changingCaret = true;
                break;
            case 39: // right arrow
                if (!selecting && start != end) {
                    ordinal = end;
                } else {
                    if (ordinal < length) {
                        if (ctrlKey) {
                            var wordInfo = doc.wordContainingOrdinal(ordinal);
                            ordinal = wordInfo.ordinal + wordInfo.word.length;
                        } else {
                            ordinal++;
                        }
                    }
                }
                changingCaret = true;
                break;
            case 40: // down arrow - find character below
                ordinal = changeLine(ordinal, 1);
                changingCaret = true;
                break;
            case 38: // up - find character above
                ordinal = changeLine(ordinal, -1);
                changingCaret = true;
                break;
            case 36: // start of line
                ordinal = endOfline(ordinal, -1);
                changingCaret = true;
                break;
            case 35: // end of line
                ordinal = endOfline(ordinal, 1);
                changingCaret = true;
                break;
            case 33: // page up
                ordinal = 0;
                changingCaret = true;
                break;
            case 34: // page down
                ordinal = length;
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
                    doc.select(0, length);
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

        keyboardX = nextKeyboardX;
        return handled;
    };

    dom.handleEvent(textArea, 'keydown', function(ev) {
        if (handleKey(ev.keyCode, ev.shiftKey, ev.ctrlKey)) {
            return false;
        }
        console.log(ev.which);
    });

    var verticalAlignment = 'top';
    
    doc.setVerticalAlignment = function(va) {
        verticalAlignment = va;
        paint();
    }

    function getVerticalOffset() {
        var docHeight = doc.frame.bounds().h;
        if (docHeight < element.clientHeight) { 
            switch (verticalAlignment) {
                case 'middle':
                    return (element.clientHeight - docHeight) / 2;
                case 'bottom':
                    return element.clientHeight - docHeight;
            }
        }
        return 0;
    }

    var paint = function() {

        var availableWidth = element.clientWidth * 1; // adjust to 0.5 to see if we draw in the wrong places!
        if (doc.width() !== availableWidth) {
            doc.width(availableWidth);
        }

        var docHeight = doc.frame.bounds().h;

        var dpr = Math.max(1, window.devicePixelRatio || 1);
        
        var logicalWidth = Math.max(doc.frame.actualWidth(), element.clientWidth),
            logicalHeight = element.clientHeight;
        
        canvas.width = dpr * logicalWidth;
        canvas.height = dpr * logicalHeight;
        canvas.style.width = logicalWidth + 'px';
        canvas.style.height = logicalHeight + 'px';
        
        canvas.style.top = element.scrollTop + 'px';
        spacer.style.width = logicalWidth + 'px';
        spacer.style.height = Math.max(docHeight, element.clientHeight) + 'px';

        if (docHeight < (element.clientHeight - 50) &&
            doc.frame.actualWidth() <= availableWidth) {
            element.style.overflow = 'hidden';
        } else {
            element.style.overflow = 'auto';
        }

        var ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, logicalWidth, logicalHeight);
        ctx.translate(0, getVerticalOffset() - element.scrollTop);
        
        doc.draw(ctx, rect(0, element.scrollTop, logicalWidth, logicalHeight));
        doc.drawSelection(ctx, selectDragStart || (document.activeElement === textArea));
    };

    dom.handleEvent(element, 'scroll', paint);

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
        var endChar = doc.byOrdinal(focusChar);
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
            var scrollRightBy = Math.max(0, bounds.l -
                (element.scrollLeft + element.clientWidth));
            if (scrollRightBy) {
                element.scrollLeft += scrollRightBy;
            }
            var scrollLeftBy = Math.max(0, element.scrollLeft - bounds.l);
            if (scrollLeftBy) {
                element.scrollLeft -= scrollLeftBy;
            }
        }
        textAreaContent = doc.selectedRange().plainText();
        textArea.value = textAreaContent;
        textArea.select();

        setTimeout(function() {
            textArea.focus();
        }, 10);
    };

    doc.selectionChanged(function(getformatting, takeFocus) {
        paint();
        if (!selectDragStart) {
            if (takeFocus !== false) {
                updateTextArea();
            }
        }
    });

    function registerMouseEvent(name, handler) {
        dom.handleMouseEvent(spacer, name, function(ev, x, y) {
            handler(doc.byCoordinate(x, y - getVerticalOffset()));
        });
    }

    registerMouseEvent('mousedown', function(node) {
        selectDragStart = node.ordinal;
        doc.select(node.ordinal, node.ordinal);
        keyboardX = null;
    });

    registerMouseEvent('dblclick', function(node) {
        node = node.parent();
        if (node) {
            doc.select(node.ordinal, node.ordinal +
                (node.word ? node.word.text.length : node.length));
        }
    });

    registerMouseEvent('mousemove', function(node) {
        if (selectDragStart !== null) {
            if (node) {
                focusChar = node.ordinal;
                if (selectDragStart > node.ordinal) {
                    doc.select(node.ordinal, selectDragStart);
                } else {
                    doc.select(selectDragStart, node.ordinal);
                }
            }
        }
    });

    registerMouseEvent('mouseup', function(node) {
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
