var per = require('per');
var doc = require('./doc');
var characters = require('./characters');
var split = require('./split');
var wrap = require('./wrap');
var word = require('./word');

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

assert(
    plain.split(''),
    chars.take(plain.length).map('x.char').all()
);

var testToRuns = function(expected, start, count) {
    var startChar = chars.skip(start).first();
    var finishChar = chars.skip(start + count).first();
    assert(expected, per(startChar.cut(finishChar)).map('x.text').all());
};

testToRuns(["on Wick,\n "], 10, 10);
testToRuns(["on Wick,\n    26th Oct 2013\n\n", "De"], 10, 30);
testToRuns(["on Wick,\n    26th Oct 2013\n\n",
    "Dear sir/madam,\n\nWith reference to your account ",
    "No. "], 10, 80);

var getPlainText = function(from, to) {
    return per(from.cut(to)).map('x.text').all().join('');
};

var words = chars.per(split()).map(function(word) {
    return !word ? null :
            getPlainText(word.text, word.spaces) +
            getPlainText(word.spaces, word.end);
});

assert(['    ', 'Crampton ', 'Wick,', '\n', '    ', '26th '], words.take(6).all());
assert(null, words.last());

if (failed === 0) {
    console.log('');
    console.log('All good');
}
