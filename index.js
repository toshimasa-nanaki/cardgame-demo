// var http = require('http');
// http.createServer(function (request, response) {
// 	  response.writeHead(200, {'Content-Type': 'text/plain'});
// 	  response.end('Hello World2\n');
// }).listen(3000);

// console.log('Server running at http://127.0.0.1:3000');

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var store = {};

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  socket.on('createRoom', function(msg) {
    const usrobj = {
      'room': msg.roomid,
      'name': msg.name,
      'count': msg.count
    };
    console.log("createRoom:  " + msg.roomid);
    store[msg.id] = usrobj;
    socket.join(msg.roomid);
  });
  socket.on('join', function(msg) {
    const usrobj = {
      'room': msg.roomid,
      'name': msg.name
    };
    console.log(msg.roomid);
    store[msg.id] = usrobj;
    socket.join(msg.roomid);
  });
  socket.on('chat message', function(msg){
    //io.emit('chat message', socket.client.conn.server.clientsCount);
    io.to(store[msg.id].room).emit('update', socket.nsp.adapter.rooms[msg.id].length);
  });
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});
