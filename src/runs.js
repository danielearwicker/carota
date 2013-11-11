exports.formattingKeys = [ 'bold', 'italic', 'underline', 'strikeout', 'color', 'font', 'size', 'align', 'script' ];

exports.defaultFormatting = {
    size: 10,
    font: 'sans-serif',
    color: 'black',
    bold: false,
    italic: false,
    underline: false,
    strikeout: false,
    align: 'left',
    script: 'normal'
};

exports.sameFormatting = function(run1, run2) {
    return exports.formattingKeys.every(function(key) {
        return run1[key] === run2[key];
    })
};

exports.clone = function(run) {
    var result = { text: run.text };
    exports.formattingKeys.forEach(function(key) {
        var val = run[key];
        if (val && val != exports.defaultFormatting[key]) {
            result[key] = val;
        }
    });
    return result;
};

exports.multipleValues = {};

exports.merge = function(run1, run2) {
    if (arguments.length === 1) {
        return Array.isArray(run1) ? run1.reduce(exports.merge) : run1;
    }
    if (arguments.length > 2) {
        return exports.merge(Array.prototype.slice.call(arguments, 0));
    }
    var merged = {};
    exports.formattingKeys.forEach(function(key) {
        if (key in run1 || key in run2) {
            if (run1[key] === run2[key]) {
                merged[key] = run1[key];
            } else {
                merged[key] = exports.multipleValues;
            }
        }
    });
    return merged;
};

exports.format = function(run, template) {
    if (Array.isArray(run)) {
        run.forEach(function(r) {
            exports.format(r, template);
        });
    } else {
        Object.keys(template).forEach(function(key) {
            if (template[key] !== exports.multipleValues) {
                run[key] = template[key];
            }
        });
    }
};

exports.consolidate = function() {
    var current;
    return function (emit, run) {
        if (!current || !exports.sameFormatting(current, run) ||
            (typeof current.text != 'string') ||
            (typeof run.text != 'string')) {
            current = exports.clone(run);
            emit(current);
        } else {
            current.text += run.text;
        }
    };
};

exports.getPlainText = function(run) {
    if (typeof run.text === 'string') {
        return run.text;
    }
    if (Array.isArray(run.text)) {
        var str = [];
        run.text.forEach(function(piece) {
            str.push(exports.getPiecePlainText(piece));
        });
        return str.join('');
    }
    return '_';
};

/*  The text property of a run can be an ordinary string, or a "character object",
 or it can be an array containing strings and "character objects".

 A character object is not a string, but is treated as a single character.

 We abstract over this to provide the same string-like operations regardless.
 */
exports.getPieceLength = function(piece) {
    return piece.length || 1; // either a string or something like a character
};

exports.getPiecePlainText = function(piece) {
    return piece.length ? piece : '_';
};

exports.getTextLength = function(text) {
    if (typeof text === 'string') {
        return text.length;
    }
    if (Array.isArray(text)) {
        var length = 0;
        text.forEach(function(piece) {
            length += exports.getPieceLength(piece);
        });
        return length;
    }
    return 1;
};

exports.getSubText = function(emit, text, start, count) {
    if (count === 0) {
        return;
    }
    if (typeof text === 'string') {
        emit(text.substr(start, count));
        return;
    }
    if (Array.isArray(text)) {
        var pos = 0;
        text.some(function(piece) {
            if (count <= 0) {
                return true;
            }
            var pieceLength = exports.getPieceLength(piece);
            if (pos + pieceLength > start) {
                if (pieceLength === 1) {
                    emit(piece);
                    count -= 1;
                } else {
                    var str = piece.substr(Math.max(0, start - pos), count);
                    emit(str);
                    count -= str.length;
                }
            }
            pos += pieceLength;
        });
        return;
    }
    emit(text);
};

exports.getTextChar = function(text, offset) {
    var result;
    exports.getSubText(function(c) { result = c }, text, offset, 1);
    return result;
};

exports.pieceCharacters = function(each, piece) {
    if (typeof piece === 'string') {
        for (var c = 0; c < piece.length; c++) {
            each(piece[c]);
        }
    } else {
        each(piece);
    }
};
