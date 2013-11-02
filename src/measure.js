
var textStyleDefaults = {
    size: 10,
    font: 'Helvetica',
    color: 'black'
};

/*  Returns a font CSS/Canvas string based on the settings in a run
 */
var getFontString = exports.getFontString = function(run) {
    return (run && run.italic ? 'italic ' : '') +
        (run && run.bold ? 'bold ' : '') + ' ' +
        ((run && run.size) || textStyleDefaults.size) + 'pt ' +
        ((run && run.font) || textStyleDefaults.font);
};

/*  Applies the style of a run to the canvas context
 */
exports.applyRunStyle = function(ctx, run) {
    ctx.fillStyle = (run && run.color) || textStyleDefaults.color;
    ctx.font = getFontString(run);
};

exports.prepareContext = function(ctx) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
};

/* Generates the value for a CSS style attribute
 */
exports.getRunStyle = function(run) {
    return 'font: ' + getFontString(run) +
        '; color: ' + ((run && run.color) || textStyleDefaults.color);
};

var nbsp = exports.nbsp = String.fromCharCode(160);
var enter = exports.enter = nbsp; // String.fromCharCode(9166);

/*  Returns width, height, ascent, descent in pixels for the specified text and font.
 The ascent and descent are measured from the baseline.
 */
var measureText = exports.measureText = (function() {
    var span, block, div;
    return function(text, style) {

        if (!div || !div.parents('html').length) {
            span = $('<span></span>');
            block = $('<div style="display: inline-block; width: 1px; height: 0px;"></div>');
            div = $('<div style="visibility: hidden; position: absolute; top: 0; left: 0; width: 500px; height: 200px;"></div>');
            div.append(span, block);
            $('body').append(div);
        }

        span.attr('style', style);
        span.text(text.replace(/\s/g, nbsp));

        var result = {};
        block.css({ verticalAlign: 'baseline' });
        result.ascent = (block.offset().top - span.offset().top);
        block.css({ verticalAlign: 'bottom' });
        result.height = (block.offset().top - span.offset().top);
        result.descent = result.height - result.ascent;
        result.width = span.width();
        return result;
    };
})();

/*  Create a function that works like measureText except it caches every result for every
    unique combination of (text, style) - that is, it memoizes measureText.

    So for example:

        var measure = cachedMeasureText();

    Then you can repeatedly do lots of separate calls to measure, e.g.:

        var m = measure('Hello, world', 'font: 12pt Arial');
        console.log(m.ascent, m.descent, m.width);

    A cache may grow without limit if the text varies a lot. However, during normal interactive
    editing the growth rate will be slow. If memory consumption becomes a problem, the cache
    can be occasionally discarded, although of course this will cause a slow down as the cache
    has to build up again (text measuring is by far the most costly operation we have to do).
*/
var createCachedMeasureText = exports.createCachedMeasureText = function() {
    var cache = {};
    return function(text, style) {
        var key = style + '<>!&%' + text;
        var result = cache[key];
        if (!result) {
            cache[key] = result = measureText(text, style);
        }
        return result;
    };
};

exports.cachedMeasureText = createCachedMeasureText();
