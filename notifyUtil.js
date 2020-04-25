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
  
}