"use strict";

const commonUtil = require("./commonUtil.js");
const gameUtil = require("./gameUtil.js");
const storeData = require("./storeData.js");
const index = require("./index.js");
const loggerUtil = require("./loggerUtil.js");
const LOGGER = loggerUtil.logger;
const io = index.io;

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
  users: {} //ユーザ情報
};

module.exports.createRoom = roomInfo => {
  const createRoomId = commonUtil.createUniqueId();
  let roomObj = roomObjectTemp;
  roomObj["roomId"] = createRoomId;
  roomObj["roomDispName"] = roomInfo.dispName === "" ? createDefaultRoomName() : roomInfo.dispName;
  roomObj["capacity"] = roomInfo.capacity === "" ? 4 : roomInfo.capacity;
  storeData.persistentData[createRoomId] = roomObj;
  LOGGER.info("createdRoom:  " + roomObj.roomDispName);
  io.emit("createdRoom", { [createRoomId]: roomObj });
};

module.exports.roomJoin = (joinInfo, socketObj) => {
  const roomCapacity = storeData.persistentData[joinInfo.roomId].capacity;
    if (Object.keys(storeData.persistentData[joinInfo.roomId]["users"]).length >= roomCapacity) {
      io.to(socketObj.id).emit("connectError", "roomFull");
      return;
    }
    storeData.persistentData[joinInfo.roomId]["users"][socketObj.id] = {
      dispName: joinInfo.playerName,
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
      if (key !== socketObj.id) io.to(key).emit("otherMemberJoinedRoom", joinInfo.playerName);
    }
    const currentPlayerNum = Object.keys(storeData.persistentData[joinInfo.roomId]["users"]).length;
    if (currentPlayerNum === roomCapacity) {
      LOGGER.info("There were members in the room.");
      gameUtil.gameInit(currentPlayerNum, storeData.persistentData[joinInfo.roomId]["users"], joinInfo.roomId);
    }
  
};

const createDefaultRoomName = () => {
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
