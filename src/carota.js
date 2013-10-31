var per = require('per');
var doc = require('./doc');

var sampleText = require('./sampleText');

$(function() {

    var canvas = $('canvas'), textArea = $('#hiddenTextArea');
    var ctx = canvas[0].getContext('2d');

    var carotaDocument = doc();
    carotaDocument.width(canvas[0].width);
    carotaDocument.load(sampleText);

    textArea.val(carotaDocument.plainText());
    canvas.focus(function() {
        setTimeout(function() {
            textArea.focus();
        }, 10);
    });

    var paint = function() {

        ctx.clearRect(0, 0, canvas[0].width, canvas[0].height);

        carotaDocument.draw(ctx, canvas[0].height);
        carotaDocument.drawSelection(ctx);

        $('#selectionStart').val(carotaDocument.selection.start);
        $('#selectionEnd').val(carotaDocument.selection.end);

        ctx.beginPath();
        ctx.moveTo(carotaDocument.width(), 0);
        ctx.lineTo(carotaDocument.width(), canvas[0].height);
        ctx.stroke();
    };

    var hoverChar, selectDragStart = null;

    canvas.mousedown(function(ev) {
        var co = canvas.offset();
        var mouseX = ev.pageX - co.left;
        var mouseY = ev.pageY - co.top;
        var char = carotaDocument.characterByCoordinate(mouseX, mouseY);
        carotaDocument.select(char.ordinal);
        paint();
        selectDragStart = char.ordinal;
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
                    if (selectDragStart > hoverChar.ordinal) {
                        carotaDocument.select(hoverChar.ordinal, selectDragStart);
                    } else {
                        carotaDocument.select(selectDragStart, hoverChar.ordinal);
                    }
                    paint();
                }
            }
        }
    });

    canvas.mouseup(function(ev) {
        selectDragStart = null;
    });

    setInterval(function() {
        if (carotaDocument.toggleCaret()) {
            paint();
        }
    }, 300);

    $('#selectionStart').keydown(function(ev) {
        if (ev.which === 13) {
            var o = parseInt($('#selectionStart').val(), 10);
            carotaDocument.select(o);
            paint();
        }
    });

    $('#selectionEnd').keydown(function(ev) {
        if (ev.which === 13) {
            var o = parseInt($('#selectionEnd').val(), 10);
            carotaDocument.selection.end = o;
            paint();
        }
    });

    paint();
});
