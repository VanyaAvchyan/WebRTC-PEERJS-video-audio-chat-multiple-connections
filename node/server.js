const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
server.listen(4000, function() {
    console.log('listen localhost:4000 port');
});

/**
 * Save token
 */
//CORS middleware
const cors = require('cors');
const express = require('express');
app.use(cors());
app.options('*', cors());

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

app.post( '/token' , function(req, res){
    if(req.body.token)
    {
        client.set('token', req.body.token);
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end('{"message" : "Token set success"}');
    }
    res.writeHead(500, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({"message" : "post data is empty", "req_body": req.body}));
});

/**
 * Redis client
 */
var redis = require("redis"),
    client = redis.createClient();

/**
 * Authentication middlware
 */
io.use((socket, next) => {
    var token = socket.handshake.query.token;
    client.get('token', function(err, reply){
        if (token === reply)
        {
            console.log('=========== Auth success ===========\n');
            return next();
        }
    });
    console.log('========= authentication error =======\n', new Error('authentication error'));
    return next(new Error('authentication error'));
});

/**
 * Socket.io connection listener
 */
io.on('connection', function(socket)
{
    socket.join(socket.handshake.query.room);
    console.log('socket.io connection success', socket.handshake.query.room);

    socket.on('join_room', function(data)
    {
        socket.join(data.room);
        client.set('room:'+data.room, JSON.stringify(data.users));
        console.log("join_room success" , data);
    });

    socket.on('join_room_group', function(data)
    {
        data.users.forEach(function(user, key) {
            io.sockets.in(user.UUID).emit('join_room_group', data);
        });
    });

    socket.on('call_offer', function(data)
    {
        client.get('room:'+data.room, function(err, reply) {
            if(reply)
            {
                reply = JSON.parse(reply);
                reply.forEach(function(roomUser, key)
                {
                    //Select peer by user id
                    if(roomUser.UUID == data.from)
                        return;
                    io.sockets.in(data.room)
                        .emit('call_offer'+roomUser.UUID, data);
                    console.log(
                        '==== call_offer success ====\n',
                        "roomUser\n", roomUser,
                        "\ndata\n", data
                    );
                });
            } else {
                console.log('========= redis room is empty ==========\n');
            }
        });
    });

    socket.on('peer-connection', function (data) {
        client.set('user:'+data.UUID+":peer", JSON.stringify(data));
        console.log('============ peer-connection ============\n', data);
    });

    socket.on('call-hang-up', function (data)
    {
        io.sockets.in(data.room).emit('call-hang-up', data);
    });

    socket.on('call_busy', function (data)
    {
        io.sockets.in(data.room).emit('call_busy', data);
    });

    socket.on('chat_message', function (data)
    {
        io.sockets.in(data.room).emit('chat_message', data);
    });

    socket.on('remote_peers', function (active_call)
    {
        console.log(1111111);
        io.sockets.in(active_call.room).emit('remote_peers', active_call);
    });














});