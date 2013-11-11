var text = require('./text');
var frame = require('./frame');
var node = require('./node');
var rect = require('./rect');
var util = require('./util');

var inlineNodePrototype = node.derive({
    parent: function() {
        return this._parent;
    },
    draw: function(ctx) {
        this.inline.draw(ctx,
            this.left,
            this.baseline,
            this.measured.width,
            this.measured.ascent,
            this.measured.descent,
            this.formatting);
    },
    position: function(left, baseline, bounds) {
        this.left = left;
        this.baseline = baseline;
        if (bounds) {
            this._bounds = bounds;
        }
    },
    bounds: function() {
        return this._bounds || rect(this.left, this.baseline - this.measured.ascent,
            this.measured.width, this.measured.ascent + this.measured.descent);
    },
    byCoordinate: function(x, y) {
        if (x <= this.bounds().center().x) {
            return this;
        }
        return this.next();
    }
});

var inlineNode = function(inline, parent, ordinal, length, formatting) {
    if (!inline.draw || !inline.measure) {
        throw new Error();
    }
    return Object.create(inlineNodePrototype, {
        inline: { value: inline },
        _parent: { value: parent },
        ordinal: { value: ordinal },
        length: { value: length },
        formatting: { value: formatting },
        measured: {
            value: inline.measure(formatting)
        }
    });
};

var codes = {};

codes.number = function(obj, number) {
    var formattedNumber = (number + 1) + '.';
    return {
        measure: function(formatting) {
            return text.measure(formattedNumber, formatting);
        },
        draw: function(ctx, x, y, width, ascent, descent, formatting) {
            text.draw(ctx, formattedNumber, formatting, x, y, width, ascent, descent);
        }
    };
};

var listTerminator = function(obj) {
    return util.derive(obj, {
        eof: true,
        measure: function(formatting) {
            return { width: 18, ascent: 0, descent: 0 }; // text.measure(text.enter, formatting);
        },
        draw: function(ctx, x, y) {
            // ctx.fillText(text.enter, x, y);
        }
    });
};

codes.listNext = codes.listEnd = listTerminator;

codes.listStart = function(obj, data, allCodes) {
    return util.derive(obj, {
        block: function(left, top, width, ordinal, parent, formatting) {
            var list = node.generic('list', parent, left, top),
                itemNode,
                itemFrame,
                itemMarker;

            var indent = 50, spacing = 10;

            var startItem = function(code, formatting) {
                itemNode = node.generic('item', list);
                var marker = allCodes(code.marker || { $: 'number' }, list.children().length);
                itemMarker = inlineNode(marker, itemNode, ordinal, 1, formatting);
                itemMarker.block = true;
                itemFrame = frame(
                    left + indent, top, width - indent, ordinal + 1, itemNode,
                    function(terminatorCode) {
                        return terminatorCode.$ === 'listEnd';
                    },
                    itemMarker.measured.ascent
                );
            };

            startItem(obj, formatting);

            return function(inputWord) {
                if (itemFrame) {
                    itemFrame(function(finishedFrame) {
                        ordinal = finishedFrame.ordinal + finishedFrame.length;
                        var frameBounds = finishedFrame.bounds();

                        // get first line and position marker
                        var firstLine = finishedFrame.first();
                        var markerLeft = left + indent - spacing - itemMarker.measured.width;
                        var markerBounds = rect(left, top, indent, frameBounds.h);
                        if ('baseline' in firstLine) {
                            itemMarker.position(markerLeft, firstLine.baseline, markerBounds);
                        } else {
                            itemMarker.position(markerLeft, top + itemMarker.measured.ascent, markerBounds);
                        }

                        top = frameBounds.t + frameBounds.h;

                        itemNode.children().push(itemMarker);
                        itemNode.children().push(finishedFrame);
                        itemNode.finalize();

                        list.children().push(itemNode);
                        itemNode = itemFrame = itemMarker = null;
                    }, inputWord);
                } else {
                    ordinal++;
                }

                if (!itemFrame) {
                    var i = inputWord.code();
                    if (i) {
                        if (i.$ == 'listEnd') {
                            list.finalize();
                            return list;
                        }
                        if (i.$ == 'listNext') {
                            startItem(i, inputWord.codeFormatting());
                        }
                    }
                }
            };
        }
    });
};

module.exports = exports = function(obj, number, allCodes) {
    var impl = codes[obj.$];
    return impl && impl(obj, number, allCodes);
};

exports.editFilter = function(doc) {
    var balance = 0;

    if (!doc.words.some(function(word, i) {
        var code = word.code();
        if (code) {
            switch (code.$) {
                case 'listStart':
                    balance++;
                    break;
                case 'listNext':
                    if (balance === 0) {
                        doc.spliceWordsWithRuns(i, 1, [util.derive(word.codeFormatting(), {
                            text: {
                                $: 'listStart',
                                marker: code.marker
                            }
                        })]);
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
