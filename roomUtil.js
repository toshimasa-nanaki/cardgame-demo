const commonUtil = require("./commonUtil.js");
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
  roomObj["roomDispName"] = roomInfo.dispName == "" ? createDefaultRoomName() : roomInfo.dispName;
  roomObj["capacity"] = roomInfo.capacity;
  storeData.persistentData[createRoomId] = roomObj;
  LOGGER.info("createdRoom:  " + roomObj.roomDispName);
  io.emit("createdRoom", { [createRoomId]: roomObj });
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
