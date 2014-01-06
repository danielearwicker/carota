'use strict';

var rect = require('./rect');

module.exports = function(params) {

    var words = params.words,
        bounds = params.bounds,
        output = params.output,
        lineBuffer = [],
        lineWidth = 0,

        // running maxima for the buffered words
        maxAscent = params.ascent || 0,
        maxDescent = params.descent || 0,

        align = null,
        y = bounds.t;

    var store = function(wordInfo) {
        lineBuffer.push(wordInfo);
        lineWidth += wordInfo.word.width;
        maxAscent = Math.max(maxAscent, wordInfo.word.ascent);
        maxDescent = Math.max(maxDescent, wordInfo.word.descent);
        if (align === null) {
            align = wordInfo.word.align();
        }
    };

    var flush = function() {
        if (lineBuffer.length) {
            var baseline = y + maxAscent,
                height = maxAscent + maxDescent,
                lastWord = lineBuffer[lineBuffer.length - 1],
                actualWidth = lineWidth - lastWord.word.space.width,
                x = bounds.l,
                spacing = 0;

            if (actualWidth < bounds.w) {
                switch (align) {
                    case 'right':
                        x = bounds.w - actualWidth;
                        break;
                    case 'center':
                        x = (bounds.w - actualWidth) / 2;
                        break;
                    case 'justify':
                        if (lineBuffer.length > 1 && !lastWord.isNewLine()) {
                            spacing = (bounds.w - actualWidth) / (lineBuffer.length - 1);
                        }
                        break;
                }
            }

            lineBuffer.forEach(function(info) {
                var wordLeft = x;
                x += (info.word.width + spacing);
                output({
                    index: info.index,
                    bounds: rect(wordLeft, y, x - wordLeft, height),
                    baseline: baseline,
                    caret: rect(wordLeft, y, 1, height)
                });
            });

            y += height;
        }

        lineWidth = maxAscent = maxDescent = 0;
        lineBuffer.length = 0;
        align = null;
    };

    while (words.advance() && y < bounds.b) {
        var word = words.current(),
            index = words.position(),
            info = { word: word, index: index },
            code = word.code;

        if (code && typeof code.block === 'function') {
            store(info);
            flush();
            y = code.block(Object.create(params, {
                bounds: { value: rect(bounds.l, y, bounds.w, bounds.h - y) }
            }));
        } else {
            if (!lineBuffer.length) {
                store(info);
            } else {
                if (lineWidth + words.current().text.width > bounds.w) {
                    flush();
                }
                store(info);
            }
        }
    }

    flush();
    return y;
};
