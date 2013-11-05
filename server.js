var express = require('express');
var webmake = require('webmake');

var app = express();

app.get('/carota-debug.js', function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-cache'
    });

    webmake('src/carota.js', { cache: true }, function (err, content) {
        if (err) {
            res.end('document.write(' + JSON.stringify(err.message) + ');');
        } else {
            res.end(content);
        }
    });
});

app.use(express.static(__dirname));

app.listen(3003);