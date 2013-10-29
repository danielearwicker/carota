var measure = require('./measure');

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
        ctx.fillText(this.isNewLine ? measure.enter : this.run.text, x, y);
    }
};

module.exports = function(run) {
    var isNewLine = (run.text.length === 1) && (run.text[0] === '\n');
    var m = measure.cachedMeasureText(
        isNewLine ? measure.nbsp : run.text,
        measure.getRunStyle(run));
    return Object.create(prototype, {
        run: { value: run },
        isNewLine: { value: isNewLine },
        width: { value: isNewLine ? 0 : m.width },
        ascent: { value: m.ascent },
        descent: { value: m.descent }
    });
};
