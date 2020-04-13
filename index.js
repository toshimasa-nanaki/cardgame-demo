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
let nowCard = "";
let ORDER = {};
let elevenbackFlag = false;
let revolutionFlag = false;
let shibari = false;

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
      ORDER = socket.nsp.adapter.rooms[msg.id].sockets;
      Object.keys(socket.nsp.adapter.rooms[msg.id].sockets).forEach(function (key) {
        io.to(key).emit('gameInit', shuffleCards.slice(pos, (remainder > 0 ? pos+perNum+1 : pos+perNum)));
        if(Object.keys(ORDER)[0] == key){
          io.to(key).emit('order', true);
        }else{
          io.to(key).emit('order', false);
        }
        pos = remainder > 0 ? pos + perNum + 1 : pos + perNum;
        remainder--;
      });
    }else{
      io.to(store[msg.id].room).emit('update', "今の部屋の人数:  " + socket.nsp.adapter.rooms[msg.id].length);
    }
    
  });
  socket.on('validate', function(msg) {
    if(nowCard == ""){
      nowCard = msg;
      io.to(socket.id).emit('validateResult', {card: msg, error:0, reazon:""});
      let currentTurn = Object.keys(ORDER).indexOf(socket.id);
      let nextTurn = currentTurn != ORDER.length -1 ? currentTurn+1 : 0;
      io.to(Object.keys(ORDER)[currentTurn]).emit('order', false);
      io.to(Object.keys(ORDER)[nextTurn]).emit('order', true);
    }else{
      if(nowCard.cards.length != msg.cards.length){
        //枚数が違うのはあり得ない
        io.to(socket.id).emit('validateResult', {card: msg, error:1, reazon:"枚数が違うよね"});
      }
      //数字はすべて同じだよね？
      if(!isSameNumber(msg.cards)){
        io.to(socket.id).emit('validateResult', {card: msg, error:1, reazon:"数字は全部同じにしてね"});
      }
      //数字を比べる
      if(!numComparison(nowCard.cards[0].number, msg.cards[0].number)){
        
      }
      
      if(msg.cards[0].number == 8){
        //8ぎり
        nowCard = "";
        
      }
    }
    console.log(msg);
  });
});

function trump_init(trumpData) {
    var cards = [];
    for (var i = 0; i < trumpData['card'].length; i++) {
        var thistype = trumpData['card'][i];
        for (var j = 2; j < thistype['count']; j++) {
            cards.push({
                type: thistype['type'],
                number: j + 1
            });
        }
    }
    for (var i = 0; i < trumpData['joker']; i++) {
        cards.push({
            type: 'joker',
            number: 99
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

function isSameNumber(cards){
  let base = cards[0].number;
  if(cards.length == 1){
    return true;
  }
  for(let i = 1; i < cards.length; i++){
    if(cards[i].type == "joker"){
      continue;
    }
    if(base != cards[i].number){
      return false;
    }
  }
  return true;
}

function numComparison(nowCard, sendCard){
  if(nowCard == 99 && )
  if(elevenbackFlag || revolutionFlag){
    //逆残
    return nowCard > sendCard;
  }else{
    //かつも含めて普通
    return nowCard < sendCard;
  }
}

http.listen(port, function(){
  console.log('listening on *:' + port);
});
