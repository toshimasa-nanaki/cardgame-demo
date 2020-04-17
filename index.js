const TRUMPDATA = {
  card: [
    { type: "clover", count: 13 },
    { type: "spade", count: 13 },
    { type: "heart", count: 13 },
    { type: "diamond", count: 13 }
  ],
  joker: 2
};

var express = require("express");
var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http);
const log4js = require('log4js')
const logger = log4js.getLogger();
logger.level = 'debug';
// io.set('heartbeat interval', 5000);
// io.set('heartbeat timeout', 15000);
var port = process.env.PORT || 3000;
var store = {};
const ORIGINALCARDDATA = trump_init(TRUMPDATA);
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
app.use("/css", express.static("public/css"));
app.use("/js", express.static("public/js"));

io.on("connection", function(socket) {
  //最初の接続時に現在のルーム一覧を送る
  console.log(JSON.stringify(store));
  io.to(socket.id).emit("showRoomList", store);

  socket.on("disconnect", function() {
    //TODO ゲームがすでに始まっている場合は解散
    console.log(Object.keys(store));
    const roomIds = Object.keys(store);
    roomIds.forEach(roomId => {
      if (~Object.keys(store[roomId].users).indexOf(socket.id)) {
        console.log(socket.id + "が" + roomId + "から退出");
        delete store[roomId]["users"][socket.id];
        delete UserList[socket.id];
        socket.leave(roomId);
      }
    });
  });
  socket.on("requestRoomCreate", function(roomInfo) {
    const createRoomId = uniqueId();
    const roomObj = {
      roomId: createRoomId,
      roomDispName:
        roomInfo.dispName == "" ? createdDefaultRoomName() : roomInfo.dispName,
      capacity: roomInfo.capacity == "" ? 4 : roomInfo.capacity,
      gameNum: 1
    };
    store[createRoomId] = roomObj;
    //console.log("Store情報:  " + JSON.stringify(store));
    logger.info("createdRoom:  " + roomObj.roomDispName);
    io.emit("createdRoom", { [createRoomId]: roomObj });
  });
  socket.on("join", function(joinInfo) {
    // const count =
    //   typeof store[joinInfo.roomId].capacity === "undefined" ? 4 : store[joinInfo.id].capacity;
    console.log("部屋入り情報:" + JSON.stringify(joinInfo));
    const count = store[joinInfo.roomId].capacity;
    //if (socket.nsp.adapter.rooms[msg.id].length >= count) {
    if (Object.keys(UserList).length >= count) {
      io.to(socket.id).emit("connectError", "もう部屋がいっぱいです");
      return;
    } else {
      if (typeof store[joinInfo.roomId]["users"] === "undefined") {
        store[joinInfo.roomId]["users"] = {
          [socket.id]: { dispName: joinInfo.playerName, card: [], rank: "" }
        };
      } else {
        store[joinInfo.roomId]["users"][socket.id] = {
          dispName: joinInfo.playerName,
          card: [],
          rank: ""
        };
      }
      console.log(
        "User追加後のStore情報:  " +
          JSON.stringify(store[joinInfo.roomId]["users"])
      );
      //store[joinInfo.roomId]['users'] = {'dispName': joinInfo.playerName, 'card': 0, 'rank': ''}
      //console.log("Store情報:  " + JSON.stringify(store));
      UserList[socket.id] = joinInfo.playerName;
      socket.join(joinInfo.roomId);
      io.to(socket.id).emit("joinedRoom", UserList);
      Object.keys(UserList).forEach(function(key) {
        if (key != socket.id) {
          io.to(key).emit("otherMemberJoinedRoom", joinInfo.playerName);
        }
      });
    }
    if (Object.keys(UserList).length == count) {
      //人数がそろった場合は、メンバー全員に通知する
      gameInit(count, UserList, joinInfo.roomId);
      io.to(joinInfo.roomId).emit("gameReady", UserList);
    }
  });
  //再戦
  socket.on("rematch", function(msg) {
    const count = store[msg.id].capacity;
    // typeof store[msg.id].capacity === "undefined" ? 4 : store[msg.id].capacity;

    //if (socket.nsp.adapter.rooms[msg.id].length == count) {
    if (Object.keys(UserList).length == count) {
      //人数がそろっているのか確認
      gameInit(count, socket.nsp.adapter.rooms[msg.id].sockets, msg.id);
    } else {
      //TODO 解散
      console.log("人数が足りないので解散する");
    }
  });
  // socket.on("update", function(msg) {
  //   // const count =
  //   //   typeof store[msg.id].capacity === "undefined" ? 4 : store[msg.id].capacity;
  //   //if (socket.nsp.adapter.rooms[msg.id].length == count) {
  //   const count = store[msg.id].capacity;
  //   if (Object.keys(UserList).length == count) {
  //     gameInit(count, socket.nsp.adapter.rooms[msg.id].sockets);
  //   } else {
  //     io.to(store[msg.id].roomId).emit(
  //       "update",
  //       "今の部屋の人数:  " + socket.nsp.adapter.rooms[msg.id].length
  //     );
  //   }
  // });
  socket.on("pass", function(msg) {
    pass++;
    const count =
      typeof store[msg.id].capacity === "undefined"
        ? 4
        : store[msg.id].capacity;
    if (pass >= count - 1) {
      //パスで一周した場合流す
      nowCard = "";
      pass = 0;
      elevenbackFlag = false;
      shibari = false;
      io.to(store[msg.id].roomId).emit("changeStatus", { type: "cutPass" });
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
    //数字はすべて同じだよね？
    //TODO 階段対応ができない
    if (!isSameNumber(msg.cards)) {
      io.to(socket.id).emit("validateError", {
        card: msg,
        error: 1,
        reason: "数字は全部同じにしてね"
      });
      return;
    }

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
      //縛り
      if (shibari && !isSameType(nowCard.cards, msg.cards)) {
        io.to(socket.id).emit("validateError", {
          card: msg,
          error: 1,
          reason: "縛りです"
        });
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
        io.to(store[msg.id].roomId).emit("changeStatus", {
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
        io.to(store[msg.id].roomId).emit("changeStatus", {
          type: "shibari",
          value: shibari
        });
      }
    }

    if (
      msg.cards.length == 2 &&
      ~msg.cards[0].type.indexOf("joker") &&
      ~msg.cards[1].type.indexOf("joker")
    ) {
      //JOKER2枚だしは歯が立たないので流す
      nowCard = "";
      io.to(store[msg.id].roomId).emit("changeStatus", {
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
      io.to(store[msg.id].roomId).emit("changeStatus", {
        type: "revolution",
        value: revolutionFlag
      });
    }
    if (msg.cards[0].number == 8) {
      //8ぎり
      nowCard = "";
      io.to(store[msg.id].roomId).emit("changeStatus", {
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
      io.to(store[msg.id].roomId).emit("changeStatus", {
        type: "elevenback",
        value: elevenbackFlag
      });
    }
    pass = 0;
    nowCard = msg;
    io.to(store[msg.id].roomId).emit("result", {
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
      if (
        (msg.cards[0].number == 3 &&
          msg.cards[0].type == "spade" &&
          msg.cards.length == 1) ||
        msg.cards[0].number == 8 ||
        ~msg.cards[0].type.indexOf("joker") ||
        (revolutionFlag && msg.cards[0].number == 3) ||
        (!revolutionFlag && msg.cards[0].number == 2)
      ) {
        ORDER[currentTurn].rank = rankTable[ORDER.length - 1];
      } else {
        ORDER[currentTurn].rank = rankTable[rank];
      }
      io.to(ORDER[currentTurn].id).emit("finish", rankTable[rank]);
      io.to(store[msg.id].roomId).emit("finishNotification", {
        rank: ORDER[currentTurn].rank,
        playerName: UserList[ORDER[currentTurn].id]
      });
      rank++;
      if (rank == ORDER.length - 1) {
        //つまり全員終了
        let biri = ORDER.filter(item => item.rank.length == 0)[0].id;
        console.log(biri);
        io.to(biri).emit("finish", rankTable[rank]);
        io.to(store[msg.id].roomId).emit("finishNotification", {
          rank: rankTable[rank],
          playerName: UserList[biri]
        });
        io.to(store[msg.id].roomId).emit("gameFinish", "");
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

let uniqueId = function(digits) {
  var strong = typeof digits !== "undefined" ? digits : 1000;
  return (
    Date.now().toString(16) + Math.floor(strong * Math.random()).toString(16)
  );
};

let createdDefaultRoomName = function() {
  let now = new Date();
  return (
    now.getFullYear() +
    "_" +
    (now.getMonth() + 1) +
    "_" +
    now.getDate() +
    "_" +
    now.getHours() +
    ":" +
    now.getMinutes() +
    ":" +
    now.getSeconds()
  );
};

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

//枚数確認
function isMatchNumCards(ncs, scs) {}

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
    if (!flag) {
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

function isSameType(ncs, scs) {
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
    if (!flag) {
      if (jokerCount > 0) {
        //Joker置き換え
        flag = true;
        jokerCount--;
        continue;
      } else {
        if (~ncs[i].type.indexOf("joker")) {
          //相手がjokerだった場合は好きなマークで置き換え可能
          flag = true;
          continue;
        } else {
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
    //スペ3はジョーカーに勝てる
    return true;
  }
  if (~sc.type.indexOf("joker") && nc.type == "spade" && nc.number == "3") {
    //ジョーカーはスペ3に勝てない
    return false;
  }
  if (elevenbackFlag && revolutionFlag) {
    return nc.number < sc.number;
  } else if (elevenbackFlag || revolutionFlag) {
    //逆残
    if (~sc.type.indexOf("joker")) {
      //ジョーカーは必ず勝てる
      return true;
    }
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

function gameInit(count, sockets, roomId) {
  nowCard = "";
  let perNum = Math.floor(54 / count);
  let remainder = 54 % count;
  let pos = 0;
  ORDER = [];
  rank = 0;
  createRankTable(count);
  elevenbackFlag = false;
  shibari = false;
  revolutionFlag = false;
  let shuffleCards = sort_at_random(ORIGINALCARDDATA);
  store[roomId]['order'] = [];
  
  //まずは順番決め
  decideOrder(roomId);
  
  //カード配布
  handOutCards(count, roomId);

  Object.keys(sockets).forEach(function(key) {
    ORDER.push({
      id: key,
      card: remainder > 0 ? perNum + 1 : perNum,
      rank: ""
    });
    // var cardNum = remainder > 0 ? pos + perNum + 1 : pos + perNum;
    store[roomId]['users'][key].card = shuffleCards
        .slice(pos, remainder > 0 ? pos + perNum + 1 : pos + perNum)
        .sort(function(a, b) {
          if (a.number < b.number) return -1;
          if (a.number > b.number) return 1;
          return 0;
        })
    io.to(key).emit(
      "gameInit",
      store[roomId]['users'][key].card
      // shuffleCards
      //   .slice(pos, remainder > 0 ? pos + perNum + 1 : pos + perNum)
      //   .sort(function(a, b) {
      //     if (a.number < b.number) return -1;
      //     if (a.number > b.number) return 1;
      //     return 0;
      //   })
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
}

function decideOrder(roomId){
  if(store[roomId].gameNum == 1){
    //1回目の場合は部屋に入った順
    Object.keys(store[roomId]['users']).forEach(key => {
      store[roomId]['order'].push(key);
    });
    logger.debug("第1回ゲームの順序: " + store[roomId]['order']);
  }else{
    //2回目以降は大貧民が一番。時計回りという概念がないので、とりあえず順位の逆順にする。(オリジナル)
    //TODO? 実際は大貧民から時計回り。
  }
}

function handOutCards(count, roomId){
  const shuffleCards = sort_at_random(ORIGINALCARDDATA);
  const perNum = Math.floor(54 / count);
  let remainder = 54 % count;
  let pos = 0;
  Object.keys(store[roomId]['users']).forEach(key => {
      store[roomId]['users'][key].card = shuffleCards
        .slice(pos, remainder > 0 ? pos + perNum + 1 : pos + perNum)
        .sort(function(a, b) {
          if (a.number < b.number) return -1;
          if (a.number > b.number) return 1;
          return 0;
        });
    pos = remainder > 0 ? pos + perNum + 1 : pos + perNum;
    remainder--;
    logger.debug(key +"の持ちカード： " + JSON.stringify(store[roomId]['users'][key].card));
  });
}

http.listen(port, function() {
  console.log("listening on *:" + port);
});
