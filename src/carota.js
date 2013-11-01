var per = require('per');
var doc = require('./doc');

var sampleText = require('./sampleText');

$(function() {

    var carotaElement = $('#carota');
    if (carotaElement.css('position') != 'absolute') {
        carotaElement.css('position', 'relative');
    }

    var canvas = $('<canvas width="500" height="1500"></canvas>'),
        textAreaDiv = $('<div style="overflow: hidden; position: absolute; height: 0;"></div>'),
        textArea = $('<textarea autocorrect="off" autocapitalize="off" spellcheck="false" tabindex="0" ' +
                        'style="position: absolute; padding: 0px; width: 1000px; height: 1em; ' +
                            'outline: none; font-size: 4px;"></textarea>');

    textAreaDiv.append(textArea);
    carotaElement.append(canvas, textAreaDiv);

    var ctx = canvas[0].getContext('2d');

    var carotaDocument = doc();
    carotaDocument.width(canvas[0].width);
    carotaDocument.load(sampleText);

    var focus = function() {
        setTimeout(function() {
            textArea.focus();
        }, 10);
    };

    var keyboardSelect = 0, keyboardX = null;

    textArea.keydown(function(ev) {
        var start = carotaDocument.selection.start,
            end = carotaDocument.selection.end,
            length = carotaDocument.length();

        var key = ev.which;
        var selecting = !!ev.shiftKey;
        var handled = false;
        if (!selecting) {
            keyboardSelect = 0;
        } else if (!keyboardSelect) {
            switch (key) {
                case 37: // left arrow
                case 38: // up - find character above
                    keyboardSelect = -1;
                    break;
                case 39: // right arrow
                case 40: // down arrow - find character below
                    keyboardSelect = 1;
                    break;
            }
        }

        var ordinal = keyboardSelect === 1 ? end : start;

        var changeLine = function(direction, limit) {
            var char = carotaDocument.characterByOrdinal(ordinal);
            if (char) {
                if (keyboardX === null) {
                    var charBounds = char.bounds();
                    keyboardX = charBounds.l + (charBounds.w / 2);
                }
                var nextLine = char.parent().parent()[direction]();
                if (!nextLine) {
                    ordinal = limit;
                } else {
                    var lineBounds = nextLine.bounds();
                    var y = lineBounds.t + (lineBounds.h / 2);
                    var hit = carotaDocument.characterByCoordinate(keyboardX, y);
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

        switch (ev.which) {
            case 37: // left arrow
                if (!selecting && start != end) {
                    ordinal = start;
                } else {
                    if (ordinal > 0) {
                        ordinal--;
                    }
                }
                keyboardX = null;
                handled = true;
                break;
            case 39: // right arrow
                if (!selecting && start != end) {
                    ordinal = end;
                } else {
                    if (ordinal < length) {
                        ordinal++;
                    }
                }
                keyboardX = null;
                handled = true;
                break;
            case 40: // down arrow - find character below
                changeLine('next', length);
                handled = true;
                break;
            case 38: // up - find character above
                changeLine('previous', 0);
                handled = true;
                break;
        }

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
        select(start, end);

        console.log(ev.which);
    });

    var paint = function() {

        ctx.clearRect(0, 0, canvas[0].width, canvas[0].height);

        carotaDocument.draw(ctx, canvas[0].height);
        carotaDocument.drawSelection(ctx);

        ctx.beginPath();
        ctx.moveTo(carotaDocument.width(), 0);
        ctx.lineTo(carotaDocument.width(), canvas[0].height);
        ctx.stroke();
    };

    var hoverChar, selectDragStart = null, focusChar = null, textAreaContent = '';

    textArea.input(function() {
        var newText = textArea.val();
        if (textAreaContent != newText) {
            textAreaContent = '';

            //if (carotaDocument.selectedRange().plainText() != newText)

            textArea.val('');
            var char = carotaDocument.characterByOrdinal(carotaDocument.selection.start);
            if (char) {
                carotaDocument.selection.start += char.insert(newText);
                carotaDocument.selection.end = carotaDocument.selection.start;
                paint();
            }
        }
    });

    var updateTextArea = function() {
        setTimeout(function() {
            textArea.blur();
            focusChar = focusChar === null ? carotaDocument.selection.end : focusChar;
            var endChar = carotaDocument.characterByOrdinal(focusChar);
            if (endChar) {
                var bounds = endChar.bounds();
                textAreaDiv.css({ left: bounds.l, top: bounds.t + bounds.h });
                textArea.focus();
                textAreaDiv.css({ left: bounds.l, top: bounds.t });
            }
            textAreaContent = carotaDocument.selectedRange().plainText();
            textArea.val(textAreaContent);
            textArea.select();
            textArea.focus();
        }, 10);

    };

    var select = function(start, end) {
        carotaDocument.select(start, end);
        paint();
        if (!selectDragStart) {
            updateTextArea();
        }
        $('#selectionStart').val(carotaDocument.selection.start);
        $('#selectionEnd').val(carotaDocument.selection.end);
    };

    canvas.mousedown(function(ev) {
        var co = canvas.offset();
        var mouseX = ev.pageX - co.left;
        var mouseY = ev.pageY - co.top;
        var char = carotaDocument.characterByCoordinate(mouseX, mouseY);
        selectDragStart = char.ordinal;
        focusChar = char.ordinal;
        select(char.ordinal, char.ordinal);
    });

    canvas.mousemove(function(ev) {
        var co = canvas.offset();
        var mouseX = ev.pageX - co.left;
        var mouseY = ev.pageY - co.top;
        if (ev.ctrlKey) {
            carotaDocument.width(mouseX);
            paint();
        } else if (selectDragStart !== null) {
            var newHoverChar = carotaDocument.characterByCoordinate(mouseX, mouseY, true);
            if (!doc.areCharsEqual(hoverChar, newHoverChar)) {
                hoverChar = newHoverChar;
                if (hoverChar) {
                    focusChar = hoverChar.ordinal;
                    if (selectDragStart > hoverChar.ordinal) {
                        select(hoverChar.ordinal, selectDragStart);
                    } else {
                        select(selectDragStart, hoverChar.ordinal);
                    }
                }
            }
        }
    });

    canvas.mouseup(function(ev) {
        selectDragStart = null;
        keyboardX = null;
        updateTextArea();
        textArea.focus();
    });

    setInterval(function() {
        if (carotaDocument.toggleCaret()) {
            paint();
        }
    }, 300);

    $('#selectionStart').keydown(function(ev) {
        if (ev.which === 13) {
            var o = parseInt($('#selectionStart').val(), 10);
            select(o, o);
        }
    });

    $('#selectionEnd').keydown(function(ev) {
        if (ev.which === 13) {
            var o = parseInt($('#selectionEnd').val(), 10);
            select(carotaDocument.selection.start, o);
        }
    });

    paint();
});
