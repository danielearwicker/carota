/*
    jQuery `input` special event v1.1
 
http://whattheheadsaid.com/projects/input-special-event
 
    (c) 2010-2011 Andy Earnshaw
    MIT license
    www.opensource.org/licenses/mit-license.php
*/
(function($, udf) {
    var ns = ".inputEvent ",
        // A bunch of data strings that we use regularly
        dataBnd = "bound.inputEvent",
        dataVal = "value.inputEvent",
        dataDlg = "delegated.inputEvent",
        // Set up our list of events
        bindTo = [
            "input", "textInput", "propertychange", "paste", "cut", "keydown", "drop",
        ""].join(ns),
        // Events required for delegate, mostly for IE support
        dlgtTo = [ "focusin", "mouseover", "dragstart", "" ].join(ns),
        // Elements supporting text input, not including contentEditable
        supported = {TEXTAREA:udf, INPUT:udf},
        // Events that fire before input value is updated
        delay = { paste:udf, cut:udf, keydown:udf, drop:udf, textInput:udf };
 
    $.event.special.txtinput = {
        setup: function(data, namespaces, handler) {
            var timer,
                bndCount,
                // Get references to the element
                elem  = this,
                $elem = $(this),
                triggered = false;
 
            if (elem.tagName in supported) {
                bndCount = $.data(elem, dataBnd) || 0;
 
                if (!bndCount)
                    $elem.bind(bindTo, handler);
 
                $.data(elem, dataBnd, ++bndCount);
                $.data(elem, dataVal, elem.value);
            } else {
                $elem.bind(dlgtTo, function (e) {
                    var target = e.target;
                    if (target.tagName in supported && !$.data(elem, dataDlg)) {
                        bndCount = $.data(target, dataBnd) || 0;
 
                        if (!bndCount)
                            target.bind(bindTo, handler);
 
                        // make sure we increase the count only once for each bound ancestor
                        $.data(elem, dataDlg, true);
                        $.data(target, dataBnd, ++bndCount);
                        $.data(target, dataVal, target.value);
                    }
                });
            }
            function handler (e) {
                var elem = e.target;
 
                // Clear previous timers because we only need to know about 1 change
                window.clearTimeout(timer), timer = null;
 
                // Return if we've already triggered the event
                if (triggered)
                    return;
 
                // paste, cut, keydown and drop all fire before the value is updated
                if (e.type in delay && !timer) {
                    // ...so we need to delay them until after the event has fired
                    timer = window.setTimeout(function () {
                        if (elem.value !== $.data(elem, dataVal)) {
                            $(elem).trigger("txtinput");
                            $.data(elem, dataVal, elem.value);
                        }
                    }, 0);
                }
                else if (e.type == "propertychange") {
                    if (e.originalEvent.propertyName == "value") {
                        $(elem).trigger("txtinput");
                        $.data(elem, dataVal, elem.value);
                        triggered = true;
                        window.setTimeout(function () {
                            triggered = false;
                        }, 0);
                    }
                }
                else {
                    $(elem).trigger("txtinput");
                    $.data(elem, dataVal, elem.value);
                    triggered = true;
                    window.setTimeout(function () {
                        triggered = false;
                    }, 0);
                }
            }
        },
        teardown: function () {
            var elem = $(this);
            elem.unbind(dlgtTo);
            elem.find("input, textarea").andSelf().each(function () {
                bndCount = $.data(this, dataBnd, ($.data(this, dataBnd) || 1)-1);
 
                if (!bndCount)
                    elem.unbind(bindTo);
            });
        }
    };
 
    // Setup our jQuery shorthand method
    $.fn.input = function (handler) {
        return handler ? this.bind("txtinput", handler) : this.trigger("txtinput");
    }
})(jQuery);