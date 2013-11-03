var per = require('per');
var runs = require('./runs');

var prototype = {
    children: function() {
        return [];
    },
    parent: function() {
        return null;
    },
    first: function() {
        return this.children()[0];
    },
    last: function() {
        return this.children()[this.children().length - 1];
    },
    next: function() {
        var parent = this.parent();
        if (!parent) {
            return null;
        }
        var siblings = parent.children();
        var next = siblings[siblings.indexOf(this) + 1];
        if (next) {
            return next;
        }
        var nextParent = parent.next();
        return !nextParent ? null : nextParent.first();
    },
    previous: function() {
        var parent = this.parent();
        if (!parent) {
            return null;
        }
        var siblings = parent.children();
        var prev = siblings[siblings.indexOf(this) - 1];
        if (prev) {
            return prev;
        }
        var prevParent = parent.previous();
        return !prevParent ? null : prevParent.last();
    },
    getFormatting: function() {
        per(this.runs, this).reduce(runs.merge).last();
    },
    save: function() {
        return per(this.runs, this).per(runs.consolidate()).all();
    }
};

exports.derive = function(methods) {
    var properties = {};
    Object.keys(methods).forEach(function(name) {
        properties[name] = { value: methods[name] };
    });
    return Object.create(prototype, properties);
};
