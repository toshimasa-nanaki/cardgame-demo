"use strict";

const commonUtil = require("./commonUtil.js");
const gameUtil = require("./gameUtil.js");
const storeData = require("./storeData.js");
const commonRequire = require("./commonRequire.js");
const loggerUtil = require("./loggerUtil.js");
const LOGGER = loggerUtil.logger;
const io = commonRequire.io;

// let roomObjectTemp = {
//   roomId: "", //部屋を一意に決めるID
//   roomDispName: "", //部屋の表示名
//   capacity: 0, //部屋の定員数
//   gameNum: 1, //ゲーム回
//   passCount: 0, //パス数
//   elevenback: false, //11backフラグ
//   shibari: false, //縛りフラグ
//   revolution: false, //革命フラグ
//   stair: false, //階段フラグ
//   fieldCards: [], //場のカード配列
//   scoreTable: [], //階級別のスコアテーブル
//   finishNum: 0, //上がったプレイヤーの数
//   order: [], //順番
//   currentTurnPos: 0, //今order配列上何番目の人のターンか
//   startedGame: false, //ゲームが開始されているか否かのフラグ
//   rankCount: 1, //次に割り当てられる順位
//   giveCardCount: 0, //カードを譲渡を実施した回数(最大2回想定)
//   users: {}, //ユーザ情報
//   blindCards: [], //ブラインドカード
//   leaveUserIds: []  //抜けた人のid
// };

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
  currentTurnPos: 0, //今order配列上何番目の人のターンか
  startedGame: false, //ゲームが開始されているか否かのフラグ
  rankCount: 1, //次に割り当てられる順位
  giveCardCount: 0, //カードを譲渡を実施した回数(最大2回想定)
  users: {}, //ユーザ情報
  blindCards: [], //ブラインドカード
  leaveUserIds: []  //抜けた人のid
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
  LOGGER.debug("reJoinInfo:" + JSON.stringify(reJoinInfo));
  LOGGER.debug("reJoinInfoでユーザー情報とれる？:" + JSON.stringify(storeData.persistentData[reJoinInfo.roomId]["users"][reJoinInfo.reconnectUserId]));
  let reconnectUser = {
      dispName: reJoinInfo.playerName !== "" ? commonUtil.htmlentities(reJoinInfo.playerName) : storeData.persistentData[reJoinInfo.roomId]["user"][reJoinInfo.reconnectUserId].dispName,
      card: storeData.persistentData[reJoinInfo.roomId]["users"][reJoinInfo.reconnectUserId].card,
      rank: storeData.persistentData[reJoinInfo.roomId]["users"][reJoinInfo.reconnectUserId].rank,
      rankNum: storeData.persistentData[reJoinInfo.roomId]["users"][reJoinInfo.reconnectUserId].rankNum,
      rankReason: storeData.persistentData[reJoinInfo.roomId]["users"][reJoinInfo.reconnectUserId].rankReason,
      finishTime: storeData.persistentData[reJoinInfo.roomId]["users"][reJoinInfo.reconnectUserId].finishTime,
      point: storeData.persistentData[reJoinInfo.roomId]["users"][reJoinInfo.reconnectUserId].point,
      firstPlace: storeData.persistentData[reJoinInfo.roomId]["users"][reJoinInfo.reconnectUserId].firstPlace,
      giveCard: storeData.persistentData[reJoinInfo.roomId]["users"][reJoinInfo.reconnectUserId].giveCard
  };
  LOGGER.debug("接続しようとしているsocketid:" + socketObj.id);
  LOGGER.debug("前に接続していたsocketid:" + reJoinInfo.reconnectUserId);
  LOGGER.debug("今のユーザー情報:" + JSON.stringify(storeData.persistentData[reJoinInfo.roomId]["users"]));
  storeData.persistentData[reJoinInfo.roomId]["users"][socketObj.id] = reconnectUser;
  LOGGER.debug("追加後のユーザー情報:" + JSON.stringify(storeData.persistentData[reJoinInfo.roomId]["users"]));
  delete storeData.persistentData[reJoinInfo.roomId]["users"][reJoinInfo.reconnectUserId];
  
  LOGGER.debug("削除後のユーザー情報:" + JSON.stringify(storeData.persistentData[reJoinInfo.roomId]["users"]));
  
  LOGGER.debug("置換前のorder:" + JSON.stringify(storeData.persistentData[reJoinInfo.roomId].order));
  let orderIndex = storeData.persistentData[reJoinInfo.roomId].order.indexOf(reJoinInfo.reconnectUserId);
  storeData.persistentData[reJoinInfo.roomId].order.splice(orderIndex, 1, socketObj.id);
  //storeData.persistentData[reJoinInfo.roomId].order = storeData.persistentData[reJoinInfo.roomId].order.splice(orderIndex, 1, socketObj.id);
  LOGGER.debug("置換後のorder:" + JSON.stringify(storeData.persistentData[reJoinInfo.roomId].order));
  
  //この時点でleaveメンバーから抜く
  LOGGER.debug("抜く前のleaveUserIds:" + JSON.stringify(storeData.persistentData[reJoinInfo.roomId].leaveUserIds));
  //let deleteLeaveUserPos = storeData.persistentData[reJoinInfo.roomId].leaveUserIds.indexOf(reJoinInfo.reconnectUserId);
  let deleteLeaveUserPos = 0;
  storeData.persistentData[reJoinInfo.roomId].leaveUserIds.some(ele => {
    if(ele.id === reJoinInfo.reconnectUserId) return true;
    deleteLeaveUserPos++;
    if(deleteLeaveUserPos === storeData.persistentData[reJoinInfo.roomId].leaveUserIds.length){
      //最後まで見つからなかったということ
      deleteLeaveUserPos = -1;
    }
  });
  if(deleteLeaveUserPos !== -1){
    storeData.persistentData[reJoinInfo.roomId].leaveUserIds.splice(deleteLeaveUserPos, 1);
  }else{
    //おかしな現象なのでエラーをはいておく
    LOGGER.error("なんでLeaveにいないメンバーで入ろうとしてるねん");
  }
  LOGGER.debug("抜いたあとのleaveUserIds:" + JSON.stringify(storeData.persistentData[reJoinInfo.roomId].leaveUserIds));
  
  socketObj.join(reJoinInfo.roomId);
  const userDispList = [];
  storeData.persistentData[reJoinInfo.roomId]["order"].forEach(key => {
    userDispList.push(storeData.persistentData[reJoinInfo.roomId]["users"][key].dispName);
  });
  //あとはクライアントがわに送るだけ
  io.to(socketObj.id).emit("reJoinOK", {
    gameNum: storeData.persistentData[reJoinInfo.roomId].gameNum,
    card: storeData.persistentData[reJoinInfo.roomId]["users"][socketObj.id].card,
    yourTurn: storeData.persistentData[reJoinInfo.roomId].currentTurnPos === storeData.persistentData[reJoinInfo.roomId].order.indexOf(socketObj.id) ? true : false,
    playerName: storeData.persistentData[reJoinInfo.roomId]["users"][storeData.persistentData[reJoinInfo.roomId].order[storeData.persistentData[reJoinInfo.roomId].currentTurnPos]].dispName,
    playerName2: storeData.persistentData[reJoinInfo.roomId]["users"][socketObj.id].dispName,
    playerPoint: storeData.persistentData[reJoinInfo.roomId]["users"][socketObj.id].point,
    blindCards: storeData.persistentData[reJoinInfo.roomId].blindCards,
    orderNum: storeData.persistentData[reJoinInfo.roomId].currentTurnPos,
    userList: userDispList
  });
  for (let [key, value] of Object.entries(storeData.persistentData[reJoinInfo.roomId]["users"])) {
      if (key !== socketObj.id) io.to(key).emit("otherMemberReJoinedOK", {
        playerName: reconnectUser.dispName,
        memberOK: storeData.persistentData[reJoinInfo.roomId].leaveUserIds.length === 0
      });
  }
//   if(storeData.persistentData[reJoinInfo.roomId].leaveUserIds.length === 0){
//     //人数がそろえばフリーズを解除する。
    
//   }
};

const createDefaultRoomName = () => {
  const now = new Date(Date.now() + ((new Date().getTimezoneOffset() + (9 * 60)) * 60 * 1000));
  return commonUtil.formatDate(now, 'yyyy_MM_dd_HH:mm:ss.SSS');
};
