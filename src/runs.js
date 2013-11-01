exports.formattingKeys = [ 'bold', 'italic', 'underline', 'strikeout', 'color', 'font', 'size', 'align', 'script' ];

exports.sameFormatting = function(run1, run2) {
    return exports.formattingKeys.every(function(key) {
        return run1[key] === run2[key];
    })
};

exports.clone = function(run) {
    var result = { text: run.text };
    exports.formattingKeys.forEach(function(key) {
        result[key] = run[key];
    });
    return result;
};

exports.consolidate = function(runs) {
    var result = [];
    if (runs.length) {
        var current = exports.clone(runs[0]);
        result.push(current);
        for (var n = 1; n < runs.length; n++) {
            if (exports.sameFormatting(current, runs[n])) {
                current.text += runs[n].text;
            } else {
                current = exports.clone(runs[n]);
                result.push(current);
            }
        }
    }
    return result;
};
