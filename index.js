const TRUMPDATA = {
    card: [
        { type: 'clover', count: 13 },
        { type: 'spade', count: 13 },
        { type: 'heart', count: 13 },
        { type: 'diamond', count: 13 }
    ],
    joker: 2
}

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var store = {};
const ORIGINALCARDDATA = trump_init(TRUMPDATA);
const shuffleCards = sort_at_random(ORIGINALCARDDATA);

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
    const count = typeof store[msg.id].count === "undefined" ? 4 : store[msg.id].count;
    if(socket.nsp.adapter.rooms[msg.id].length >= count){
      io.to(socket.id).emit('update', "もう部屋がいっぱいです");
    }else{
      socket.join(msg.roomid);
    }
  });
  socket.on('update', function(msg){
    //io.emit('chat message', socket.client.conn.server.clientsCount);
    const count = typeof store[msg.id].count === "undefined" ? 4 : store[msg.id].count;
    const retryCount = 0;
    if(socket.nsp.adapter.rooms[msg.id].length == count){
      io.to(store[msg.id].room).emit('gathered', count + "人が集まりました！！！");
      let perNum = Math.floor(54 / count);
      let remainder = 54 % count;
      let pos = 0; 
      Object.keys(socket.nsp.adapter.rooms[msg.id].sockets).forEach(function (key) {
        io.to(key).emit('gameInit', shuffleCards.slice(pos, (remainder > 0 ? pos+perNum+1 : pos+perNum)));
        pos = remainder > 0 ? pos + perNum + 1 : pos + perNum;
        remainder--; 
      });
    }else{
      io.to(store[msg.id].room).emit('update', "今の部屋の人数:  " + socket.nsp.adapter.rooms[msg.id].length);
    }
    
  });
});

function trump_init(trumpData) {
    var cards = [];
    for (var i = 0; i < trumpData['card'].length; i++) {
        var thistype = trumpData['card'][i];
        for (var j = 0; j < thistype['count']; j++) {
            cards.push({
                type: thistype['type'],
                number: j + 1
            });
        }
    }
    for (var i = 0; i < trumpData['joker']; i++) {
        cards.push({
            type: 'joker',
            number: i + 1
        });
    }
    return cards;
}

function sort_at_random(arrayData) {
    var arr = arrayData.concat();
    var arrLength = arr.length;
    var randomArr = [];
    for(var i = 0; i < arrLength; i++) {
        var randomTarget = Math.floor(Math.random() * arr.length);
        randomArr[i] = arr[randomTarget];
        arr.splice(randomTarget, 1);
    }
    return randomArr;
}

http.listen(port, function(){
  console.log('listening on *:' + port);
});
