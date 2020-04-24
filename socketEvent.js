//import { store, io } from './index';
var item = require('./index.js');
const log4js = require("log4js");
const logger = log4js.getLogger();
// const app = require("express")();
// const http = require("http").Server(app);
// const io = require("socket.io")(http);

exports.load_common_event = function(socket) {
  socket.on("disconnect", () => {
    const roomIds = Object.keys(item.store);
    for (const roomId of roomIds) {
      if (~Object.keys(item.store[roomId]["users"]).indexOf(socket.id)) {
        logger.warn(
          item.store[roomId]["users"][socket.id].dispName +
            "が" +
            item.store[roomId].roomDispName +
            "から退出"
        );
        logger.debug("storeの状態" + JSON.stringify(item.store));
        delete item.store[roomId]["users"][socket.id];
        socket.leave(roomId);
        if (item.store[roomId].startedGame) {
          logger.debug("送る" + JSON.stringify(roomId) + "と" + item.store[roomId].roomId);
          item.io.to(item.store[roomId].roomId).emit("releaseRoom", {
            reason: "goOutRoom"
          });
        }
        //TODO 部屋の状態もおかしくなるので削除する
        //delete store[roomId];
      }
    }
});
  
exports.load_room_event = function(socket) {
  socket.on("requestRoomCreate", roomInfo => {
    const createRoomId = uniqueId();
    const roomObj = {
      roomId: createRoomId,
      roomDispName:
        roomInfo.dispName == "" ? createdDefaultRoomName() : roomInfo.dispName,
      capacity: roomInfo.capacity == "" ? 4 : roomInfo.capacity,
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
      giveCardCount: 0
    };
    store[createRoomId] = roomObj;
    logger.info("createdRoom:  " + roomObj.roomDispName);
    io.emit("createdRoom", { [createRoomId]: roomObj });
  });
};
};
