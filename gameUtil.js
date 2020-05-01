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
  
  //if (users[socket.id].card.length <= 0) {
      //成績をチェックする。
      checkRank(sc, roomId, userId);
      commonRequire.io.to(userId).emit("finish", {
        rankReason: storeData.persistentData[roomId]["users"][userId].rankReason
      });
      //みんなに知らせる
      commonRequire.io.to(roomId).emit("finishNotification", {
        playerName: storeData.persistentData[roomId]["users"][userId].dispName,
        rankReason: storeData.persistentData[roomId]["users"][userId].rankReason
      });
      LOGGER.debug("都落ち判定前：" + JSON.stringify(storeData.persistentData[roomId]["users"]));
      if (
        storeData.persistentData[roomId].gameNum != 1 &&
        Object.keys(storeData.persistentData[roomId]["users"]).length >= 4 &&
        !storeData.persistentData[roomId]["users"][userId].firstPlace &&
        storeData.persistentData[roomId]["users"][userId].rankNum == 1
      ) {
        //都落ちが発生。
        //前回一位じゃなかったものが一位になっている場合は、都落ちが発生する。
        LOGGER.debug("都落ち発生！！！");
        LOGGER.debug(
          "今の都落ち候補:" + JSON.stringify(storeData.persistentData[roomId]["users"])
        );
        Object.keys(storeData.persistentData[roomId]["users"]).forEach(key => {
          if (storeData.persistentData[roomId]["users"][key].firstPlace) {
            //都落ちなので、ゲーム終了。とりあえず大貧民にしておく
            storeData.persistentData[roomId]["users"][key].rankNum = Object.keys(
              storeData.persistentData[roomId]["users"]
            ).length;
            storeData.persistentData[roomId]["users"][key].rank =
              storeData.persistentData[roomId]["scoreTable"][
                Object.keys(storeData.persistentData[roomId]["users"]).length - 1
              ].rankId;
            storeData.persistentData[roomId]["users"][key].firstPlace = false;
            storeData.persistentData[roomId]["users"][key].rankReason = "fallingOutCity";
            storeData.persistentData[roomId]["users"][key].finishTime = new Date().getTime();
            commonRequire.io.to(key).emit("finish", {
              rankReason: storeData.persistentData[roomId]["users"][key].rankReason
            });
            //みんなに知らせる
            commonRequire.io.to(storeData.persistentData[roomId].roomId).emit("finishNotification", {
              playerName: storeData.persistentData[roomId]["users"][key].dispName,
              rankReason: storeData.persistentData[roomId]["users"][key].rankReason
            });
            storeData.persistentData[roomId].finishNum = storeData.persistentData[roomId].finishNum + 1;
            storeData.persistentData[roomId]["order"].splice(
              storeData.persistentData[roomId]["order"].indexOf(key),
              1
            );
          }
        });
      }
      if (storeData.persistentData[roomId]["users"][userId].rankNum == 1) {
        storeData.persistentData[roomId]["users"][userId].firstPlace = true;
      }
      storeData.persistentData[roomId].finishNum = storeData.persistentData[roomId].finishNum + 1;
      storeData.persistentData[roomId].passCount = -1;

      LOGGER.debug(
        "現在のユーザーの状態:" +
          JSON.stringify(storeData.persistentData[roomId]["users"][userId])
      );
      if (storeData.persistentData[roomId].finishNum == Object.keys(storeData.persistentData[roomId]["users"]).length - 1) {
        //ビリ以外は全員終了
        let lastId = Object.keys(storeData.persistentData[roomId]["users"]).filter(item => {
          LOGGER.debug(
            "itemの値:" + JSON.stringify(storeData.persistentData[roomId]["users"][item])
          );
          return storeData.persistentData[roomId]["users"][item].rank.length == 0;
        });
        LOGGER.debug(
          "最下位ユーザーに入るscoreTable:" +
            JSON.stringify(storeData.persistentData[roomId]["scoreTable"])
        );
        storeData.persistentData[roomId]["users"][lastId].rank =
          storeData.persistentData[roomId]["scoreTable"][storeData.persistentData[roomId].rankCount - 1].rankId;
        storeData.persistentData[roomId]["users"][lastId].rankNum = storeData.persistentData[roomId].rankCount;
        storeData.persistentData[roomId]["users"][lastId].finishTime = new Date().getTime();
        LOGGER.debug(
          "最下位ユーザー:" + JSON.stringify(storeData.persistentData[roomId]["users"][lastId])
        );
        commonRequire.io.to(lastId).emit("finish", {
          rankReason: storeData.persistentData[roomId]["users"][lastId].rankReason
        });
        commonRequire.io.to(storeData.persistentData[roomId].roomId).emit("finishNotification", {
          playerName: storeData.persistentData[roomId]["users"][lastId].dispName,
          rankReason: storeData.persistentData[roomId]["users"][lastId].rankReason
        });
        const reverseRank = aggregateBattlePhase(roomId);
        storeData.persistentData[roomId]["order"] = reverseRank;
        Object.keys(storeData.persistentData[roomId]["users"]).forEach(function(key) {
          storeData.persistentData[roomId]["scoreTable"].some(function(ele) {
            if (storeData.persistentData[roomId]["users"][key].rank === ele.rankId) {
              storeData.persistentData[roomId]["users"][key].point =
                storeData.persistentData[roomId]["users"][key].point + ele.point;
              LOGGER.debug(
                storeData.persistentData[roomId]["users"][key].dispName +
                  "の現在のポイント: " +
                  storeData.persistentData[roomId]["users"][key].point
              );
              return true;
            }
          });
        });
        let displayRanking = [];
        reverseRank.forEach(function(key) {
          displayRanking.unshift({
            rank: storeData.persistentData[roomId]["users"][key].rank,
            dispName: storeData.persistentData[roomId]["users"][key].dispName
          });
        });
        if (storeData.persistentData[roomId].gameNum == 4) {
          //1セット終了
          let overallGrade = aggregateBattleSet(roomId);
          let displayOverAllRanking = [];
          overallGrade.forEach(function(key) {
            displayOverAllRanking.push({
              dispName: storeData.persistentData[roomId]["users"][key].dispName
            });
          });
          for (let [key, value] of Object.entries(storeData.persistentData[roomId]["users"])) {
            commonRequire.io.to(key).emit("gameSet", {
              gameNum: storeData.persistentData[roomId].gameNum,
              ranking: displayRanking,
              overall: displayOverAllRanking,
              finalPoint: value.point
            });
          }
          return;
        } else {
          //次のゲームへ
          for (let [key, value] of Object.entries(storeData.persistentData[roomId]["users"])) {
            commonRequire.io.to(key).emit("gameFinish", {
              gameNum: storeData.persistentData[roomId].gameNum,
              ranking: displayRanking,
              point: value.point
            });
            // if (key !== socketObj.id) io.to(key).emit("otherMemberJoinedRoom", commonUtil.htmlentities(joinInfo.playerName));
          }
          // commonRequire.io.to(storeData.persistentData[roomId].roomId).emit("gameFinish", {
          //   gameNum: storeData.persistentData[roomId].gameNum,
          //   ranking: displayRanking
          // });
          commonRequire.io.to(lastId).emit("nextGameStart", {
            gameNum: storeData.persistentData[roomId].gameNum + 1,
            ranking: displayRanking
          });
          storeData.persistentData[roomId].gameNum = storeData.persistentData[roomId].gameNum + 1;
          return;
        }
      }
  notifyUtil.notifyChangeTurn(currentTurn, roomId);
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
  //あとで使う2と3と11backも確認しておく
  let flag8 = false;
  let flagJoker = false;
  let flag2 = false;
  let flag3 = false;
  let flag11 = false;
  sc.forEach(ele => {
    if (ele.number == 8) {
      flag8 = true;
    }
    if (~ele.type.indexOf("joker")) {
      flagJoker = true;
    }
    if (ele.number == 11) {
      flag11 = true;
    }
    if (ele.number == 15) {
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
  if (flag11) {
    //最後に出したカードに11を含む
    result.foul = true;
    result.reason = "card11Finish";
    return result;
  }
  if (!storeData.persistentData[roomId].stair && flag8) {
    //非階段状態で最後に出したカードに8を含む
    result.foul = true;
    result.reason = "card8Finish";
    return result;
  }

  //排他的論理和で革命と11backによる2,3の判断をする。(記述を短くするためにビット演算する)
  let xor = storeData.persistentData[roomId].revolution ^ storeData.persistentData[roomId].elevenback;
  //革命時に3を含んでない?
  if (xor == 1 && flag3) {
    result.foul = true;
    result.reason = "card3Finish";
    return result;
  }

  //非革命時に2を含んでない？
  if (xor == 0 && flag2) {
    result.foul = true;
    result.reason = "card2Finish";
    return result;
  }
  return result;
}

//ゲームセットの成績統計
const aggregateBattleSet = (roomId) => {
  //ポイント降順で返す。(ランキング順)
  return Object.keys(storeData.persistentData[roomId]["users"]).sort(function(a, b) {
    if (storeData.persistentData[roomId]["users"][a].point > storeData.persistentData[roomId]["users"][b].point)
      return -1;
    if (storeData.persistentData[roomId]["users"][a].point < storeData.persistentData[roomId]["users"][b].point)
      return 1;
    return 0;
  });
}

const aggregateBattlePhase = (roomId) => {
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

const ORIGINALCARDDATA = trumpInit(TRUMP_TEMP);