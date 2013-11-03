
exports.isAttached = function(element) {
    var ancestor = element;
    while(ancestor.parentNode) {
        ancestor = ancestor.parentNode;
    }
    return !!ancestor.body;
};

exports.handleEvent = function(element, name, handler) {
    element.addEventListener(name, function(ev) {
        if (handler(ev) === false) {
            ev.preventDefault();
        }
    });
}

exports.handleMouseEvent = function(element, name, handler) {
    exports.handleEvent(element, name, function(ev) {
        var rect = element.getBoundingClientRect();
        return handler(ev, ev.clientX - rect.left, ev.clientY - rect.top);
    });
};
