const TRUMPDATA = {
  card: [
    { type: "clover", count: 13 },
    { type: "spade", count: 13 },
    { type: "heart", count: 13 },
    { type: "diamond", count: 13 }
  ],
  joker: 2
};

var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http);
// io.set('heartbeat interval', 5000);
// io.set('heartbeat timeout', 15000);
var port = process.env.PORT || 3000;
var store = {};
const ORIGINALCARDDATA = trump_init(TRUMPDATA);
const shuffleCards = sort_at_random(ORIGINALCARDDATA);
let gameStart = false;
let nowCard = "";
let ORDER = [];
let elevenbackFlag = false;
let revolutionFlag = false;
let shibari = false;
let pass = 0;
let seiseki = [];
let rank = 0;
let rankTable = [];
let UserList = {};

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/index.html");
});

io.on("connection", function(socket) {
  // socket.on('disconnect', function () {
  //   //TODO ゲームがすでに始まっている場合は解散
  //     console.log(socket);
  // });
  socket.on("createRoom", function(msg) {
    const usrobj = {
      room: msg.roomid,
      name: msg.name,
      count: msg.count
    };
    console.log("createRoom:  " + msg.roomid);
    store[msg.id] = usrobj;
    UserList[socket.id] = msg.playerName;
    socket.join(msg.roomid);
  });
  socket.on("join", function(msg) {
    const count =
      typeof store[msg.id].count === "undefined" ? 4 : store[msg.id].count;
    if (socket.nsp.adapter.rooms[msg.id].length >= count) {
      io.to(socket.id).emit("update", "もう部屋がいっぱいです");
    } else {
      UserList[socket.id] = msg.playerName;
      socket.join(msg.roomid);
    }
  });
  socket.on("update", function(msg) {
    const count =
      typeof store[msg.id].count === "undefined" ? 4 : store[msg.id].count;
    const retryCount = 0;
    if (socket.nsp.adapter.rooms[msg.id].length == count) {
      nowCard = "";
      let perNum = Math.floor(54 / count);
      let remainder = 54 % count;
      let pos = 0;
      ORDER = [];
      rank = 0;
      createRankTable(count);

      Object.keys(socket.nsp.adapter.rooms[msg.id].sockets).forEach(function(
        key
      ) {
        ORDER.push({
          id: key,
          card: remainder > 0 ? perNum + 1 : perNum,
          rank: ""
        });
        var cardNum = remainder > 0 ? pos + perNum + 1 : pos + perNum;
        io.to(key).emit(
          "gameInit",
          shuffleCards
            .slice(pos, remainder > 0 ? pos + perNum + 1 : pos + perNum)
            .sort(function(a, b) {
              if (a.number < b.number) return -1;
              if (a.number > b.number) return 1;
              return 0;
            })
        );
        //seiseki[key]=
        if (ORDER[0].id == key) {
          io.to(key).emit("order", { flag: true, skip: false });
        } else {
          io.to(key).emit("order", {
            flag: false,
            skip: false,
            playerName: UserList[ORDER[0].id]
          });
        }
        pos = remainder > 0 ? pos + perNum + 1 : pos + perNum;
        remainder--;
      });
    } else {
      io.to(store[msg.id].room).emit(
        "update",
        "今の部屋の人数:  " + socket.nsp.adapter.rooms[msg.id].length
      );
    }
  });
  socket.on("pass", function(msg) {
    pass++;
    const count =
      typeof store[msg.id].count === "undefined" ? 4 : store[msg.id].count;
    if (pass >= count - 1) {
      //パスで一周した場合流す
      nowCard = "";
      pass = 0;
      elevenbackFlag = false;
      shibari = false;
      io.to(store[msg.id].room).emit("changeStatus", { type: "cutPass" });
    }
    let currentTurn;
    let currentPlayer = ORDER.filter(function(item, index) {
      if (item.id == socket.id) {
        currentTurn = index;
        return true;
      }
    });

    let nextTurn = currentTurn != ORDER.length - 1 ? currentTurn + 1 : 0;
    ORDER.forEach(function(element) {
      if (element.id != ORDER[nextTurn].id) {
        io.to(element.id).emit("order", {
          flag: false,
          skip: false,
          playerName: UserList[ORDER[nextTurn].id]
        });
      }
    });
    // io.to(ORDER[currentTurn].id).emit("order", {flag: false, skip: false, playerName: UserList[ORDER[nextTurn].id]});
    io.to(ORDER[nextTurn].id).emit("order", {
      flag: true,
      skip: ORDER[nextTurn].rank != "" ? true : false
    });
  });
  socket.on("validate", function(msg) {
    let currentTurn;
    let currentPlayer = ORDER.filter(function(item, index) {
      if (item.id == socket.id) {
        currentTurn = index;
        return true;
      }
    });
    if (nowCard != "") {
      if (nowCard.cards.length != msg.cards.length) {
        //枚数が違うのはあり得ない
        io.to(socket.id).emit("validateError", {
          card: msg,
          error: 1,
          reason: "枚数が違うよね"
        });
        return;
      }
      //数字はすべて同じだよね？
      if (!isSameNumber(msg.cards)) {
        io.to(socket.id).emit("validateError", {
          card: msg,
          error: 1,
          reason: "数字は全部同じにしてね"
        });
        return;
      }
      //縛り
      if(shibari && !isSameType(nowCard.cards, msg.cards)){
        io.to(socket.id).emit('validateError', {card: msg, error:1, reason:"縛りです"});
        return;
      }
      //数字を比べる
      if (!numComparison(nowCard.cards[0], msg.cards[0])) {
        io.to(socket.id).emit("validateError", {
          card: msg,
          error: 1,
          reason: "弱いカードはおけない"
        });
        return;
      }
      if (
        ~nowCard.cards[0].type.indexOf("joker") &&
        msg.cards[0].type == "spade" &&
        msg.cards[0].number == "3"
      ) {
        //JOKER討伐(誰も倒せないから流す)
        nowCard = "";
        io.to(store[msg.id].room).emit("changeStatus", {
          type: "winjoker",
          value: msg
        });
        pass = 0;
        elevenbackFlag = false;
        shibari = false;
        console.log(
          "スペ3プレイヤー名:" +
            UserList[socket.id] +
            "　出したカードの数：" +
            msg.cards.length
        );
        ORDER[currentTurn].card = ORDER[currentTurn].card - msg.cards.length;
        return;
      }
      if (!shibari && isShibari(nowCard.cards, msg.cards)) {
        shibari = true;
      io.to(store[msg.id].room).emit("changeStatus", {
        type: "shibari",
        value: shibari
      });
      }
    }

    if (msg.cards.length == 2 && ~msg.cards[0].type.indexOf("joker") && ~msg.cards[1].type.indexOf("joker")) {
      //JOKER2枚だしは歯が立たないので流す
      nowCard = "";
        io.to(store[msg.id].room).emit("changeStatus", {
          type: "doblejoker",
          value: msg
        });
        pass = 0;
        elevenbackFlag = false;
        shibari = false;
        ORDER[currentTurn].card = ORDER[currentTurn].card - msg.cards.length;
        return;
    }
    if (msg.cards.length == 4) {
      //革命
      revolutionFlag = !revolutionFlag;
      io.to(store[msg.id].room).emit("changeStatus", {
        type: "revolution",
        value: revolutionFlag
      });
    }
    if (msg.cards[0].number == 8) {
      //8ぎり
      nowCard = "";
      io.to(store[msg.id].room).emit("changeStatus", {
        type: "cut8",
        value: msg
      });
      pass = 0;
      elevenbackFlag = false;
      shibari = false;
      console.log(
        "8ぎりプレイヤー名:" +
          UserList[socket.id] +
          "　出したカードの数：" +
          msg.cards.length
      );
      ORDER[currentTurn].card = ORDER[currentTurn].card - msg.cards.length;
      return;
    }
    if (msg.cards[0].number == 11) {
      //11back
      elevenbackFlag = !elevenbackFlag;
      io.to(store[msg.id].room).emit("changeStatus", {
        type: "elevenback",
        value: elevenbackFlag
      });
    }
    pass = 0;
    nowCard = msg;
    io.to(store[msg.id].room).emit("result", {
      card: msg,
      error: 0,
      reason: "",
      result: nowCard
    });

    //成績をここでつける
    console.log(
      "プレイヤー名:" +
        UserList[socket.id] +
        "　出したカードの数：" +
        msg.cards.length
    );
    ORDER[currentTurn].card = ORDER[currentTurn].card - msg.cards.length;
    if (ORDER[currentTurn].card <= 0) {
      //上がり
      //まずは反則あがりをチェック
      //・スペ3一枚で上がってない？
      //・8またはJOKER含まれてない？
      // ・革命時に3
      //・非革命時に2
      if((msg.cards[0].number == 3 && msg.cards[0].type == "spade" && msg.cards.length==1) || 
         msg.cards[0].number == 8 || ~msg.cards[0].type.indexOf("joker") || 
         (revolutionFlag && msg.cards[0].number == 3) || (!revolutionFlag && msg.cards[0].number == 2)){
        ORDER[currentTurn].rank = rankTable[ORDER.length - 1];
      }else{
        ORDER[currentTurn].rank = rankTable[rank];
      }
      io.to(ORDER[currentTurn].id).emit("finish", rankTable[rank]);
      io.to(store[msg.id].room).emit("finishNotification", {rank: ORDER[currentTurn].rank, playerName: UserList[ORDER[currentTurn].id]});
      rank++;
      if(rank == ORDER.length - 1){
        //つまり全員終了
        let biri = ORDER.filter(item => ~item.type.indexOf("joker"))[0].id;
        io.to(biri).emit("finish", rankTable[rank]);
        io.to(store[msg.id].room).emit("finishNotification", {rank: ORDER[currentTurn].rank, playerName: UserList[ORDER[currentTurn].id]});
        io.to(store[msg.id].room).emit("gameFinish", "");
      }
    }

    let nextTurn = currentTurn != ORDER.length - 1 ? currentTurn + 1 : 0;
    ORDER.forEach(function(element) {
      if (element.id != ORDER[nextTurn].id) {
        io.to(element.id).emit("order", {
          flag: false,
          skip: false,
          playerName: UserList[ORDER[nextTurn].id]
        });
      }
    });
    io.to(ORDER[nextTurn].id).emit("order", {
      flag: true,
      skip: ORDER[nextTurn].rank != "" ? true : false
    });
  });
});

function trump_init(trumpData) {
  var cards = [];
  for (var i = 0; i < trumpData["card"].length; i++) {
    var thistype = trumpData["card"][i];
    for (var j = 0; j < thistype["count"]; j++) {
      cards.push({
        type: thistype["type"],
        number: j + 3
      });
    }
  }
  for (var i = 0; i < trumpData["joker"]; i++) {
    cards.push({
      type: "joker" + (i + 1),
      number: 99
    });
  }
  return cards;
}

function sort_at_random(arrayData) {
  var arr = arrayData.concat();
  var arrLength = arr.length;
  var randomArr = [];
  for (var i = 0; i < arrLength; i++) {
    var randomTarget = Math.floor(Math.random() * arr.length);
    randomArr[i] = arr[randomTarget];
    arr.splice(randomTarget, 1);
  }
  return randomArr;
}

function isShibari(ncs, scs) {
  if (
    scs.some(item => ~item.type.indexOf("joker")) ||
    ncs.some(item => ~item.type.indexOf("joker"))
  ) {
    return false;
  }
  var flag = false;
  for (let i = 0; i < ncs.length; i++) {
    flag = scs.some(item => item.type === ncs[i].type);
    if(!flag){
      //一回でも一致しなければfalse
      return false;
    }
  }
  return flag;
}

function isSameNumber(cards) {
  let base = cards[0].number;
  if (cards.length == 1) {
    return true;
  }
  for (let i = 1; i < cards.length; i++) {
    if (~cards[i].type.indexOf("joker")) {
      continue;
    }
    // if (cards[i].type == "joker") {
    //   continue;
    // }
    if (base != cards[i].number) {
      return false;
    }
  }
  return true;
}

function isSameType(ncs, scs){
  //まずジョーカーの数を数える
  let jokerCount = scs.filter(item => ~item.type.indexOf("joker")).length;
  // if (
  //   scs.some(item => ~item.type.indexOf("joker")) ||
  //   ncs.some(item => ~item.type.indexOf("joker"))
  // ) {
  //   return true;
  // }
  var flag = false;
  for (let i = 0; i < ncs.length; i++) {
    flag = scs.some(item => item.type === ncs[i].type);
    if(!flag){
      if(jokerCount > 0){
        //Joker置き換え
        flag = true;
        jokerCount--;
        continue;        
      }else{
        if(~ncs[i].type.indexOf("joker")){
          //相手がjokerだった場合は好きなマークで置き換え可能
          flag = true;
          continue;
        }else{
          //一回でも一致しなければfalse
          return false;
        }
      }
    }
  }
  return flag;
}

function numComparison(nc, sc) {
  if (~nc.type.indexOf("joker") && sc.type == "spade" && sc.number == "3") {
    return true;
  }
  if (elevenbackFlag && revolutionFlag) {
    return nc.number < sc.number;
  } else if (elevenbackFlag || revolutionFlag) {
    //逆残
    return nc.number > sc.number;
  } else {
    return nc.number < sc.number;
  }
}

function createRankTable(count) {
  //初期化しておく
  rankTable = [];
  if (count == 2) {
    rankTable = ["hugou", "hinmin"];
  } else if (count == 3) {
    rankTable = ["hugou", "heimin", "hinmin"];
  } else if (count == 4) {
    rankTable = ["daihugou", "hugou", "hinmin", "daihinmin"];
  } else {
    rankTable = ["daihugou", "hugou"];
    for (let i = 0; i < count - 4; i++) {
      rankTable.push("heimin");
    }
    rankTable.push("hinmin");
    rankTable.push("daihinmin");
  }
}

http.listen(port, function() {
  console.log("listening on *:" + port);
});
