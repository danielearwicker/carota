var per = require('per');
var doc = require('./doc');

// needed for tests, which shouldn't be in here...
var characters = require('./characters');
var split = require('./split');
var wrap = require('./wrap');
var word = require('./word');

var sampleText = [
    { text: '    Crampton Wick,\n    26th Oct 2013\n\n' },
    { text: 'Dear sir/madam,\n\nWith reference to your account ' },
    { text: 'No. 17598732', bold: true },
    { text: ', it is with the utmost regret that we have to inform you that your contract with us ' +
        'has been '
    },
    { text: 'terminated forth', italic: true },
    { text: 'with', italic: true, bold: true },
    { text: '.\n\n    Please find enclosed a portrait of ' },
    { text: 'Her Majesty Queen Victoria', size: 24, color: 'red', font: 'Times' },
    { text: ' brushing a gibbon\'s hair.\n\nYours, etc.\n\n' },
    { text: '     Fernando Degroot, Esq.\n     Persistent Undersecretary to His Lordship\n\n' },
    { text: 'Children are being urged to take back their "wild time", swapping 30 minutes of screen use for outdoor activities.\n' +
        'The call to renew a connection with nature comes from a collaboration of almost 400 organisations, from playgroups to the NHS.\n' +
        'The Wild Network wants children to take up activities like conkers and camping.\n' +
        '"The tragic truth is that kids have lost touch with nature and the outdoors in just one generation," said chairman Andy Simpson.\n' +
        'The organisers argue that swapping 30 minutes of television and computer games each day for outdoor play would increase the levels of fitness and alertness and improve children\'s well-being\n' +
        '"Time spent outdoors is down, roaming ranges have fallen drastically, activity levels are declining and the ability to identify common species has been lost," said Mr Simpson.\n' +
        'He referred to recent research by the RSPB which suggested only one in five children aged eight to 12 had a connection with nature.\n' +
        '"We need to make more space for wild time in children\'s daily routine, freeing this generation of kids to have the sort of experiences that many of us took for granted"\n' +
        '"With many more parents becoming concerned about the dominance of screen time in their children\'s lives, and growing scientific evidence that a decline in active time is bad news for the health and happiness of our children, we all need to become marketing directors for nature," said Mr Simpson.\n' +
        '"An extra 30 minutes of wild time every day for all under 12-year-olds in the UK would be the equivalent of just three months of their childhood spent outdoors.\n' +
        '"We want parents to see what this magical wonder product does for their kids\' development, independence and creativity, by giving wild time a go."\n' +
        'The campaign launches on Friday with the release of a documentary film, Project Wild Thing.\n' +
        'It tells the story of how, in a bid to get his daughter and son outside, film-maker David Bond appoints himself marketing director for nature, working with branding and outdoor experts to develop a campaign.\n' +
        '"I wanted to understand why my children\'s childhood is so different from mine, whether this matters and, if it does, what I can do about it," said Mr Bond.\n' +
        '"The reasons why kids, whether they live in cities or the countryside, have become disconnected from nature and the outdoors are complex.\n' +
        '"Project Wild Thing isn\'t some misty-eyed nostalgia for the past. We need to make more space for wild time in children\'s daily routine, freeing this generation of kids to have the sort of experiences that many of us took for granted.\n' +
        '"It\'s all about finding wildness on your doorstep and discovering the sights, sounds and smells of nature, whether in a back garden, local park or green space at the end of the road."\n' +
        'The campaign, said to be the biggest ever aiming to reconnect children with the outdoors, includes the National Trust, the RSPB, Play England and the NHS, as well as playgroups, businesses and schools.'
    }
];

var plain =
    '    Crampton Wick,\n    26th Oct 2013\n\nDear sir/madam,\n\nWith reference to your account No. 17598732, ' +
    'it is with the utmost regret that we have to inform you that your contract with us has been terminated ' +
    'forthwith.\n\n    Please find enclosed a portrait of Her Majesty Queen Victoria brushing a gibbon\'s ' +
    'hair.\n\nYours, etc.\n\n';

var assert = function(expected, actual) {
    expected = JSON.stringify(expected);
    actual = JSON.stringify(actual);
    if (expected != actual) {
        console.error('Expected: ' + expected + ', actual: ' + actual);
        failed++;
    }
};

assert(
    plain.split(''),
    per(characters).take(plain.length).map('.char').toArray(sampleText)
);

var testToRuns = function(expected, start, count) {
    var startChar = per(characters).skip(start).first(sampleText);
    var finishChar = per(characters).skip(start + count).first(sampleText);
    assert(expected, per.map('.text').toArray(startChar.cut(finishChar)));
};

testToRuns(["on Wick,\n "], 10, 10);
testToRuns(["on Wick,\n    26th Oct 2013\n\n", "De"], 10, 30);
testToRuns(["on Wick,\n    26th Oct 2013\n\n",
            "Dear sir/madam,\n\nWith reference to your account ",
            "No. "], 10, 80);

var getPlainText = function(from, to) {
    return per.map('.text').toArray(from.cut(to)).join('');
};

per(characters).per(split()).read(sampleText, function(word) {
    if (!word) {
        console.log('[end of text]');
    } else {
        console.log(
            getPlainText(word.text, word.spaces),
            getPlainText(word.spaces, word.end)
        );
    }
});

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
