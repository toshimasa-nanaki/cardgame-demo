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
  const shuffleCards = commonUtil.sortArrayRandomly(ORIGINALCARDDATA);
  const perNum = Math.floor(TRUMP_TEMP.total / count);
  let remainder = TRUMP_TEMP.total % count;
  LOGGER.debug("perNum:" + perNum + " remainder:" + remainder);
  let pos = 0;
  Object.keys(storeData.persistentData[roomId]["users"]).forEach(key => {
    storeData.persistentData[roomId]["users"][key].card = shuffleCards
      .slice(pos, remainder > 0 ? pos + perNum + 1 : pos + perNum)
      .sort(function(a, b) {
        if (a.number < b.number) return -1;
        if (a.number > b.number) return 1;
        return 0;
      });
    pos = remainder > 0 ? pos + perNum + 1 : pos + perNum;
    remainder--;
    LOGGER.debug("for文の中" + " perNum:" + perNum + " remainder:" + remainder);
    LOGGER.debug(
      key + "の持ちカード： " + JSON.stringify(storeData.persistentData[roomId]["users"][key].card)
    );
  });
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

const ORIGINALCARDDATA = trumpInit(TRUMP_TEMP);