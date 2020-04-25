// import { store, io } from './index';
// const log4js = require("log4js");
// const logger = log4js.getLogger();
// const app = require("express")();
// const http = require("http").Server(app);
// const io = require("socket.io")(http);
const storeData = require("./storeData.js");
const commonRequire = require("./commonRequire.js");
const commonUtil = require("./commonUtil.js");
const roomUtil = require("./roomUtil.js");
const loggerUtil = require("./loggerUtil.js");
const LOGGER = loggerUtil.logger;
const notifyUtil = require("./notifyUtil.js");
const io = commonRequire.io;
module.exports.load_common_event = (socket)=> {
  socket.on("disconnect", () => {
    const roomIds = Object.keys(storeData.persistentData);
    for (const roomId of roomIds) {
      if (~Object.keys(storeData.persistentData[roomId]["users"]).indexOf(socket.id)) {
        console.log(
          storeData.persistentData[roomId]["users"][socket.id].dispName +
            "が" +
            storeData.persistentData[roomId].roomDispName +
            "から退出"
        );
        console.log("storeの状態" + JSON.stringify(storeData.persistentData));
        delete storeData.persistentData[roomId]["users"][socket.id];
        socket.leave(roomId);
        if (storeData.persistentData[roomId].startedGame) {
          console.log("送る" + JSON.stringify(roomId) + "と" + storeData.persistentData[roomId].roomId);
          io.to(storeData.persistentData[roomId].roomId).emit("releaseRoom", {
            reason: "goOutRoom"
          });
        }
        //部屋の状態もおかしくなるので削除する
        delete storeData.persistentData[roomId];
      }
    }
});
};

module.exports.load_room_event = (socket)=> {
  socket.on("requestRoomCreate", roomInfo => {
    roomUtil.createRoom(roomInfo);
  });
  socket.on("join", joinInfo => {
    roomUtil.joinRoom(joinInfo, socket);
  });
};

module.exports.load_game_event = (socket)=> {
  socket.on("pass", function(msg) {
    const orderList = storeData.persistentData[msg.id]["order"];
    const users = storeData.persistentData[msg.id]["users"];
    storeData.persistentData[msg.id].passCount = storeData.persistentData[msg.id].passCount + 1;
    //const count = store[msg.id].capacity;
    LOGGER.debug(
      "今のpassCount:" +
        storeData.persistentData[msg.id].passCount +
        " 今のorderList長さ" +
        orderList.length
    );
    if (storeData.persistentData[msg.id].passCount >= orderList.length - 1) {
      //パスで一周した場合流す
      LOGGER.debug("流します");
      storeData.fieldClear(msg.id);
      commonRequire.io.to(storeData.persistentData[msg.id].roomId).emit("changeStatus", { type: "cutPass" });
    }

    let currentTurn = orderList.indexOf(socket.id);

    notifyUtil.notifyChangeTurn(currentTurn, msg.id);
  });
};
