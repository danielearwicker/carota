var per = require('per');
var runs = require('./runs');

function Range(doc, start, end) {
    this.doc = doc;
    this.start = start;
    this.end = end;
    if (start > end) {
        this.start = end;
        this.end = start;
    }
}

Range.prototype.parts = function(emit, list) {
    list = list || this.doc.children();
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

Range.prototype.clear = function() {
    return this.setText([]);
};

Range.prototype.setText = function(text) {
    return this.doc.splice(this.start, this.end, text);
};

Range.prototype.runs = function(emit) {
    this.doc.runs(emit, this);
};

Range.prototype.plainText = function() {
    return per(this.runs, this).map(runs.getPlainText).all().join('');
};

Range.prototype.save = function() {
    return per(this.runs, this).per(runs.consolidate()).all();
};

Range.prototype.getFormatting = function() {
    var range = this;
    if (range.start === range.end) {
        var pos = range.start;
        // take formatting of character before, if any, because that's
        // where plain text picks up formatting when inserted
        if (pos > 0) {
            pos--;
        }
        range.start = pos;
        range.end = pos + 1;
    }
    return per(range.runs, range).reduce(runs.merge).last() || runs.defaultFormatting;
};

Range.prototype.setFormatting = function(attribute, value) {
    var range = this;
    if (attribute === 'align') {
        // Special case: expand selection to surrounding paragraphs
        range = range.doc.paragraphRange(range.start, range.end);
    }
    if (range.start === range.end) {
        range.doc.modifyInsertFormatting(attribute, value);
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