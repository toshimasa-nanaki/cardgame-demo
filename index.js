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
    // const usrobj = {
    //   'room': msg.roomid,
    //   'name': msg.name
    // };
    // console.log(msg.roomid);
    // store[msg.id] = usrobj;
    socket.join(msg.roomid);
  });
  socket.on('update', function(msg){
    //io.emit('chat message', socket.client.conn.server.clientsCount);
    const count = typeof store[msg.id].count === "undefined" ? 4 : store[msg.id].count;
    const retryCount = 0;
    while(true){
      io.to(store[msg.id].room).emit('update', "今の部屋の人数:  " + socket.nsp.adapter.rooms[msg.id].length);
      if(socket.nsp.adapter.rooms[msg.id].length == count){
        io.to(store[msg.id].room).emit('gathered', count + "人が集まりました！！！");
        break;
      }
      if(retryCount >= 10){
        io.to(store[msg.id].room).emit('update', "集まれませんでした。。");
        return;
      }
      //sleep(5000);
      retryCount++;
    }
    
  });
});

function sleep(a){
  var dt1 = new Date().getTime();
  var dt2 = new Date().getTime();
  while (dt2 < dt1 + a){
    dt2 = new Date().getTime();
  }
  return;
}

http.listen(port, function(){
  console.log('listening on *:' + port);
});
