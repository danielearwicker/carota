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
    if (this.start === this.end) {
        var pos = this.start;
        // take formatting of character before, if any, because that's
        // where plain text picks up formatting when inserted
        if (pos > 0) {
            pos--;
        }
        var ch = this.doc.characterByOrdinal(pos);
        return Object.create(!ch ? runs.defaultFormatting : ch.part.run);
    }
    return per(this.runs, this).reduce(runs.merge).last();
};

Range.prototype.setFormatting = function(attribute, value) {
    var range = this;
    if (attribute === 'align') {
        // Special case: expand selection to surrounding paragraphs
        range = range.doc.paragraphRange(range.start, range.end);
    }
    if (range.start === range.end) {
        // should update a "next insert" default style in the document
    } else {
        var saved = range.save();
        var template = {};
        template[attribute] = value;
        runs.format(saved, template);
        range.setText(saved);
    }
};

module.exports = function(doc, start, end) {
    return new Range(doc, start, end);
};