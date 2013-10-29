var line = require('./line');

/*  A stateful transformer function that accepts words and emits lines. If the first word
    is too wide, it will overhang; if width is zero or negative, there will be one word on
    each line.

    The y-coordinate is the top of the first line, not the baseline.

    Returns a stream of line objects, each containing an array of positionedWord objects.
 */

module.exports = function(width) {

    var lineBuffer = [], lineWidth = 0, maxAscent = 0, maxDescent = 0, y = 0, quit;

    var store = function(word, eachLine) {
        lineBuffer.push(word);
        lineWidth += word.width;
        maxAscent = Math.max(maxAscent, word.ascent);
        maxDescent = Math.max(maxDescent, word.descent);
        if (word.isNewLine()) {
            send(eachLine);
        }
    };

    var send = function(eachLine) {
        if (quit) {
            return;
        }
        quit = eachLine(line(width, y + maxAscent, maxAscent, maxDescent, lineBuffer));
        y += (maxAscent + maxDescent);
        lineBuffer.length = 0;
        lineWidth = maxAscent = maxDescent = 0;
    };

    return function(inputWord, eachLine) {
        if (!inputWord) {
            if (lineBuffer.length) {
                send(eachLine);
            }
        } else {
            if (!lineBuffer.length) {
                store(inputWord, eachLine);
            } else {
                if (lineWidth + inputWord.text.width > width) {
                    send(eachLine);
                }
                store(inputWord, eachLine);
            }
        }
        return quit;
    };
};
