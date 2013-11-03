var per = require('per');
var doc = require('./doc');
var characters = require('./characters');
var split = require('./split');
var wrap = require('./wrap');
var word = require('./word');
var runs = require('./runs');

var sampleText = [
    { text: '    Crampton Wick,\n    26th Oct 2013\n\n' },
    { text: [
        'Dear sir/madam,\n\nWith reference ',
        { thing: 'blue' },
        'to your account ']
    },
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
    { text: { unknown: 'dunno' }, align: 'center' },
    { text: 'Children are being urged to take back their "wild time", swapping 30 minutes of screen use for outdoor activities.\n' +
        'The call to renew a connection with nature comes from a collaboration of almost 400 organisations, from playgroups to the NHS.\n' +
        'The Wild Network wants children to take up activities like conkers and camping.\n\n',
        align: 'center'
    },
    { text: 'Chemical symbol for water: H' },
    { text: '2', script: 'sub' },
    { text: 'O\n\n' },
    { text: 'Einstein\'s mass-energy equivalence: E=MC' },
    { text: '2', script: 'super' },
    { text: '\n\n' },
    { text: '"The tragic truth is that kids have lost touch with nature and the outdoors in just one generation," said chairman Andy Simpson.\n\n' +
        'The organisers argue that swapping 30 minutes of television and computer games each day for outdoor play would increase the levels of fitness and alertness and improve children\'s well-being\n' +
        '"Time spent outdoors is down, roaming ranges have fallen drastically, activity levels are declining and the ability to identify common species has been lost," said Mr Simpson.\n' +
        'He referred to recent research by the RSPB which suggested only one in five children aged eight to 12 had a connection with nature.\n\n',
        align: 'right'
    },
    { text: '"We need to make more space for wild time in children\'s daily routine, freeing this generation of kids to have the sort of experiences that many of us took for granted"\n' +
        '"With many more parents becoming concerned about the dominance of screen time in their children\'s lives, and growing scientific evidence that a decline in active time is bad news for the health and happiness of our children, we all need to become marketing directors for nature," said Mr Simpson.\n' +
        '"An extra 30 minutes of wild time every day for all under 12-year-olds in the UK would be the equivalent of just three months of their childhood spent outdoors.\n\n' +
        '"We want parents to see what this magical wonder product does for their kids\' development, independence and creativity, by giving wild time a go."\n\n' +
        'The campaign launches on Friday with the release of a documentary film, Project Wild Thing.\n\n',
        align: 'justify'
    },
    { text: 'It tells the story of how, in a bid to get his daughter and son outside, film-maker David Bond appoints himself marketing director for nature, working with branding and outdoor experts to develop a campaign.\n\n' +
        '"I wanted to understand why my children\'s childhood is so different from mine, whether this matters and, if it does, what I can do about it," said Mr Bond.\n\n' +
        '"The reasons why kids, whether they live in cities or the countryside, have become disconnected from nature and the outdoors are complex.\n\n' +
        '"Project Wild Thing isn\'t some misty-eyed nostalgia for the past. We need to make more space for wild time in children\'s daily routine, freeing this generation of kids to have the sort of experiences that many of us took for granted.\n\n' +
        '"It\'s all about finding wildness on your doorstep and discovering the sights, sounds and smells of nature, whether in a back garden, local park or green space at the end of the road."\n\n' +
        'The campaign, said to be the biggest ever aiming to reconnect children with the outdoors, includes the National Trust, the RSPB, Play England and the NHS, as well as playgroups, businesses and schools.'
    }
];

var failed = 0;

var assert = function(expected, actual) {
    expected = JSON.stringify(expected);
    actual = JSON.stringify(actual);
    if (expected != actual) {
        console.error('');
        console.error('============= ERROR =============');
        console.error('');
        console.error('Expected: ' + expected);
        console.error('  Actual: ' + actual);
        console.error('');
        failed++;
    } else {
        console.log('    Good: ' + actual);
    }
};

var chars = per(characters(sampleText));

var plain =
    '    Crampton Wick,\n    26th Oct 2013\n\nDear sir/madam,\n\nWith reference to your account No. 17598732, ' +
        'it is with the utmost regret that we have to inform you that your contract with us has been terminated ' +
        'forthwith.\n\n    Please find enclosed a portrait of Her Majesty Queen Victoria brushing a gibbon\'s ' +
        'hair.\n\nYours, etc.\n\n';

var expectedChars = plain.split('');
expectedChars.splice(70, 0, {"thing":"blue"});
assert(
    expectedChars,
    chars.take(expectedChars.length).map('x.char').all()
);

var testToRuns = function(expected, start, count) {
    var startChar = chars.skip(start).first();
    var finishChar = chars.skip(start + count).first();
    assert(expected, per(startChar.cut(finishChar)).map('x.text').all());
};

testToRuns(["on Wick,\n "], 10, 10);
testToRuns(["on Wick,\n    26th Oct 2013\n\n", "De"], 10, 30);
testToRuns(["on Wick,\n    26th Oct 2013\n\n",
    "Dear sir/madam,\n\nWith reference ",{"thing":"blue"},"to your account ",
    "No. "], 10, 81);

var getPlainText = function(from, to) {
    return per(from.cut(to)).map(function(run) {
        return runs.getPiecePlainText(run.text);
    }).all().join('');
};

var words = chars.per(split()).map(function(word) {
    return !word ? null :
            getPlainText(word.text, word.spaces) +
            getPlainText(word.spaces, word.end);
});

assert(['    ', 'Crampton ', 'Wick,', '\n', '    ', '26th '], words.take(6).all());
assert(null, words.last());

var checkInlines = function(expected, text) {
    assert(expected, per(characters(text)).per(split()).map(function(word) {
        return !word ? null :
            getPlainText(word.text, word.spaces) +
            getPlainText(word.spaces, word.end);
    }).all())
};

checkInlines([ 'Dear ',
    'sir/madam,',
    '\n',
    '\n',
    'With ',
    'reference ',
    '_to ',
    'your ',
    'account ',
    null
], [
    { text: [
        'Dear sir/madam,\n\nWith reference ',
        { thing: 'blue' },
        'to your account ']
    }
]);

checkInlines([ '_Dear ',
    'sir/madam,',
    '\n',
    '\n',
    'With ',
    'reference ',
    'to ',
    'your ',
    'account ',
    null
], [
    { text: [
        { thing: 'blue' },
        'Dear sir/madam,\n\nWith reference ',
        'to your account ']
    }
]);

checkInlines([ 'Dear ',
    'sir/madam,',
    '\n',
    '\n',
    'With ',
    'reference ',
    'to ',
    'your ',
    'account ',
    '_',
    null
], [{ text: [
        'Dear sir/madam,\n\nWith reference ',
        'to your account ',
        { thing: 'blue' }
    ]}
]);

checkInlines([ 'Dear ',
    'sir/madam,',
    '\n',
    '\n',
    'With ',
    'reference ',
    't_o ',
    'your ',
    'account ',
    null
], [
    { text: [
        'Dear sir/madam,\n\nWith reference ',
        't',
        { thing: 'blue' },
        'o your account ']
    }
]);

checkInlines([ 'Dear ',
    'sir/madam,',
    '\n',
    '\n',
    'With ',
    'reference ',
    'to_ ',
    'your ',
    'account ',
    null
], [
    { text: [
        'Dear sir/madam,\n\nWith reference ',
        't',
        'o',
        { thing: 'blue' },
        ' your account ']
    }
]);

if (failed === 0) {
    console.log('');
    console.log('All good');
}
