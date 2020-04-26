"use strict";

const commonRequire = require("./commonRequire.js");
const commonUtil = require("./commonUtil.js");
const storeData = require("./storeData.js");
const notifyUtil = require("./notifyUtil.js");
const io = commonRequire.io;
//const index = require("./index.js");
const loggerUtil = require("./loggerUtil.js");
const LOGGER = loggerUtil.logger;
const debug = process.env.DEBUG === "true" ? true : false;
const TRUMP_TEMP = debug ? commonUtil.DEBUG_TRUMPDATA : commonUtil.TRUMPDATA;


// const io = index.io;

module.exports.gameInit = (count, sockets, roomId) => {
  storeData.persistentData[roomId]["fieldCards"] = [];

  storeData.persistentData[roomId].finishNum = 0;
  storeData.persistentData[roomId].scoreTable = storeData.createRankTable(count);
  storeData.persistentData[roomId].elevenback = false;
  storeData.persistentData[roomId].shibari = false;
  storeData.persistentData[roomId].revolution = false;
  storeData.persistentData[roomId].stair = false;
  storeData.persistentData[roomId]["order"] = [];
  storeData.persistentData[roomId].startedGame = true;
  storeData.persistentData[roomId].rankCount = 1;

  //まずは順番決め
  decideOrder(roomId);

  //カード配布
  handOutCards(count, roomId);

  //準備完了通知
  //  notifyGameReady(roomId);
  if (storeData.persistentData[roomId].gameNum == 1) {
    //1回目のゲームの場合は完了通知を送る。
    notifyUtil.notifyGameReady(roomId);
  } else {
    //2回目以降はまず献上が先に実施される。(Orderが降順になっているので、それを利用する)
    if (Object.keys(storeData.persistentData[roomId]["users"]).length >= 3) {
      //3人以上の時
      notifyUtil.notifyGiveCard(roomId, Object.keys(storeData.persistentData[roomId]["users"]).length);
    } else {
      //2人の時などは献上はなし
      notifyUtil.notifyGameReady(roomId);
    }
  }
}

module.exports.checkOut = (sc, roomId, userId, currentTurn) => {
  if (storeData.persistentData[roomId]["users"][userId].card.length > 0) {
    //上がっていないのでreturn
    return;
  }
  //if (users[socket.id].card.length <= 0) {
      //成績をチェックする。
      checkRank(sc, roomId, userId);
      commonRequire.io.to(storeData.persistentData[roomId]["order"][currentTurn]).emit("finish", {
        rankReason: storeData.persistentData[roomId]["users"][userId].rankReason
      });
      //みんなに知らせる
      commonRequire.io.to(storeData.persistentData[roomId].roomId).emit("finishNotification", {
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
    //}
}

const decideOrder = roomId => {
  if (storeData.persistentData[roomId].gameNum == 1) {
    //1回目の場合は部屋に入った順
    Object.keys(storeData.persistentData[roomId]["users"]).forEach(key => {
      storeData.persistentData[roomId]["order"].push(key);
    });
    LOGGER.debug("第1回ゲームの順序: " + storeData.persistentData[roomId]["order"]);
  } else {
    //2回目以降は大貧民が一番。時計回りという概念がないので、とりあえず順位の逆順にする。(オリジナル)
    //TODO? 実際は大貧民から時計回り。
    let userRank = [];
    Object.keys(storeData.persistentData[roomId]["users"]).forEach(key => {
      userRank.push({ id: key, rankNum: storeData.persistentData[roomId]["users"][key].rankNum });
      storeData.persistentData[roomId]["users"][key].rankNum = 0;
      storeData.persistentData[roomId]["users"][key].rank = "";
    });
    userRank
      .sort(function(a, b) {
        if (a.rankNum > b.rankNum) return -1;
        if (a.rankNum < b.rankNum) return 1;
        return 0;
      })
      .forEach(key => {
        LOGGER.debug("二回目以降key:" + key);
        storeData.persistentData[roomId]["order"].push(key.id);
      });
  }
}

const handOutCards = (count, roomId) => {
  let shuffleCards = commonUtil.sortArrayRandomly(ORIGINALCARDDATA);
  const perNum = Math.floor(TRUMP_TEMP.total / count);
  const remainder = TRUMP_TEMP.total % count;
  LOGGER.debug("perNum:" + perNum + " remainder:" + remainder);
  //ブラインドカードの確認をする。もしジョーカーが含まれている場合は切りなおす。
  while(shuffleCards.slice(TRUMP_TEMP.total - remainder, TRUMP_TEMP.total).some(ele => ~ele.type.indexOf("joker"))){
    LOGGER.debug("ブラインドカードにジョーカーが含まれるためシャッフルしなおす" + JSON.stringify(shuffleCards.slice(TRUMP_TEMP.total - 2, TRUMP_TEMP.total)));
    shuffleCards = commonUtil.sortArrayRandomly(ORIGINALCARDDATA);
  }
  let pos = 0;
  Object.keys(storeData.persistentData[roomId]["users"]).forEach(key => {
    storeData.persistentData[roomId]["users"][key].card = shuffleCards
      //.slice(pos, remainder > 0 ? pos + perNum + 1 : pos + perNum)
    .slice(pos, pos + perNum)
      .sort(function(a, b) {
        if (a.number < b.number) return -1;
        if (a.number > b.number) return 1;
        return 0;
      });
    
    pos = pos + perNum;
    // pos = remainder > 0 ? pos + perNum + 1 : pos + perNum;
    // remainder--;
    // LOGGER.debug("for文の中" + " perNum:" + perNum + " remainder:" + remainder);
    // LOGGER.debug(
    //   key + "の持ちカード： " + JSON.stringify(storeData.persistentData[roomId]["users"][key].card)
    // );
  });
  //余ったカードがある場合、それはブラインドカードとする。
  if(remainder !== 0){
    storeData.persistentData[roomId].blindCards = shuffleCards.slice(pos, pos + remainder).sort(function(a, b) {
        if (a.number < b.number) return -1;
        if (a.number > b.number) return 1;
        return 0;
      });
  }
  LOGGER.debug(
      "ブラインドカード： " + JSON.stringify(storeData.persistentData[roomId].blindCards)
    );
}

const trumpInit = (trumpData) => {
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
      number: 99,
      cloneType: ""
    });
  }
  return cards;
}

const checkRank = (sc, roomId, userId) => {
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
const checkFoul = (sc, roomId) => {
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
    if (~ele.type.indexOf("joker")) {
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

const ORIGINALCARDDATA = trumpInit(TRUMP_TEMP);