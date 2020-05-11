const storeData = require("./storeData.js");
const commonRequire = require("./common/commonRequire.js");
const commonUtil = require("./common/commonUtil.js");
const roomUtil = require("./roomUtil.js");
const loggerUtil = require("./loggerUtil.js");
const LOGGER = loggerUtil.logger;
const notifyUtil = require("./notifyUtil.js");
const io = commonRequire.io;
module.exports.load_common_event = socket => {
  socket.on("disconnect", () => {
    const roomIds = Object.keys(storeData.persistentData);
    for (const roomId of roomIds) {
      if (
        ~Object.keys(storeData.persistentData[roomId]["users"]).indexOf(
          socket.id
        )
      ) {
        console.log(
          storeData.persistentData[roomId]["users"][socket.id].dispName +
            "が" +
            storeData.persistentData[roomId].roomDispName +
            "から退出"
        );
        console.log("storeの状態" + JSON.stringify(storeData.persistentData));
        //delete storeData.persistentData[roomId]["users"][socket.id];
        socket.leave(roomId);
        if (storeData.persistentData[roomId].startedGame) {
          LOGGER.debug(
            "leaveUserIdsの状態" +
              JSON.stringify(storeData.persistentData[roomId].leaveUserIds)
          );
          storeData.persistentData[roomId].status = "urgentRecruiting";
          storeData.persistentData[roomId].leaveUserIds.push({
            id: socket.id,
            dispName:
              storeData.persistentData[roomId]["users"][socket.id].dispName
          });
          console.log(
            "送る" +
              JSON.stringify(roomId) +
              "と" +
              storeData.persistentData[roomId].roomId
          );
          io.to(storeData.persistentData[roomId].roomId).emit("releaseRoom", {
            reason: "goOutRoom"
          });
        } else {
          //ゲーム始まっていないなら抜けるだけ
          //TOODなんか送ったほうがいいのか？
        }
        if(storeData.persistentData[roomId].leaveUserIds.length === storeData.persistentData[roomId].capacity){
          //誰も部屋からいなくなったら消そう。さすがに。
          delete storeData.persistentData[roomId];
        }
        //部屋の状態もおかしくなるので削除する
        //delete storeData.persistentData[roomId];
      }
    }
  });
};

module.exports.load_room_event = socket => {
  socket.on("requestRoomCreate", roomInfo => {
    LOGGER.debug(JSON.stringify(roomInfo));
    roomUtil.createRoom(roomInfo);
  });
  socket.on("join", joinInfo => {
    roomUtil.joinRoom(joinInfo, socket);
  });
  socket.on("reJoin", reJoinInfo => {
    roomUtil.reJoinRoom(reJoinInfo, socket);
  });
};

module.exports.load_game_event = socket => {
  socket.on("pass", function(msg) {
    const orderList = storeData.persistentData[msg.id]["order"];
    const users = storeData.persistentData[msg.id]["users"];
    if (storeData.persistentData[msg.id].fieldCards.length === 0) {
      //フィールドにカードが出ていない場合はパスできない。
      commonRequire.io.to(socket.id).emit("validateError", {
        error: 1,
        reason: "fieldNothing"
      });
      return;
    }
    storeData.persistentData[msg.id].passCount =
      storeData.persistentData[msg.id].passCount + 1;
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
      commonRequire.io
        .to(storeData.persistentData[msg.id].roomId)
        .emit("changeStatus", { type: "cutPass" });
    }

    let currentTurn = orderList.indexOf(socket.id);

    notifyUtil.notifyChangeTurn(currentTurn, msg.id);
  });
};
