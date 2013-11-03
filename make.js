var webmake = require('webmake');
var minify = require('node-minify');

webmake('src/carota.js', { output: 'carota-debug.js' }, function(result) {
    if (!result) {
        console.log('All good');
    } else {
        console.log(result);
    }
});

new minify.minify({
    type: 'uglifyjs',
    fileIn: 'carota-debug.js',
    fileOut: 'carota-min.js',
    callback: function(err, min){
        if (err) {
            console.log(err);
        }
    }
});
