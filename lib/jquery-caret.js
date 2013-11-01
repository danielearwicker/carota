window.jQuery.fn.extend({

    caret: function (start, end, noFocus) {
        var elem = this[0];
        if (elem) {
            // get caret range
            if (typeof start == "undefined") {
                if (typeof elem.selectionStart != "undefined") {
                    start = elem.selectionStart;
                    end = elem.selectionEnd;
                }
                else if (document.selection) {
                    var val = this.val();
                    var range = document.selection.createRange().duplicate();
                    range.moveEnd("character", val.length)
                    start = (range.text == "" ? val.length : val.lastIndexOf(range.text));

                    range = document.selection.createRange().duplicate();
                    range.moveStart("character", -val.length);
                    end = range.text.length;
                }
            }
            // set caret range
            else {
                var val = this.val();

                if (typeof start != "number") start = -1;
                if (typeof end != "number") end = -1;
                if (start < 0) start = 0;
                if (end > val.length || end < 0) end = val.length;
                if (end < start) end = start;
                if (start > end) start = end;

                try {
                    if (!noFocus) {
                        elem.focus();
                    }

                    if (typeof elem.selectionStart != "undefined") {
                        elem.selectionStart = start;
                        elem.selectionEnd = end;
                    }
                    else if (document.selection) {
                        var range = elem.createTextRange();
                        range.collapse(true);
                        range.moveStart("character", start);
                        range.moveEnd("character", end - start);
                        range.select();
                    }
                } catch (x) { }
            }

            return { start: start, end: end };
        }
    }
});