"use strict";

const commonRequire = require("./commonRequire.js");
const commonUtil = require("./commonUtil.js");
const gameUtil = require("./gameUtil.js");
const storeData = require("./storeData.js");
const loggerUtil = require("./loggerUtil.js");
const LOGGER = loggerUtil.logger;
const io = commonRequire.io;

module.exports.notifyGameReady = roomId => {
  storeData.persistentData[roomId].giveCardCount = 0;
  const orders = storeData.persistentData[roomId]["order"];
  const users = storeData.persistentData[roomId]["users"];
  io.to(orders[0]).emit("gameReady", {
    gameNum: storeData.persistentData[roomId].gameNum,
    card: users[orders[0]].card,
    yourTurn: true,
    playerName: users[orders[0]].dispName
  });
  LOGGER.debug(
    "gameReadyのレスポンス(一番目)： " +
      JSON.stringify({
        gameNum: storeData.persistentData[roomId].gameNum,
        card: users[orders[0]].card,
        yourTurn: true,
        playerName: users[orders[0]].dispName
      })
  );
  for (let i = 1; i < storeData.persistentData[roomId]["order"].length; i++) {
    io.to(orders[i]).emit("gameReady", {
      gameNum: storeData.persistentData[roomId].gameNum,
      card: users[orders[i]].card,
      yourTurn: false,
      playerName: users[orders[0]].dispName
    });
    LOGGER.debug(
      "gameReadyのレスポンス(二番目以降)： " +
        JSON.stringify({
          card: users[orders[i]].card,
          yourTurn: false,
          playerName: users[orders[0]].dispName
        })
    );
  }
}

module.exports.notifyGiveCard = (roomId,playerNum) => {
  if (playerNum === 3) {
    //3人のとき
    const LowerUser1 = storeData.persistentData[roomId]["order"][0];
    const HigherUser1 = storeData.persistentData[roomId]["order"][2];
    commonRequire.io.to(HigherUser1).emit("giveToLowerStatus1", {
      targetCard: storeData.persistentData[roomId]["users"][HigherUser1].card
    });
    commonRequire.io.to(LowerUser1).emit("giveToHigherStatus1", {
      targetCard: [storeData.persistentData[roomId]["users"][LowerUser1].card.slice(-1)[0]]
    });
    storeData.persistentData[roomId]["users"][LowerUser1].giveCard.push(
      storeData.persistentData[roomId]["users"][LowerUser1].slice(-1)[0]
    );
  } else {
    //4人以上
    const LowerUser1 = storeData.persistentData[roomId]["order"][1];
    const HigherUser1 = storeData.persistentData[roomId]["order"][playerNum - 2];
    const LowerUser2 = storeData.persistentData[roomId]["order"][0];
    const HigherUser2 = storeData.persistentData[roomId]["order"][playerNum - 1];
    commonRequire.io.to(HigherUser2).emit("giveToLowerStatus2", {
      targetCard: storeData.persistentData[roomId]["users"][HigherUser2].card
    });
    commonRequire.io.to(LowerUser2).emit("giveToHigherStatus2", {
      targetCard: [
        storeData.persistentData[roomId]["users"][LowerUser2].card.slice(-1)[0],
        storeData.persistentData[roomId]["users"][LowerUser2].card.slice(-2)[0]
      ]
    });
    commonRequire.io.to(HigherUser1).emit("giveToLowerStatus1", {
      targetCard: storeData.persistentData[roomId]["users"][HigherUser1].card
    });
    commonRequire.io.to(LowerUser1).emit("giveToHigherStatus1", {
      targetCard: [storeData.persistentData[roomId]["users"][LowerUser1].card.slice(-1)[0]]
    });
    storeData.persistentData[roomId]["users"][LowerUser1].giveCard.push(
      storeData.persistentData[roomId]["users"][LowerUser1].card.slice(-1)[0]
    );
    storeData.persistentData[roomId]["users"][LowerUser2].giveCard.push(
      storeData.persistentData[roomId]["users"][LowerUser2].card.slice(-1)[0]
    );
    storeData.persistentData[roomId]["users"][LowerUser2].giveCard.push(
      storeData.persistentData[roomId]["users"][LowerUser2].card.slice(-2)[0]
    );
  }
}

module.exports.notifyChangeTurn = (currentTurnIndex, roomId) => {
  const orderList = storeData.persistentData[roomId]["order"];
  const users = storeData.persistentData[roomId]["users"];
  let nextTurn =
    currentTurnIndex != orderList.length - 1 ? currentTurnIndex + 1 : 0;

  Object.keys(users).forEach(function(element) {
    if (element != orderList[nextTurn]) {
      commonRequire.io.to(element).emit("order", {
        flag: false,
        skip: false,
        playerName: users[orderList[nextTurn]].dispName
      });
    }
  });
  commonRequire.io.to(orderList[nextTurn]).emit("order", {
    flag: true,
    skip: users[orderList[nextTurn]].rank != "" ? true : false
  });
  if (users[orderList[currentTurnIndex]].rankNum != 0) {
    //現在のユーザがすでに上がっている場合
    storeData.persistentData[roomId]["order"].splice(currentTurnIndex, 1);
  }
}