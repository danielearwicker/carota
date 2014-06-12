var registeredEventHandlers = [];

exports.isAttached = function(element) {
    var ancestor = element;
    while(ancestor.parentNode) {
        ancestor = ancestor.parentNode;
    }
    return !!ancestor.body;
};

exports.clear = function(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
};

exports.setText = function(element, text) {
    exports.clear(element);
    element.appendChild(document.createTextNode(text));
};

exports.handleEvent = function(element, name, handler) {
    var _handler = function(ev) {
        if (handler(ev) === false) {
            ev.preventDefault();
        }
    };

    registeredEventHandlers.push({n: name, e: element, h: _handler});
    element.addEventListener(name, _handler);
};

exports.handleMouseEvent = function(element, name, handler) {
    var _handler = function(ev) {
        var rect = element.getBoundingClientRect();
        return handler(ev, ev.clientX - rect.left, ev.clientY - rect.top);
    };

    registeredEventHandlers.push({n: name, e: element, h: _handler});
    exports.handleEvent(element, name, _handler);
};

exports.cleanupEvents = function() {
    while(registeredEventHandlers.length > 0) {
        var _handler = registeredEventHandlers.pop();
        _handler.e.removeEventListener(_handler.n, _handler.h);
    }
};

exports.effectiveStyle = function(element, name) {
    return document.defaultView.getComputedStyle(element).getPropertyValue(name);
};