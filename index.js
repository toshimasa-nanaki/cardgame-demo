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

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});
