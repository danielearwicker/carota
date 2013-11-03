var editor = require('./editor');
var doc = require('./doc');
var dom = require('./dom');
var runs = require('./runs');
var html = require('./html');
var measure = require('./measure');

var bundle = {
    editor: editor,
    document: doc,
    dom: dom,
    runs: runs,
    html: html,
    measure: measure
};

module.exports = bundle;

if (typeof window !== 'undefined' && window.document) {
    if (window.carota) {
        throw new Error('Something else is called carota!');
    }
    window.carota = bundle;
}
