var node = require('./node');
var editor = require('./editor');
var doc = require('./doc');
var dom = require('./dom');
var runs = require('./runs');
var html = require('./html');
var frame = require('./frame');
var text = require('./text');
var rect = require('./rect');

var bundle = {
    node: node,
    editor: editor,
    document: doc,
    dom: dom,
    runs: runs,
    html: html,
    frame: frame,
    text: text,
    rect: rect
};

module.exports = bundle;

if (typeof window !== 'undefined' && window.document) {
    if (window.carota) {
        throw new Error('Something else is called carota!');
    }
    window.carota = bundle;
}
