require('webmake')('src/carota.js', { output: 'carota-bundle.js' }, function(result) {
    if (!result) {
        console.log('All good');
    } else {
        console.log(result);
    }
});

