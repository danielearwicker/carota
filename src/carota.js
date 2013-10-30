var per = require('per');
var doc = require('./doc');

var sampleText = require('./sampleText');

$(function() {

    var canvas = $('canvas');
    var ctx = canvas[0].getContext('2d');

    var carotaDocument = doc();
    carotaDocument.width(canvas[0].width);
    carotaDocument.load(sampleText);

    var hoverChar;

    var paint = function() {

        ctx.clearRect(0, 0, canvas[0].width, canvas[0].height);

        if (hoverChar) {
            var word = hoverChar.word;
            var line = word.line;
            line.bounds().drawPath(ctx);
            ctx.fillStyle = 'rgb(200, 255, 230)';
            ctx.fill();
            word.bounds().drawPath(ctx);
            ctx.fillStyle = 'rgb(200, 230, 255)';
            ctx.fill();
            hoverChar.bounds().drawPath(ctx);
            ctx.fillStyle = 'rgb(255, 200, 200)';
            ctx.fill();
        }

        carotaDocument.draw(ctx, 0, 0, canvas[0].height);

        ctx.beginPath();
        ctx.moveTo(carotaDocument.width(), 0);
        ctx.lineTo(carotaDocument.width(), canvas[0].height);
        ctx.stroke();
    };

    canvas.mousemove(function(ev) {
        var co = canvas.offset();
        var mouseX = ev.pageX - co.left;
        var mouseY = ev.pageY - co.top;

        if (ev.ctrlKey) {
            hoverChar = null;
            carotaDocument.width(mouseX);
            paint();
        } else {
            var newHoverChar = carotaDocument.characterByCoordinate(mouseX, mouseY);
            if (!doc.areCharsEqual(hoverChar, newHoverChar)) {
                hoverChar = newHoverChar;
                $('#ordinal').val(hoverChar ? hoverChar.ordinal : '');
                paint();
            }
        }
    });

    $('#gotoOrdinal').click(function() {
        var o = parseInt($('#ordinal').val(), 10);
        hoverChar = carotaDocument.characterByOrdinal(o);
        paint();
    });

    paint();
});
