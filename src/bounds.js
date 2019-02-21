var doc = require('./doc');

exports = module.exports = function( data, width, styles ) {
    var canvas = document.createElement( 'canvas' );
    var carota = doc( styles );
    carota.load( data );
    carota.width( width );
    carota.draw( canvas.getContext( '2d' ));
    return { width: carota.frame.actualWidth(), height: carota.frame.actualHeight() };
};
