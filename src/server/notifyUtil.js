"use strict";

const commonRequire = require("./common/commonRequire.js");
const commonUtil = require("./common/commonUtil.js");
const gameUtil = require("./gameUtil.js");
const storeData = require("./storeData.js");
const loggerUtil = require("./loggerUtil.js");
const LOGGER = loggerUtil.logger;
const io = commonRequire.io;

module.exports.notifyGameReady = roomId => {
  const roomInfo = storeData.persistentData[roomId];
  roomInfo.giveCardCount = 0;
  const orders = roomInfo.order;
  const users = roomInfo.users;
  const userDispList = [];
  Object.keys(users).forEach(key => {
    userDispList.push(users[key].dispName);
  });
  // for (let [key, value] of Object.entries(orders)) {
  //   userDispList.push(value.dispName);
  // }
  LOGGER.debug(JSON.stringify(orders));
  orders.forEach((element, index) => {
    console.log("gameReadyを送られた人" + element.userId);
    io.to(element.userId).emit("gameReady", {
    gameNum: roomInfo.gameNum,
    card: users[element.userId].card,
    yourTurn: index === 0 ? true : false,
    playerName: users[orders[0].userId].dispName,
    playerName2: users[element.userId].dispName,
    playerPoint: users[element.userId].point,
    blindCards: roomInfo.blindCards,
    orderNum: 0,
    userList: userDispList
  });
  });
}

module.exports.notifyGiveCard = (roomId,playerNum) => {
  storeData.persistentData[roomId].giveCardPhase = true;
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
      storeData.persistentData[roomId]["users"][LowerUser1].card.slice(-1)[0]
    );
  } else {
    //4人以上
    const LowerUser1 = storeData.persistentData[roomId]["order"][1];
    const HigherUser1 = storeData.persistentData[roomId]["order"][playerNum - 2];
    const LowerUser2 = storeData.persistentData[roomId]["order"][0];
    const HigherUser2 = storeData.persistentData[roomId]["order"][playerNum - 1];
    commonRequire.io.to(HigherUser2).emit("giveToLowerStatus2", {
      targetCard: commonUtil.sortArray(storeData.persistentData[roomId]["users"][HigherUser2].card, true)
    });
    commonRequire.io.to(LowerUser2).emit("giveToHigherStatus2", {
      targetCard: commonUtil.sortArray([
        storeData.persistentData[roomId]["users"][LowerUser2].card.slice(-1)[0],
        storeData.persistentData[roomId]["users"][LowerUser2].card.slice(-2)[0]
      ], true)
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
  const roomInfo = storeData.persistentData[roomId];
  const orderList = roomInfo.order;
  const users = roomInfo.users;
  
  // let nextTurn =
  //   currentTurnIndex != orderList.length - 1 ? currentTurnIndex + 1 : 0;
  
  const remainingCards = [];
  // if (users[orderList[currentTurnIndex]].rankNum != 0) {
  //   //現在のユーザがすでに上がっている場合
  //   storeData.persistentData[roomId]["order"].splice(currentTurnIndex, 1);
  // }
  let tryCount = 0;
  let nextTurn;
  while(tryCount < roomInfo.capacity - 1){
    tryCount++;
    console.log("今のcurrentTurnIndex" + currentTurnIndex);
    const preNextTurn = currentTurnIndex + tryCount >= roomInfo.capacity ? 
          currentTurnIndex + tryCount - roomInfo.capacity : currentTurnIndex + tryCount;
    console.log("roomInfo.capcity" + roomInfo.capacity);
    console.log("tryCount" + tryCount);
    console.log(currentTurnIndex + tryCount >= roomInfo.capcity);
    console.log("今のpre" + preNextTurn);
    console.log(orderList[preNextTurn].status);
    if(orderList[preNextTurn].status === ""){
      //次の順番になれる
      console.log("今のpre" + preNextTurn);
      nextTurn = preNextTurn;
      break;
    } else {
      //ここで飛ばされた分はpassと同様の扱いとする
      roomInfo.passCount += 1;
    }
  }
  console.log(nextTurn);
  let nextTurnUserId = orderList[nextTurn].userId;
  let currentTurnUserId = orderList[currentTurnIndex].userId;
  orderList.forEach(element => {
    remainingCards.push({
      cardNum: users[element.userId].card.length,
      playerName: users[element.userId].dispName
    });
  });

  Object.keys(users).forEach(function(element) {
    //if (element != orderList[nextTurn]) {
    if(element != nextTurnUserId){
      commonRequire.io.to(element).emit("order", {
        flag: false,
        skip: false,
        //playerName: users[orderList[nextTurn]].dispName,
        playerName: users[nextTurnUserId].dispName,
        orderNum: nextTurn,
        endCurrentTurn: users[currentTurnUserId].rankNum != 0 ? currentTurnIndex : -1,
        orders: remainingCards
      });
    }
  });
  commonRequire.io.to(nextTurnUserId).emit("order", {
    flag: true,
    skip: users[nextTurnUserId].rank != "" ? true : false,
    orderNum: nextTurn,
    endCurrentTurn: users[currentTurnUserId].rankNum != 0 ? currentTurnIndex : -1,
    orders: remainingCards
  });
  roomInfo.currentTurnPos = nextTurn;
}

module.exports.notifyAgainTurn = (roomId, userId) => {
  const orderList = storeData.persistentData[roomId]["order"];
  const users = storeData.persistentData[roomId]["users"]; 
  const remainingCards = [];
  orderList.forEach(element => {
    remainingCards.push({
      cardNum: users[element.userId].card.length,
      playerName: users[element.userId].dispName
    });
  });
  for (let [key, value] of Object.entries(users)) {
    if(key === userId){
      commonRequire.io.to(userId).emit("againTurn", {
        orderNum: storeData.persistentData[roomId].currentTurnPos,
        orders: remainingCards
      });
    }else{
      commonRequire.io.to(key).emit("againTurnForOtherMember", {
        orderNum: storeData.persistentData[roomId].currentTurnPos,
        orders: remainingCards
      });
    }
  }
}