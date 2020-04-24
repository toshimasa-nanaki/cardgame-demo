// import { store, io } from './index';
// const log4js = require("log4js");
// const logger = log4js.getLogger();
// const app = require("express")();
// const http = require("http").Server(app);
// const io = require("socket.io")(http);
const storeData = require("./storeData.js");
const index = require("./index.js");
const io = index.io;
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
        //TODO 部屋の状態もおかしくなるので削除する
        //delete store[roomId];
      }
    }
});
};

module.exports.load_common_event = (socket)=> {
};
