import { store, io } from './index';
const log4js = require("log4js");
const logger = log4js.getLogger();
// const app = require("express")();
// const http = require("http").Server(app);
// const io = require("socket.io")(http);

exports.load_common_event = function(socket) {
  socket.on("disconnect", () => {
    const roomIds = Object.keys(store);
    for (const roomId of roomIds) {
      if (~Object.keys(store[roomId]["users"]).indexOf(socket.id)) {
        logger.warn(
          store[roomId]["users"][socket.id].dispName +
            "が" +
            store[roomId].roomDispName +
            "から退出"
        );
        logger.debug("storeの状態" + JSON.stringify(store));
        delete store[roomId]["users"][socket.id];
        socket.leave(roomId);
        if (store[roomId].startedGame) {
          logger.debug("送る" + JSON.stringify(roomId) + "と" + store[roomId].roomId);
          io.to(store[roomId].roomId).emit("releaseRoom", {
            reason: "goOutRoom"
          });
        }
        //TODO 部屋の状態もおかしくなるので削除する
        //delete store[roomId];
      }
    }
});
};
