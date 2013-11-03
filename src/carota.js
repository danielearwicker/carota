var editor = require('./editor');
var sampleText = require('./sampleText');

window.onload = function() {
    var elem = document.querySelector('#exampleEditor');
    var exampleEditor = editor.create(elem);

    exampleEditor.document.inlines = function(obj) {
        if (obj.thing) {
            return {
                measure: function(measureText) {
                    return measureText(obj.thing);
                },
                draw: function(ctx, x, y, width, ascent, descent) {
                    ctx.strokeStyle = obj.thing;
                    ctx.fillStyle = 'black';
                    ctx.fillText(obj.thing, x, y);
                    ctx.strokeRect(x, y - ascent, width, ascent + descent);
                }
            }
        }
    };

    exampleEditor.load(sampleText);
};
