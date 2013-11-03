var measure = require('./measure');

var defaultInline = {
    measure: function() {
        return {
            width: 20,
            ascent: 20,
            descent: 0
        };
    },
    draw: function(ctx, x, y, width, ascent, descent) {
        ctx.fillStyle = 'silver';
        ctx.fillRect(x, y - ascent, width, ascent + descent);
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
        measure.applyRunStyle(ctx, this.run);
        if (typeof this.run.text === 'string') {
            switch (this.run.script) {
                case 'super':
                    y -= (this.ascent * (1/3));
                    break;
                case 'sub':
                    y += (this.descent / 2);
                    break;
            }
            ctx.fillText(this.isNewLine ? measure.enter : this.run.text, x, y);
            if (this.run.underline) {
                ctx.fillRect(x, 1 + y, this.width, 1);
            }
            if (this.run.strikeout) {
                ctx.fillRect(x, 1 + y - (this.ascent/2), this.width, 1);
            }
        } else if (this.inline) {
            ctx.save();
            this.inline.draw(ctx, x, y, this.width, this.ascent, this.descent);
            ctx.restore();
        }
    }
};

module.exports = function(run, inlines) {

    var m, isNewLine, inline;
    if (typeof run.text === 'string') {
        isNewLine = (run.text.length === 1) && (run.text[0] === '\n');
        m = measure.cachedMeasureText(
                isNewLine ? measure.nbsp : run.text,
                measure.getRunStyle(run));
    } else {
        inline = inlines(run.text) || defaultInline;
        m = inline.measure(function(str) {
            return measure.cachedMeasureText(str, measure.getRunStyle(run));
        });
    }

    var part = Object.create(prototype, {
        run: { value: run },
        isNewLine: { value: isNewLine },
        width: { value: isNewLine ? 0 : m.width },
        ascent: { value: m.ascent },
        descent: { value: m.descent }
    });
    if (inline) {
        Object.defineProperty(part, 'inline', { value: inline });
    }
    return part;
};
