var text = require('./text');

var defaultInline = {
    measure: function(formatting) {
        var text = text.measure('?', formatting);
        return {
            width: text.width + 4,
            ascent: text.width + 2,
            descent: text.width + 2
        };
    },
    draw: function(ctx, x, y, width, ascent, descent) {
        ctx.fillStyle = 'silver';
        ctx.fillRect(x, y - ascent, width, ascent + descent);
        ctx.strokeRect(x, y - ascent, width, ascent + descent);
        ctx.fillStyle = 'black';
        ctx.fillText('?', x + 2, y);
    }
};

/*  A Part is a section of a word with its own run, because a Word can span the
    boundaries between runs, so it may have several parts in its text or space
    arrays.

        run           - Run being measured.
        isNewLine     - True if this part only contain a newline (\n). This will be
                        the only Part in the Word, and this is the only way newlines
                        ever occur.
        width         - Width of the run
        ascent        - Distance from baseline to top
        descent       - Distance from baseline to bottom

    And methods:

        draw(ctx, x, y)
                      - Draws the Word at x, y on the canvas context ctx. The y
                        coordinate is assumed to be the baseline. The call
                        prepareContext(ctx) will set the canvas up appropriately.
 */
var prototype = {
    draw: function(ctx, x, y) {
        if (typeof this.run.text === 'string') {
            text.draw(ctx, this.run.text, this.run, x, y, this.width, this.ascent, this.descent);
        } else if (this.code && this.code.draw) {
            ctx.save();
            this.code.draw(ctx, x, y, this.width, this.ascent, this.descent, this.run);
            ctx.restore();
        }
    }
};

module.exports = function(run, codes) {

    var m, isNewLine, code;
    if (typeof run.text === 'string') {
        isNewLine = (run.text.length === 1) && (run.text[0] === '\n');
        m = text.measure(isNewLine ? text.nbsp : run.text, run);
    } else {
        code = codes(run.text) || defaultInline;
        m = code.measure ? code.measure(run) : {
            width: 0, ascent: 0, descent: 0
        };
    }

    var part = Object.create(prototype, {
        run: { value: run },
        isNewLine: { value: isNewLine },
        width: { value: isNewLine ? 0 : m.width },
        ascent: { value: m.ascent },
        descent: { value: m.descent }
    });
    if (code) {
        Object.defineProperty(part, 'code', { value: code });
    }
    return part;
};
