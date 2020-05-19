import socketConnection from "../common/socketIO";
import debugLog from "../common/logger.js";
import constant from "../constant";

/**
   * 部屋一覧の更新要求を受けた時の動作
   */
  socketConnection.on("updateRoomList", createdRoomInfo => {
    debugLog("updateRoomList");
    createRoomCardList(createdRoomInfo);
  });
  /**
   * 部屋一覧を表示する(初回接続時)
   */
  socketConnection.on("showRoomList", roomInfoList => {
    //サーバ接続時に部屋一覧を渡す
    debugLog("ShowRoom");
    createRoomCardList(roomInfoList);
  });

/**
   * ルーム一覧用のカード表示を作成する
   */
  function createRoomCardList(roomList) {
    Object.keys(roomList).forEach(key　=> {
      debugLog(roomList[key]);
      const divCard = $('<div class="card"></div>');
      const divCardStatus = $('<div class="card-header"></div>');
      const divCardBody = $('<div class="card-body"></div>');
      const pCardRoomTitle = $('<p class="card-text"></p>');
      const pCardRoomSetNum = $('<p class="card-text"></p>');
      const pCardRoomRule = $('<p class="card-text"></p>');
      let buttonJoinRoom = "";

      pCardRoomTitle.text(
        "部屋名：" +
          roomList[key].roomDispName +
          "(定員：" +
          roomList[key].capacity +
          "人)"
      );
      pCardRoomSetNum.text("セット数：" + roomList[key].setNum + "セット(" + roomList[key].setNum * 4 + "ゲーム)");
      pCardRoomRule.text("追加ルール："+ transRuleArrayToString(roomList[key].ruleSet));
      switch (roomList[key].status) {
        case "recruiting":
          divCardStatus.text("メンバー募集中");
          buttonJoinRoom = $("<button>参加</button>")
            .addClass("btn btn-outline-primary")
            .data("roomId", roomList[key].roomId)
            .on("click", () => {
              socketConnection.emit("join", {
                roomId: roomList[key].roomId,
                playerName: $("#playerName").val()
              });
              document.cookie =
                "name=" + $("#playerName").val() + "; max-age=259200";
            });
          break;
        case "inProgress":
          divCard.addClass("bg-primary text-white");
          divCardStatus.text("ゲーム中");
          break;
        case "urgentRecruiting":
          divCard.addClass("bg-warning");
          divCardStatus.text("メンバー緊急募集中");
          buttonJoinRoom = $("<button>緊急参加(再接続)</button>")
            .addClass("btn btn-outline-danger")
            .data("roomId", roomList[key].roomId)
            .on("click", (e) => {
              //次の画面のボタンにroomIdをつけておく
              document.getElementById('retryConnectRoomButton').dataset.roomId = roomList[key].roomId;
              socketConnection.emit("join", {
                roomId: roomList[key].roomId,
                playerName: $("#playerName").val()
              });
              document.cookie =
                "name=" + $("#playerName").val() + "; max-age=259200";
            });
          break;
      }
      divCardBody.append(pCardRoomTitle, pCardRoomSetNum, pCardRoomRule);
      if (buttonJoinRoom != "") {
        divCardBody.append(buttonJoinRoom);
      }
      divCard.append(divCardStatus, divCardBody);
      $("#selectRoomList").prepend(divCard);
    });
  }
  /**
   * ルールセットを画面に表示できる形に変換
   */
  const transRuleArrayToString = (ruleArray) => {
    let str = "";
    ruleArray.forEach((ele, index, arr) => {
      str += constant.RULESET_DIC[ele];
      if(index !== arr.length - 1) str += "," 
    });
    return str;
  };
