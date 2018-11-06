var express = require('express');
var app = express();
var ExpressPeerServer = require('peer').ExpressPeerServer;

var server = app.listen(9000, function(){
    console.log('localhost:9000');
});

var options = {
    debug: true
}

var peerserver = ExpressPeerServer(server, options);

app.use('/peerjs', peerserver);

peerserver.on('connection', function(id) {

    console.log('connection id', id);

});

peerserver.on('disconnect', function(id) {
    console.log('disconnect');
});