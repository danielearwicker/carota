exports.event = function() {
    var handlers = [];

    var subscribe = function(handler) {
        handlers.push(handler);
    };

    subscribe.fire = function() {
        var args = Array.prototype.slice.call(arguments, 0);
        handlers.forEach(function(handler) {
            handler.apply(null, args);
        });
    };

    return subscribe;
};