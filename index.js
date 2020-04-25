"use strict";

const commonUtil = require("./commonUtil.js");
const gameUtil = require("./gameUtil.js");
const storeData = require("./storeData.js");
const loggerUtil = require("./loggerUtil.js");
const LOGGER = loggerUtil.logger;
const commonRequire = require("./commonRequire.js");
const notifyUtil = require("./notifyUtil.js");
const validateUtil = require("./validateUtil.js");

var SocketEvent = require("./socketEvent");
//LOGGER.level = "debug";
// io.set('heartbeat interval', 5000);
// io.set('heartbeat timeout', 15000);
var port = process.env.PORT || 3000;
//debug用フラグ
const debug = process.env.DEBUG === "true" ? true : false;

commonRequire.app.get("/", function(req, res) {
  res.sendFile(__dirname + "/index.html");
});
commonRequire.app.use("/css", commonRequire.express.static("public/css"));
commonRequire.app.use("/js", commonRequire.express.static("public/js"));

commonRequire.io.on("connection", socket => {
  //最初の接続時に現在のルーム一覧を送る
  LOGGER.debug(JSON.stringify(storeData.persistentData));
  commonRequire.io.to(socket.id).emit("showRoomList", storeData.persistentData);

  SocketEvent.load_common_event(socket);
  SocketEvent.load_room_event(socket);
  SocketEvent.load_game_event(socket);

  //再戦
  socket.on("rematch", function(msg) {
    const count = storeData.persistentData[msg.id].capacity;
    if (Object.keys(storeData.persistentData[msg.id]["users"]).length == count) {
      //人数がそろっているのか確認
      gameUtil.gameInit(count, socket.nsp.adapter.rooms[msg.id].sockets, msg.id);
    } else {
      //TODO 解散
      console.log("人数が足りないので解散する");
    }
  });

  socket.on("giveCardReady", msg => {});
  socket.on("giveToLowerStatus2", msg => {
    //大富豪から大貧民への送り
    notifyUtil.notifyGameReady(msg.id);
  });
  socket.on("giveToLowerStatus1", msg => {
    //富豪から貧民への送り
    notifyUtil.notifyGameReady(msg.id);
  });

  socket.on("validate", function(msg) {
    const orderList = storeData.persistentData[msg.id]["order"];
    const users = storeData.persistentData[msg.id]["users"];
    let currentTurn = orderList.indexOf(socket.id);
    //最初に来たカードは昇順ソートしておく。(念のため)
    let validateCards = msg.cards.sort(function(a, b) {
      if (a.number < b.number) return -1;
      if (a.number > b.number) return 1;
      return 0;
    });
    let fieldCards = storeData.persistentData[msg.id]["fieldCards"];

    /* 受け取ったカードのみで判定可能な部分 */
    //役をチェック
    let resultCheckHand = validateUtil.checkValidateHand(validateCards);
    if (resultCheckHand.error !== 0) {
      commonRequire.io.to(socket.id).emit("validateError", {
        card: msg,
        error: 1,
        reason: "handError"
      });
      return;
    }

    /* 場のカードとの比較判定 */
    LOGGER.debug("場のカード:" + JSON.stringify(fieldCards));
    const resultCardCompare = cardCompareValidate(
      fieldCards,
      validateCards,
      resultCheckHand.type,
      msg.id
    );
    if (resultCardCompare.error != 0) {
      commonRequire.io.to(socket.id).emit("validateError", {
        card: msg,
        error: 1,
        reason: resultCardCompare.reason
      });
      return;
    }
    if (fieldCards.length != 0) {
      if (
        ~fieldCards[0].type.indexOf("joker") &&
        validateCards[0].type == "spade" &&
        validateCards[0].number == "3"
      ) {
        //JOKER討伐(誰も倒せないから流す)
        storeData.fieldClear(msg.id);
        commonRequire.io.to(storeData.persistentData[msg.id].roomId).emit("changeStatus", {
          type: "winjoker",
          value: msg,
          playerName: users[socket.id].dispName
        });
        //ストアからカードを抜きだす
        removeCard(validateCards, socket.id, msg.id);

        return;
      }
      const shibariResult = checkShibari(fieldCards, validateCards);
      if (!storeData.persistentData[msg.id].shibari && shibariResult.isShibari) {
        storeData.persistentData[msg.id].shibari = true;
        commonRequire.io.to(storeData.persistentData[msg.id].roomId).emit("changeStatus", {
          type: "shibari",
          value: storeData.persistentData[msg.id].shibari,
          playerName: users[socket.id].dispName,
          suites: shibariResult.suites
        });
      }
    }

    if (
      validateCards.length == 2 &&
      ~validateCards[0].type.indexOf("joker") &&
      ~validateCards[1].type.indexOf("joker")
    ) {
      //JOKER2枚だしは歯が立たないので流す
      storeData.fieldClear(msg.id);
      commonRequire.io.to(storeData.persistentData[msg.id].roomId).emit("changeStatus", {
        type: "doblejoker",
        value: msg,
        playerName: users[socket.id].dispName
      });
      removeCard(validateCards, socket.id, msg.id);
      return;
    }
    if (validateCards.length >= 4 && resultCheckHand.type !== "stair") {
      //革命(階段革命はない)
      storeData.persistentData[msg.id].revolution = !storeData.persistentData[msg.id].revolution;
      commonRequire.io.to(storeData.persistentData[msg.id].roomId).emit("changeStatus", {
        type: "revolution",
        value: storeData.persistentData[msg.id].revolution,
        playerName: users[socket.id].dispName
      });
    }
    if (validateCards[0].number == 8 && resultCheckHand.type !== "stair") {
      //8ぎり(階段のときは発生しない)
      storeData.fieldClear(msg.id);
      commonRequire.io.to(storeData.persistentData[msg.id].roomId).emit("changeStatus", {
        type: "cut8",
        value: msg,
        playerName: users[socket.id].dispName
      });
      removeCard(validateCards, socket.id, msg.id);
      return;
    }
    if (validateCards[0].number == 11 && resultCheckHand.type !== "stair") {
      //11back
      storeData.persistentData[msg.id].elevenback = !storeData.persistentData[msg.id].elevenback;
      commonRequire.io.to(storeData.persistentData[msg.id].roomId).emit("changeStatus", {
        type: "elevenback",
        value: storeData.persistentData[msg.id].elevenback,
        playerName: users[socket.id].dispName
      });
    }
    storeData.persistentData[msg.id].passCount = 0;
    storeData.persistentData[msg.id]["fieldCards"] = validateCards;
    if (resultCheckHand.type === "stair") {
      //階段役だった場合はフラグを立てる
      storeData.persistentData[msg.id].stair = true;
    }
    commonRequire.io.to(storeData.persistentData[msg.id].roomId).emit("result", {
      card: validateCards,
      error: 0,
      reason: "",
      result: storeData.persistentData[msg.id]["fieldCards"],
      playerName: users[socket.id].dispName
    });

    removeCard(validateCards, socket.id, msg.id);
    if (users[socket.id].card.length <= 0) {
      //成績をチェックする。
      checkRank(validateCards, msg.id, socket.id);
      commonRequire.io.to(orderList[currentTurn]).emit("finish", {
        rankReason: storeData.persistentData[msg.id]["users"][socket.id].rankReason
      });
      //みんなに知らせる
      commonRequire.io.to(storeData.persistentData[msg.id].roomId).emit("finishNotification", {
        playerName: users[orderList[currentTurn]].dispName,
        rankReason: storeData.persistentData[msg.id]["users"][socket.id].rankReason
      });
      LOGGER.debug("都落ち判定前：" + JSON.stringify(storeData.persistentData[msg.id]["users"]));
      if (
        storeData.persistentData[msg.id].gameNum != 1 &&
        Object.keys(storeData.persistentData[msg.id]["users"]).length >= 4 &&
        !storeData.persistentData[msg.id]["users"][socket.id].firstPlace &&
        storeData.persistentData[msg.id]["users"][socket.id].rankNum == 1
      ) {
        //都落ちが発生。
        //前回一位じゃなかったものが一位になっている場合は、都落ちが発生する。
        LOGGER.debug("都落ち発生！！！");
        LOGGER.debug(
          "今の都落ち候補:" + JSON.stringify(storeData.persistentData[msg.id]["users"])
        );
        Object.keys(storeData.persistentData[msg.id]["users"]).forEach(key => {
          if (storeData.persistentData[msg.id]["users"][key].firstPlace) {
            //都落ちなので、ゲーム終了。とりあえず大貧民にしておく
            storeData.persistentData[msg.id]["users"][key].rankNum = Object.keys(
              storeData.persistentData[msg.id]["users"]
            ).length;
            storeData.persistentData[msg.id]["users"][key].rank =
              storeData.persistentData[msg.id]["scoreTable"][
                Object.keys(storeData.persistentData[msg.id]["users"]).length - 1
              ].rankId;
            storeData.persistentData[msg.id]["users"][key].firstPlace = false;
            storeData.persistentData[msg.id]["users"][key].rankReason = "fallingOutCity";
            storeData.persistentData[msg.id]["users"][key].finishTime = new Date().getTime();
            commonRequire.io.to(key).emit("finish", {
              rankReason: storeData.persistentData[msg.id]["users"][key].rankReason
            });
            //みんなに知らせる
            commonRequire.io.to(storeData.persistentData[msg.id].roomId).emit("finishNotification", {
              playerName: users[key].dispName,
              rankReason: storeData.persistentData[msg.id]["users"][key].rankReason
            });
            storeData.persistentData[msg.id].finishNum = storeData.persistentData[msg.id].finishNum + 1;
            storeData.persistentData[msg.id]["order"].splice(
              storeData.persistentData[msg.id]["order"].indexOf(key),
              1
            );
          }
        });
      }
      if (storeData.persistentData[msg.id]["users"][socket.id].rankNum == 1) {
        storeData.persistentData[msg.id]["users"][socket.id].firstPlace = true;
      }
      storeData.persistentData[msg.id].finishNum = storeData.persistentData[msg.id].finishNum + 1;
      storeData.persistentData[msg.id].passCount = -1;

      LOGGER.debug(
        "現在のユーザーの状態:" +
          JSON.stringify(storeData.persistentData[msg.id]["users"][orderList[currentTurn]])
      );
      if (storeData.persistentData[msg.id].finishNum == Object.keys(users).length - 1) {
        //ビリ以外は全員終了
        let lastId = Object.keys(users).filter(item => {
          LOGGER.debug(
            "itemの値:" + JSON.stringify(storeData.persistentData[msg.id]["users"][item])
          );
          return storeData.persistentData[msg.id]["users"][item].rank.length == 0;
        });
        LOGGER.debug(
          "最下位ユーザーに入るscoreTable:" +
            JSON.stringify(storeData.persistentData[msg.id]["scoreTable"])
        );
        storeData.persistentData[msg.id]["users"][lastId].rank =
          storeData.persistentData[msg.id]["scoreTable"][storeData.persistentData[msg.id].rankCount - 1].rankId;
        storeData.persistentData[msg.id]["users"][lastId].rankNum = storeData.persistentData[msg.id].rankCount;
        storeData.persistentData[msg.id]["users"][lastId].finishTime = new Date().getTime();
        LOGGER.debug(
          "最下位ユーザー:" + JSON.stringify(storeData.persistentData[msg.id]["users"][lastId])
        );
        commonRequire.io.to(lastId).emit("finish", {
          rankReason: storeData.persistentData[msg.id]["users"][lastId].rankReason
        });
        commonRequire.io.to(storeData.persistentData[msg.id].roomId).emit("finishNotification", {
          playerName: users[lastId].dispName,
          rankReason: storeData.persistentData[msg.id]["users"][lastId].rankReason
        });
        const reverseRank = aggregateBattlePhase(msg.id);
        storeData.persistentData[msg.id]["order"] = reverseRank;
        Object.keys(storeData.persistentData[msg.id]["users"]).forEach(function(key) {
          storeData.persistentData[msg.id]["scoreTable"].some(function(ele) {
            if (storeData.persistentData[msg.id]["users"][key].rank === ele.rankId) {
              storeData.persistentData[msg.id]["users"][key].point =
                storeData.persistentData[msg.id]["users"][key].point + ele.point;
              LOGGER.debug(
                storeData.persistentData[msg.id]["users"][key].dispName +
                  "の現在のポイント: " +
                  storeData.persistentData[msg.id]["users"][key].point
              );
              return true;
            }
          });
        });
        let displayRanking = [];
        reverseRank.forEach(function(key) {
          displayRanking.unshift({
            rank: storeData.persistentData[msg.id]["users"][key].rank,
            dispName: storeData.persistentData[msg.id]["users"][key].dispName
          });
        });
        if (storeData.persistentData[msg.id].gameNum == 4) {
          //1セット終了
          let overallGrade = aggregateBattleSet(msg.id);
          let displayOverAllRanking = [];
          overallGrade.forEach(function(key) {
            displayOverAllRanking.push({
              dispName: storeData.persistentData[msg.id]["users"][key].dispName
            });
          });
          commonRequire.io.to(storeData.persistentData[msg.id].roomId).emit("gameSet", {
            gameNum: storeData.persistentData[msg.id].gameNum,
            ranking: displayRanking,
            overall: displayOverAllRanking
          });
          return;
        } else {
          //次のゲームへ
          commonRequire.io.to(storeData.persistentData[msg.id].roomId).emit("gameFinish", {
            gameNum: storeData.persistentData[msg.id].gameNum,
            ranking: displayRanking
          });
          commonRequire.io.to(lastId).emit("nextGameStart", {
            gameNum: storeData.persistentData[msg.id].gameNum + 1,
            ranking: displayRanking
          });
          storeData.persistentData[msg.id].gameNum = storeData.persistentData[msg.id].gameNum + 1;
          return;
        }
      }
    }
    notifyUtil.notifyChangeTurn(currentTurn, msg.id);
  });
  socket.on("selectedGiveCard", msg => {
    //選択したカードを交換して、ゲームをスタートする。

    //あげたカードを消す
    removeCard(msg.cards, socket.id, msg.id);
    //自分のランク
    let myOrder = storeData.persistentData[msg.id]["order"].indexOf(socket.id);
    let yourOrder = storeData.persistentData[msg.id].capacity - myOrder - 1;
    //let lower = store[msg.id]['order']
    //人数により相手が異なる。
    if (storeData.persistentData[msg.id].capacity === 3) {
      //もらうカードを増やす
      storeData.persistentData[msg.id]["users"][socket.id].card.push(
        storeData.persistentData[msg.id]["users"][storeData.persistentData[msg.id]["order"][yourOrder]].giveCard[0]
      );
      //もらったカードは向こうのユーザーから消す
      removeCard(
        storeData.persistentData[msg.id]["users"][storeData.persistentData[msg.id]["order"][yourOrder]].giveCard,
        storeData.persistentData[msg.id]["order"][yourOrder],
        msg.id
      );
      storeData.persistentData[msg.id]["users"][storeData.persistentData[msg.id]["order"][yourOrder]].giveCard = [];
      //こちらのカードを相手に渡す。
      storeData.persistentData[msg.id]["users"][storeData.persistentData[msg.id]["order"][yourOrder]].card.push(
        msg.cards[0]
      );

      storeData.persistentData[msg.id].giveCardCount = storeData.persistentData[msg.id].giveCardCount + 1;
      if (storeData.persistentData[msg.id].giveCardCount == 1) {
        notifyUtil.notifyGameReady(msg.id);
      } else {
        //TODO 何か送ってもいいかもしれないが、いったん保留で
      }
    } else {
      if (yourOrder === 0) {
        //大貧民とのやりとり
        storeData.persistentData[msg.id]["users"][socket.id].card.push(
          storeData.persistentData[msg.id]["users"][storeData.persistentData[msg.id]["order"][yourOrder]].giveCard[0]
        );
        storeData.persistentData[msg.id]["users"][socket.id].card.push(
          storeData.persistentData[msg.id]["users"][storeData.persistentData[msg.id]["order"][yourOrder]].giveCard[1]
        );
        //もらったカードは向こうのユーザーから消す
        removeCard(
          storeData.persistentData[msg.id]["users"][storeData.persistentData[msg.id]["order"][yourOrder]].giveCard,
          storeData.persistentData[msg.id]["order"][yourOrder],
          msg.id
        );
        storeData.persistentData[msg.id]["users"][storeData.persistentData[msg.id]["order"][yourOrder]].giveCard = [];
        //こちらのカードを相手に渡す。
        storeData.persistentData[msg.id]["users"][storeData.persistentData[msg.id]["order"][yourOrder]].card.push(
          msg.cards[0]
        );
        storeData.persistentData[msg.id]["users"][storeData.persistentData[msg.id]["order"][yourOrder]].card.push(
          msg.cards[1]
        );
      } else if (yourOrder === 1) {
        //貧民とのやりとり
        storeData.persistentData[msg.id]["users"][socket.id].card.push(
          storeData.persistentData[msg.id]["users"][storeData.persistentData[msg.id]["order"][yourOrder]].giveCard[0]
        );
        //もらったカードは向こうのユーザーから消す
        removeCard(
          storeData.persistentData[msg.id]["users"][storeData.persistentData[msg.id]["order"][yourOrder]].giveCard,
          storeData.persistentData[msg.id]["order"][yourOrder],
          msg.id
        );
        storeData.persistentData[msg.id]["users"][storeData.persistentData[msg.id]["order"][yourOrder]].giveCard = [];
        //こちらのカードを相手に渡す。
        storeData.persistentData[msg.id]["users"][storeData.persistentData[msg.id]["order"][yourOrder]].card.push(
          msg.cards[0]
        );
      }
      storeData.persistentData[msg.id].giveCardCount = storeData.persistentData[msg.id].giveCardCount + 1;

      if (storeData.persistentData[msg.id].giveCardCount == 2) {
        notifyUtil.notifyGameReady(msg.id);
      } else {
        //TODO 何か送ってもいいかもしれないが、いったん保留で
      }
    }
  });
});

//ゲームセットの成績統計
function aggregateBattleSet(roomId) {
  //ポイント降順で返す。(ランキング順)
  return Object.keys(storeData.persistentData[roomId]["users"]).sort(function(a, b) {
    if (storeData.persistentData[roomId]["users"][a].point > storeData.persistentData[roomId]["users"][b].point)
      return -1;
    if (storeData.persistentData[roomId]["users"][a].point < storeData.persistentData[roomId]["users"][b].point)
      return 1;
    return 0;
  });
}

function aggregateBattlePhase(roomId) {
  //ユーザデータを全検索し、最下位のメンバをfinishTimeの昇順に並べる。
  let loseUsers = Object.keys(storeData.persistentData[roomId]["users"])
    .filter(function(key) {
      return storeData.persistentData[roomId]["users"][key].rankNum === 4;
    })
    .sort(function(a, b) {
      if (
        storeData.persistentData[roomId]["users"][a].finishTime <
        storeData.persistentData[roomId]["users"][b].finishTime
      )
        return -1;
      if (
        storeData.persistentData[roomId]["users"][a].finishTime >
        storeData.persistentData[roomId]["users"][b].finishTime
      )
        return 1;
      return 0;
    });
  if (loseUsers.length != 1) {
    //0はありえないので考慮しない。
    LOGGER.debug("4位の人数: " + loseUsers.length);
    let pos = 0;
    let fallingOutCityUserKey = "";
    loseUsers.forEach(key => {
      if (storeData.persistentData[roomId]["users"][key].rankReason != "fallingOutCity") {
        //都落ちでない場合は、反則負けで早く上がったものから悪い順位になる。
        LOGGER.debug(
          "入れる前: " + JSON.stringify(storeData.persistentData[roomId]["users"][key])
        );
        storeData.persistentData[roomId]["users"][key].rankNum =
          Object.keys(storeData.persistentData[roomId]["users"]).length - pos;
        if (storeData.persistentData[roomId]["users"][key].rankNum === 1) {
          //(ないとは思うが)一位だった場合は都落ちフラグ
          storeData.persistentData[roomId]["users"][key].firstPlace = true;
          //Note 反則負け判断時にいったんフラグをfalseにしているので、ここで見直すことはしない
        }
        storeData.persistentData[roomId]["users"][key].rank =
          storeData.persistentData[roomId]["scoreTable"][
            Object.keys(storeData.persistentData[roomId]["users"]).length - pos - 1
          ].rankId;
        LOGGER.debug(
          "入れた後: " + JSON.stringify(storeData.persistentData[roomId]["users"][key])
        );
        pos++;
      } else {
        fallingOutCityUserKey = key;
      }
    });
    if (fallingOutCityUserKey != "") {
      storeData.persistentData[roomId]["users"][fallingOutCityUserKey].rankNum =
        Object.keys(storeData.persistentData[roomId]["users"]).length - pos;
      storeData.persistentData[roomId]["users"][fallingOutCityUserKey].rank =
        storeData.persistentData[roomId]["scoreTable"][
          Object.keys(storeData.persistentData[roomId]["users"]).length - pos - 1
        ];
    }
  }
  //順位の逆順で返すと何かと楽そうなのでそうする。
  //またこの時にサクッとpoint計上しておく
  return Object.keys(storeData.persistentData[roomId]["users"]).sort(function(a, b) {
    if (storeData.persistentData[roomId]["users"][a].rankNum > storeData.persistentData[roomId]["users"][b].rankNum)
      return -1;
    if (storeData.persistentData[roomId]["users"][a].rankNum < storeData.persistentData[roomId]["users"][b].rankNum)
      return 1;
    return 0;
  });
}

function checkRank(sc, roomId, userId) {
  let result = checkFoul(sc, roomId);
  if (result.foul) {
    //反則上がりだった場合
    //rankはとりあえず大貧民扱いとする。(あとで再計算する)
    storeData.persistentData[roomId]["users"][userId].rank =
      storeData.persistentData[roomId]["scoreTable"][
        Object.keys(storeData.persistentData[roomId]["users"]).length - 1
      ].rankId;
    storeData.persistentData[roomId]["users"][userId].rankNum = Object.keys(
      storeData.persistentData[roomId]["users"]
    ).length;
    //都落ちフラグは外しておく。(ないとは思うが、全員が反則上がりだった場合、大富豪になる可能性もある。そのときは別途firstPlaceを再計算する)
    storeData.persistentData[roomId]["users"][userId].firstPlace = false;
    storeData.persistentData[roomId]["users"][userId].rankReason = result.reason;
    storeData.persistentData[roomId]["users"][userId].finishTime = new Date().getTime();
  } else {
    let nextRank = 0;
    Object.keys(storeData.persistentData[roomId]["users"])
      .sort(function(a, b) {
        if (
          storeData.persistentData[roomId]["users"][a].rankNum > storeData.persistentData[roomId]["users"][b].rankNum
        )
          return -1;
        if (
          storeData.persistentData[roomId]["users"][a].rankNum < storeData.persistentData[roomId]["users"][b].rankNum
        )
          return 1;
        return 0;
      })
      .some(function(val) {
        if (
          storeData.persistentData[roomId]["users"][val].rankNum !=
          Object.keys(storeData.persistentData[roomId]["users"]).length
        ) {
          nextRank = storeData.persistentData[roomId]["users"][val].rankNum + 1;
          return true;
        }
      });

    storeData.persistentData[roomId]["users"][userId].rank =
      storeData.persistentData[roomId]["scoreTable"][nextRank - 1].rankId;
    storeData.persistentData[roomId]["users"][userId].rankNum = nextRank;

    storeData.persistentData[roomId]["users"][userId].rankReason = result.reason;
    storeData.persistentData[roomId]["users"][userId].finishTime = new Date().getTime();
    storeData.persistentData[roomId].rankCount = storeData.persistentData[roomId].rankCount + 1;
  }
}

//反則上がりのチェック
function checkFoul(sc, roomId) {
  let result = {
    foul: false,
    reason: ""
  };
  if (sc.length == 1 && sc[0].number == 3 && sc[0].type == "spade") {
    //・スペ3一枚で上がってない？
    result.foul = true;
    result.reason = "spade3Finish";
    return result;
  }
  //最後に出したカードに8またはジョーカーが含まれていない？(階段の場合は8は許される)
  //あとで使う2と3も確認しておく
  let flag8 = false;
  let flagJoker = false;
  let flag2 = false;
  let flag3 = false;
  sc.forEach(ele => {
    if (ele.number == 8) {
      flag8 = true;
    }
    if (~ele.type.indexOf("Joker")) {
      flagJoker = true;
    }
    if (ele.number == 2) {
      flag2 = true;
    }
    if (ele.number == 3) {
      flag3 = true;
    }
  });
  if (flagJoker) {
    //最後に出したカードにJOKERを含む
    result.foul = true;
    result.reason = "jokerFinish";
    return result;
  }
  if (!storeData.persistentData[roomId].stair && flag8) {
    //非階段状態で最後に出したカードに8を含む
    result.foul = true;
    result.reason = "card8Finish";
    return result;
  }

  //革命時に3を含んでない?
  if (storeData.persistentData[roomId].revolution && flag3) {
    result.foul = true;
    result.reason = "card3Finish";
    return result;
  }

  //非革命時に2を含んでない？
  if (!storeData.persistentData[roomId].revolution && flag2) {
    result.foul = true;
    result.reason = "card2Finish";
    return result;
  }
  return result;
}

function checkShibari(ncs, scs) {
  let result = {
    isShibari : false,
    suites: []
  }
  if (
    scs.some(item => ~item.type.indexOf("joker")) ||
    ncs.some(item => ~item.type.indexOf("joker"))
  ) {
    //return false;
    return result;
  }
  var flag = false;
  let suiteArr = [];
  for (let i = 0; i < ncs.length; i++) {
    flag = scs.some(item => {
      if(item.type === ncs[i].type){
        suiteArr.push(item.type);
        return true;
      }
    });
    if (!flag) {
      //一回でも一致しなければfalse
      return result;
    }
  }
  result.isShibari = true;
  result.suites = suiteArr;
  return result;
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
    if (base != cards[i].number) {
      return false;
    }
  }
  return true;
}

function removeCard(sc, userId, roomId) {
  LOGGER.debug(
    "カード削除前: " + JSON.stringify(storeData.persistentData[roomId]["users"][userId].card)
  );
  sc.forEach(v => {
    storeData.persistentData[roomId]["users"][userId].card = storeData.persistentData[roomId]["users"][
      userId
    ].card.filter(ele => {
      return v.type !== ele.type || v.number !== ele.number;
    });
  });
  LOGGER.debug(
    "カード削除後: " + JSON.stringify(storeData.persistentData[roomId]["users"][userId].card)
  );
}

function cardCompareValidate(nc, sc, handType, roomId) {
  let result = {
    card: [],
    error: 0,
    reason: ""
  };
  if (nc.length === 0) {
    //初回のカード(つまり比べるものがない)場合は問題なしとしてデフォルトで返す。
    return result;
  }
  //枚数が等しいことをチェック
  if (nc.length != sc.length) {
    result.card = sc;
    result.error = 1;
    result.reason = "diffNumOfCards";
    return result;
  }
  //スート縛りの確認
  if (storeData.persistentData[roomId].shibari && !isSameType(nc, sc)) {
    result.card = sc;
    result.error = 1;
    result.reason = "diffSuitCards";
    return result;
  }
  //数字の大小確認
  if (!numComparison(nc, sc, roomId)) {
    //複数枚の時はすべての数字が同じなので1枚目をみれば良い
    //階段の場合も一番弱いカード
    result.card = sc;
    result.error = 1;
    result.reason = "loseCards";
    return result;
  }
  return result;
}

function numComparison(nc, sc, roomId) {
  let checkNC;
  let checkSC;
  if (
    storeData.persistentData[roomId].stair &&
    (storeData.persistentData[roomId].elevenback || storeData.persistentData[roomId].revolution)
  ) {
    //階段の場合、革命または11Back時の動作が変わる。(一番大きい数字を見ないといけない)
    nc.some(ele => {
      if (~ele.type.indexOf("joker")) {
        return true;
      } else {
        checkNC = ele;
      }
    });
    sc.some(ele => {
      if (~ele.type.indexOf("joker")) {
        return true;
      } else {
        checkSC = ele;
      }
    });
  } else {
    checkNC = nc[0];
    checkSC = sc[0];
  }
  LOGGER.debug(
    "numComparisonの比較対象checkNC：" + checkNC + "　checkSC:" + checkSC
  );
  if (~checkNC.type.indexOf("joker") && ~checkSC.type.indexOf("joker")) {
    //ジョーカーはジョーカーに勝てない
    return false;
  }
  if (
    ~checkNC.type.indexOf("joker") &&
    checkSC.type == "spade" &&
    checkSC.number == "3"
  ) {
    //スペ3はジョーカーに勝てる
    return true;
  }
  if (
    ~checkSC.type.indexOf("joker") &&
    checkNC.type == "spade" &&
    checkNC.number == "3"
  ) {
    //ジョーカーはスペ3に勝てない
    return false;
  }
  if (storeData.persistentData[roomId].elevenback && storeData.persistentData[roomId].revolution) {
    LOGGER.debug("11backかつ革命中");
    return checkNC.number < checkSC.number;
  } else if (storeData.persistentData[roomId].elevenback || storeData.persistentData[roomId].revolution) {
    LOGGER.debug("11backまたは革命中");
    LOGGER.debug("比較させてねcheckNC" + JSON.stringify(checkNC));
    LOGGER.debug("比較させてねcheckSC" + JSON.stringify(checkSC));
    //逆残
    if (~checkSC.type.indexOf("joker")) {
      //ジョーカーは必ず勝てる
      return true;
    }
    return checkNC.number > checkSC.number;
  } else {
    return checkNC.number < checkSC.number;
  }
}

function isSameType(ncs, scs) {
  //まずジョーカーの数を数える
  let jokerCount = scs.filter(item => ~item.type.indexOf("joker")).length;
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

commonRequire.http.listen(port, function() {
  console.log("listening on *:" + port);
});
