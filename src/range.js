var per = require('per');
var runs = require('./runs');

function Range(doc, start, end) {
    this.doc = doc;
    this.start = start;
    this.end = end;
}

Range.prototype.parts = function(emit, list) {
    list = list || this.doc.lines;
    var self = this;

    list.some(function(item) {
        if (item.ordinal + item.length <= self.start) {
            return false;
        }
        if (item.ordinal >= self.end) {
            return true;
        }
        if (item.ordinal >= self.start &&
            item.ordinal + item.length <= self.end) {
            emit(item);
        } else {
            self.parts(emit, item.children());
        }
    });
};

Range.prototype.plainText = function() {
    return per(this.parts, this).map('x.plainText()').all().join('');
};

Range.prototype.clear = function() {
    return this.setText([]);
};

Range.prototype.setText = function(text) {
    return this.doc.splice(this.start, this.end, text);
};

Range.prototype.runs = function(emit) {
    this.parts(function(part) { part.runs(emit); });
};

Range.prototype.save = function() {
    return per(this.runs, this).per(runs.consolidate()).all();
};

Range.prototype.getFormatting = function() {
    return per(this.runs, this).reduce(runs.merge).last();
};

Range.prototype.setFormatting = function(runTemplate) {
    var saved = this.save();
    runs.format(saved, runTemplate);
    this.setText(saved);
};

module.exports = function(doc, start, end) {
    return new Range(doc, start, end);
};