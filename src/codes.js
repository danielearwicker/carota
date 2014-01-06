'use strict';

var text = require('./text');
var rect = require('./rect');
var wrap = require('./wrap');

var codes = {};

codes.number = function(obj, number) {
    return text.make(obj, (number + 1) + '.');
};

var listTerminator = function(obj) {
    return Object.create(text.make(obj, text.enter), {
        block: { value: true }
    });
};

codes.listNext = codes.listEnd = listTerminator;
/*
var listTerminator = function(obj) {
    return Object.create(obj, {
        measure: {
            value: function(formatting) {
                return { width: 0, ascent: 0, descent: 0 };
            }
        },
        draw: {
            value: function(ctx, x, y, width, ascent, descent, formatting) {
            }
        },
        block: {
            value: function(params) {
                return params.bounds.t;
            }
        }
    });
};
*/
var terminatingIterator = function(baseIterator) {
    var start = baseIterator.position(), depth = 0;
    return Object.create(baseIterator, {
        advance: {
            value: function() {
                var code = baseIterator.current().code;
                if (depth === 0 && baseIterator.position() !== start) {
                    if (code && (code.$ === 'listNext' ||
                        code.$ === 'listEnd')) {
                        return false;
                    }
                }
                if (depth > 0 && code && code.$ === 'listEnd') {
                    depth--;
                }
                if (!baseIterator.advance()) {
                    return false;
                }
                code = baseIterator.current().code;
                if (code && code.$ === 'listStart') {
                    depth++;
                }
                return true;
            }
        }
    });
};

codes.listStart = function(obj, data_notUsed, allCodes) {
    return Object.create(text.make(obj, text.enter), {
        block: {
            value: function(params) {

                var indent = 50,
                    spacing = 10,
                    number = 0,
                    y = params.bounds.t,
                    code = obj;

                while (code.$ !== 'listEnd' && y < params.bounds.b) {
                    if (code.$ !== 'listStart' && code.$ !== 'listNext') {
                        throw new Error('Expected listStart or listNext');
                    }
                    (function() {
                        var marker = allCodes(code.marker || { $: 'number' }, number++);
                        var markerFormatting = params.words.current().only.run;
                        var markerMeasurements = marker.measure(markerFormatting);
                        var markerIndex = params.words.position();
                        var markerBaseline = null;

                        var bottom = wrap({
                            words: terminatingIterator(params.words),
                            bounds: rect(
                                params.bounds.l + indent, y,
                                params.bounds.w - indent, params.bounds.h - y
                            ),
                            output: function(info) {
                                if (markerBaseline === null && info.baseline) {
                                    markerBaseline = info.baseline;
                                }
                                params.output(info);
                            },
                            ascent: markerMeasurements.ascent,
                            descent: markerMeasurements.descent
                        });

                        if (markerBaseline === null) {
                            markerBaseline = y + markerMeasurements.ascent;
                        }

                        params.output({
                            index: markerIndex,
                            bounds: rect(params.bounds.l, y, indent, bottom - y),
                            draw: function(ctx) {
                                marker.draw(ctx,
                                    params.bounds.l + indent - spacing - markerMeasurements.width,
                                    markerBaseline,
                                    markerMeasurements.width,
                                    markerMeasurements.ascent,
                                    markerMeasurements.descent,
                                    markerFormatting);
                            }
                        });

                        y = Math.max(bottom, markerBaseline + markerMeasurements.descent);
                        code = params.words.current().code;
                    })();
                }

                return y;
            }
        }
    });
};

module.exports = function(obj, number, allCodes) {
    var impl = codes[obj.$];
    return impl && impl(obj, number, allCodes);
};

module.exports.editFilter = function(doc) {
    var balance = 0;

    if (!doc.words.some(function(word, i) {
        var code = word.code;
        if (code) {
            switch (code.$) {
                case 'listStart':
                    balance++;
                    break;
                case 'listNext':
                    if (balance === 0) {
                        doc.spliceWordsWithRuns(i, 1, Object.create(word.codeFormatting(), {
                            value: {
                                text: {
                                    $: 'listStart',
                                    marker: code.marker
                                }
                            }
                        }));
                        return true;
                    }
                    break;
                case 'listEnd':
                    if (balance === 0) {
                        doc.spliceWordsWithRuns(i, 1, []);
                    }
                    balance--;
                    break;
            }
        }
    })) {
        if (balance > 0) {
            var ending = [];
            while (balance > 0) {
                balance--;
                ending.push({
                    text: { $: 'listEnd' }
                });
            }
            doc.spliceWordsWithRuns(doc.words.length - 1, 0, ending);
        }
    }
};
