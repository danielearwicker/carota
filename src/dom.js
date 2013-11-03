
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
    element.addEventListener(name, function(ev) {
        if (handler(ev) === false) {
            ev.preventDefault();
        }
    });
};

exports.handleMouseEvent = function(element, name, handler) {
    exports.handleEvent(element, name, function(ev) {
        var rect = element.getBoundingClientRect();
        return handler(ev, ev.clientX - rect.left, ev.clientY - rect.top);
    });
};

exports.effectiveStyle = function(element, name) {
    return document.defaultView.getComputedStyle(element).getPropertyValue(name);
};