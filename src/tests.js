var per = require('per');
var doc = require('./doc');
var characters = require('./characters');
var split = require('./split');
var wrap = require('./wrap');
var word = require('./word');
var runs = require('./runs');

var sampleText = require('./sampleText');

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
