"use strict";

const commonUtil = require("./commonUtil.js");
const gameUtil = require("./gameUtil.js");
const storeData = require("./storeData.js");
const commonRequire = require("./commonRequire.js");
const loggerUtil = require("./loggerUtil.js");
const LOGGER = loggerUtil.logger;
const io = commonRequire.io;

let roomObjectTemp = {
  roomId: "", //部屋を一意に決めるID
  roomDispName: "", //部屋の表示名
  capacity: 0, //部屋の定員数
  gameNum: 1, //ゲーム回
  passCount: 0, //パス数
  elevenback: false, //11backフラグ
  shibari: false, //縛りフラグ
  revolution: false, //革命フラグ
  stair: false, //階段フラグ
  fieldCards: [], //場のカード配列
  scoreTable: [], //階級別のスコアテーブル
  finishNum: 0, //上がったプレイヤーの数
  order: [], //順番
  startedGame: false, //ゲームが開始されているか否かのフラグ
  rankCount: 1, //次に割り当てられる順位
  giveCardCount: 0, //カードを譲渡を実施した回数(最大2回想定)
  users: {}, //ユーザ情報
  blindCards: [], //ブラインドカード
  leaveUserIds: []  //抜けた人のid
};

module.exports.createRoom = roomInfo => {
  const createRoomId = commonUtil.createUniqueId();
  let roomObj = {
  roomId: "", //部屋を一意に決めるID
  roomDispName: "", //部屋の表示名
  capacity: 0, //部屋の定員数
  gameNum: 1, //ゲーム回
  passCount: 0, //パス数
  elevenback: false, //11backフラグ
  shibari: false, //縛りフラグ
  revolution: false, //革命フラグ
  stair: false, //階段フラグ
  fieldCards: [], //場のカード配列
  scoreTable: [], //階級別のスコアテーブル
  finishNum: 0, //上がったプレイヤーの数
  order: [], //順番
  startedGame: false, //ゲームが開始されているか否かのフラグ
  rankCount: 1, //次に割り当てられる順位
  giveCardCount: 0, //カードを譲渡を実施した回数(最大2回想定)
  users: {}, //ユーザ情報
  blindCards: [] //ブラインドカード
};
  roomObj["roomId"] = createRoomId;
  roomObj["roomDispName"] = roomInfo.dispName === "" ? createDefaultRoomName() : commonUtil.htmlentities(roomInfo.dispName);
  roomObj["capacity"] = roomInfo.capacity === "" ? 4 : Number(roomInfo.capacity);
  storeData.persistentData[createRoomId] = roomObj;
  LOGGER.info("createdRoom:  " + roomObj.roomDispName);
  io.emit("createdRoom", { [createRoomId]: roomObj });
};

module.exports.joinRoom = (joinInfo, socketObj) => {
  const roomCapacity = storeData.persistentData[joinInfo.roomId].capacity;
    if (Object.keys(storeData.persistentData[joinInfo.roomId]["users"]).length >= roomCapacity) {
      if(storeData.persistentData[joinInfo.roomId].leaveUserIds.length > 0){
        //抜けたユーザーがいる場合、入れる可能性がある。        
        io.to(socketObj.id).emit("connectRetry", {leaveUserInfo: storeData.persistentData[joinInfo.roomId].leaveUserIds});
      }else{
        io.to(socketObj.id).emit("connectError", "roomFull");
      }
      return;
    }
    storeData.persistentData[joinInfo.roomId]["users"][socketObj.id] = {
      dispName: commonUtil.htmlentities(joinInfo.playerName),
      card: [],
      rank: "",
      rankNum: 0,
      rankReason: "",
      finishTime: 0,
      point: 0,
      firstPlace: false,
      giveCard: []
    };
    socketObj.join(joinInfo.roomId);
    io.to(socketObj.id).emit("joinedRoom", storeData.persistentData[joinInfo.roomId]["users"]);
    for (let [key, value] of Object.entries(storeData.persistentData[joinInfo.roomId]["users"])) {
      if (key !== socketObj.id) io.to(key).emit("otherMemberJoinedRoom", commonUtil.htmlentities(joinInfo.playerName));
    }
    const currentPlayerNum = Object.keys(storeData.persistentData[joinInfo.roomId]["users"]).length;
    if (currentPlayerNum === roomCapacity) {
      LOGGER.info("There were members in the room.");
      gameUtil.gameInit(currentPlayerNum, storeData.persistentData[joinInfo.roomId]["users"], joinInfo.roomId);
    }
  
};

module.exports.reJoinRoom = (reJoinInfo, socketObj) => {
  //TODOとりあえずあること前提で書く。でも無い場合もあるかもしれないのでその時はエラーなど対応が必要。
  //置き換えの必要があるもの
  //・user情報
  //・order情報
  //まず新しくユーザー情報を作る
  let reconnectUser = {
      dispName: reJoinInfo.playerName !== "" ? commonUtil.htmlentities(reJoinInfo.playerName) : storeData.persistentData[reJoinInfo.roomId]["user"][reJoinInfo.userId].dispName,
      card: storeData.persistentData[reJoinInfo.roomId]["user"][reJoinInfo.userId].card,
      rank: storeData.persistentData[reJoinInfo.roomId]["user"][reJoinInfo.userId].rank,
      rankNum: storeData.persistentData[reJoinInfo.roomId]["user"][reJoinInfo.userId].rankNum,
      rankReason: storeData.persistentData[reJoinInfo.roomId]["user"][reJoinInfo.userId].rankReason,
      finishTime: storeData.persistentData[reJoinInfo.roomId]["user"][reJoinInfo.userId].finishTime,
      point: storeData.persistentData[reJoinInfo.roomId]["user"][reJoinInfo.userId].point,
      firstPlace: storeData.persistentData[reJoinInfo.roomId]["user"][reJoinInfo.userId].firstPlace,
      giveCard: storeData.persistentData[reJoinInfo.roomId]["user"][reJoinInfo.userId].giveCard
  };
  storeData.persistentData[reJoinInfo.roomId]["users"][socketObj.id] = reconnectUser;
  delete storeData.persistentData[reJoinInfo.roomId]["users"][reJoinInfo.userId];
  
  let orderIndex = storeData.persistentData[reJoinInfo.roomId].order.indexOf(reJoinInfo.userId);
  storeData.persistentData[reJoinInfo.roomId].order = storeData.persistentData[reJoinInfo.roomId].order.splice(orderIndex, 1, socketObj.id);
  
  //あとはクライアントがわに送るだけ
  io.to(socketObj.id).emit("reJoinOK", {
    gameNum: storeData.persistentData[roomId].gameNum,
    card: users[orders[0]].card,
    yourTurn: true,
    playerName: users[orders[0]].dispName,
    playerName2: users[orders[0]].dispName,
    playerPoint: users[orders[0]].point,
    blindCards: storeData.persistentData[roomId].blindCards,
    orderNum: 0,
    userList: userDispList
  });
};

const createDefaultRoomName = () => {
  const now = new Date(Date.now() + ((new Date().getTimezoneOffset() + (9 * 60)) * 60 * 1000));
  return commonUtil.formatDate(now, 'yyyy_MM_dd_HH:mm:ss.SSS');
};
