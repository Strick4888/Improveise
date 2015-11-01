var express = require('express');
var app = express();
app.use(express.static('public'));

var http = require('http').Server(app);
var io = require('socket.io')(http);

//var uuid = require('node-uuid');

app.get('/', function(req, res){
    res.sendfile('index.html');
});

var msgTotal = 100; //just start with 100 for debug purposes
var alreadyUploaded = false;

io.on('connection', function(client){ //Note: client usually called "socket"
    console.log('a user connected');
    client.broadcast.emit('hi');

    client.on('disconnect', function(){
        console.log('user disconnected');
    });

    client.on('join round', function( username ){
        console.log('user joined round. name:'+username);
        client.emit( "join round", client.id ); //send only to client
        io.emit('new participant', username); //send to all
    });

    client.on('chat message', function(msg){
        console.log('message: ' + msg);
        ++msgTotal;
        msg.msgIdx = msgTotal;
        io.emit('chat message', msg); //send to all
    });

    client.on('upVote', function( rel_info ){
        console.log('id:' + rel_info.judgerUserId + " gave upvote to id:"+ rel_info.judgedMsg.userId);
        io.emit('upVote', rel_info); //send to all
    });

    client.on('downVote', function(rel_info){
        console.log('id:' + rel_info.judgerUserId + " gave downvote to id:"+ rel_info.judgedMsg.userId);
        io.emit('downVote', rel_info); //send to all
    });

    client.on('user died', function(userObj) {
        console.log('user: ' + userObj.username + " died (id:"+userObj.userId+")");
        io.emit('user died', userObj.username); //send to all
    });

    client.on('upload lines', function() {
        if ( !alreadyUploaded )
            client.emit('upload lines', true); //send to only 1 client
        alreadyUploaded = true;
    });
});

http.listen(3000, function(){
    console.log('listening on *:3000');
});