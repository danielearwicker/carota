var runs = require('./runs');
var per = require('per');

var tag = function(name, formattingProperty) {
    return function(node, formatting) {
        if (node.nodeName === name) {
            formatting[formattingProperty] = true;
        }
    };
};

var value = function(type, styleProperty, formattingProperty, transformValue) {
    return function(node, formatting) {
        var val = node[type] && node[type][styleProperty];
        if (val) {
            if (transformValue) {
                val = transformValue(val);
            }
            formatting[formattingProperty] = val;
        }
    };
};

var attrValue = function(styleProperty, formattingProperty, transformValue) {
    return value('attributes', styleProperty, formattingProperty, transformValue);
};

var styleValue = function(styleProperty, formattingProperty, transformValue) {
    return value('style', styleProperty, formattingProperty, transformValue);
};

var styleFlag = function(styleProperty, styleValue, formattingProperty) {
    return function(node, formatting) {
        if (node.style && node.style[styleProperty] === styleValue) {
            formatting[formattingProperty] = true;
        }
    };
};

var obsoleteFontSizes = [ 6, 7, 9, 10, 12, 16, 20, 30 ];

var aligns = { left: true, center: true, right: true, justify: true };

var checkAlign = function(value) {
    return aligns[value] ? value : 'left';
};

var fontName = function(name) {
    var s = name.split(/\s*,\s*/g);
    if (s.length == 0) {
        return name;
    }
    name = s[0]
    var raw = name.match(/^"(.*)"$/);
    if (raw) {
        return raw[1].trim();
    }
    raw = name.match(/^'(.*)'$/);
    if (raw) {
        return raw[1].trim();
    }
    return name;
};

var headings = {
    H1: 30,
    H2: 20,
    H3: 16,
    H4: 14,
    H5: 12
};

var handlers = [
    tag('B', 'bold'),
    tag('STRONG', 'bold'),
    tag('I', 'italic'),
    tag('EM', 'italic'),
    tag('U', 'underline'),
    tag('S', 'strikeout'),
    tag('STRIKE', 'strikeout'),
    tag('DEL', 'strikeout'),
    styleFlag('fontWeight', 'bold', 'bold'),
    styleFlag('fontStyle', 'italic', 'italic'),
    styleFlag('textDecoration', 'underline', 'underline'),
    styleFlag('textDecoration', 'line-through', 'strikeout'),
    styleValue('color', 'color'),
    styleValue('fontFamily', 'font', fontName),
    styleValue('fontSize', 'size', function(size) {
        var m = size.match(/^([\d\.]+)pt$/);
        return m ? parseFloat(m[1]) : 10
    }),
    styleValue('textAlign', 'align', checkAlign),
    function(node, formatting) {
        if (node.nodeName === 'SUB') {
            formatting.script = 'sub';
        }
    },
    function(node, formatting) {
        if (node.nodeName === 'SUPER') {
            formatting.script = 'super';
        }
    },
    function(node, formatting) {
        if (node.nodeName === 'CODE') {
            formatting.font = 'monospace';
        }
    },
    function(node, formatting) {
        var size = headings[node.nodeName];
        if (size) {
            formatting.size = size;
        }
    },
    attrValue('color', 'color'),
    attrValue('face', 'font', fontName),
    attrValue('align', 'align', checkAlign),
    attrValue('size', 'size', function(size) {
        return obsoleteFontSizes[size] || 10;
    })
];

var newLines = [ 'BR', 'P', 'H1', 'H2', 'H3', 'H4', 'H5' ];
var isNewLine = {};
newLines.forEach(function(name) {
    isNewLine[name] = true;
});

exports.parse = function(html, classes) {
    var root = html;
    if (typeof root === 'string') {
        root = document.createElement('div');
        root.innerHTML = html;
    }

    var result = [], inSpace = true;
    var cons = per(runs.consolidate()).into(result);
    var emit = function(text, formatting) {
        cons.submit(Object.create(formatting, {
            text: { value: text }
        }));
    };
    var dealWithSpaces = function(text, formatting) {
        text = text.replace(/\n+\s*/g, ' ');
        var fullLength = text.length;
        text = text.replace(/^\s+/, '');
        if (inSpace) {
            inSpace = false;
        } else if (fullLength !== text.length) {
            text = ' ' + text;
        }
        fullLength = text.length;
        text = text.replace(/\s+$/, '');
        if (fullLength !== text.length) {
            inSpace = true;
            text += ' ';
        }
        emit(text, formatting);
    };

    function recurse(node, formatting) {
        if (node.nodeType == 3) {
            dealWithSpaces(node.nodeValue, formatting);
        } else {
            formatting = Object.create(formatting);

            var classNames = node.attributes['class'];
            if (classNames) {
                classNames.value.split(' ').forEach(function(cls) {
                    cls = classes[cls];
                    if (cls) {
                        Object.keys(cls).forEach(function(key) {
                            formatting[key] = cls[key];
                        });
                    }
                })
            }

            handlers.forEach(function(handler) {
                handler(node, formatting);
            });
            if (node.childNodes) {
                for (var n = 0; n < node.childNodes.length; n++) {
                    recurse(node.childNodes[n], formatting);
                }
            }
            if (isNewLine[node.nodeName]) {
                emit('\n', formatting);
                inSpace = true;
            }
        }
    }
    recurse(root, {});
    return result;
};

