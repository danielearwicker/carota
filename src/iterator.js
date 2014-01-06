'use strict';

var iterator = function(ar, pos) {
    return {
        advance: function() {
            if (pos === ar.length - 1) {
                return false;
            }
            pos++;
            return true;
        },
        current: function() {
            if (pos === -1) {
                throw new Error('Call advance first!');
            }
            return ar[pos];
        },
        position: function() {
            return pos;
        },
        clone: function() {
            return iterator(ar, pos);
        }
    };
};

module.exports = function(ar) {
    return iterator(ar, -1);
};
