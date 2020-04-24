const commonUtil = require("./commonUtil.js");
const storeData = require("./storeData.js");

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
  rankCount: 1, //
  giveCardCount: 0,
  users: {}
};

module.exports.createRoom = roomInfo => {
  const createRoomId = commonUtil.createUniqueId();
  const roomObj = {
    roomId: createRoomId,
    roomDispName:
      roomInfo.dispName == "" ? createDefaultRoomName() : roomInfo.dispName,
    capacity: roomInfo.capacity,
    gameNum: 1,
    passCount: 0,
    elevenback: false,
    shibari: false,
    revolution: false,
    stair: false,
    fieldCards: [],
    scoreTable: [],
    finishNum: 0,
    order: [],
    startedGame: false,
    rankCount: 1,
    giveCardCount: 0,
    users: {}
  };
  storeData.persistentData[createRoomId] = roomObj;
};

module.exports.roomJoin = () => {};

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
