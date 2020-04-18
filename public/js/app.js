$(function() {
  var socket = io();
  var RANKING_DIC = {
    daihugou: "大富豪",
    hugou: "富豪",
    heimin: "平民",
    hinmin: "貧民",
    daihinmin: "大貧民"
  };
  var DISPLAY_DIC = {
    spade3: "♠3",
    spade4: "♠4",
    spade5: "♠5",
    spade6: "♠6",
    spade7: "♠7",
    spade8: "♠8",
    spade9: "♠9",
    spade10: "♠10",
    spade11: "♠J",
    spade12: "♠Q",
    spade13: "♠K",
    spade14: "♠A",
    spade15: "♠2",
    clover3: "♧3",
    clover4: "♧4",
    clover5: "♧5",
    clover6: "♧6",
    clover7: "♧7",
    clover8: "♧8",
    clover9: "♧9",
    clover10: "♧10",
    clover11: "♧J",
    clover12: "♧Q",
    clover13: "♧K",
    clover14: "♧A",
    clover15: "♧2",
    diamond3: "♦3",
    diamond4: "♦4",
    diamond5: "♦5",
    diamond6: "♦6",
    diamond7: "♦7",
    diamond8: "♦8",
    diamond9: "♦9",
    diamond10: "♦10",
    diamond11: "♦J",
    diamond12: "♦Q",
    diamond13: "♦K",
    diamond14: "♦A",
    diamond15: "♦2",
    heart3: "♥3",
    heart4: "♥4",
    heart5: "♥5",
    heart6: "♥6",
    heart7: "♥7",
    heart8: "♥8",
    heart9: "♥9",
    heart10: "♥10",
    heart11: "♥J",
    heart12: "♥Q",
    heart13: "♥K",
    heart14: "♥A",
    heart15: "♥2",
    joker199: "JOKER",
    joker299: "JOKER"
  };
  $("#requestRoomCreate").click(function() {
    //部屋作成時
    socket.emit("requestRoomCreate", {
      dispName: $("#roomDispName").val(),
      capacity: $("#roomcapacity").val()
    });
  });
  socket.on("createdRoom", function(roomList) {
    //部屋作成完了後
    console.log("CreatedRoom");
    createSelectRoomRadioButton(roomList);
  });

  socket.on("showRoomList", function(roomList) {
    //サーバ接続時に部屋一覧を渡す
    console.log("ShowRoom");
    createSelectRoomRadioButton(roomList);
  });

  // 部屋一覧のラジオボタン生成
  function createSelectRoomRadioButton(roomList) {
    Object.keys(roomList).forEach(function(key) {
      console.log(roomList[key]);
      const div = $('<div class="form-check"></div>');
      div.append(
        $('<input type="radio" />').attr({
          class: "form-check-input",
          name: "roomRadios",
          value: roomList[key].roomId,
          id: "room_" + roomList[key].roomId
        })
      );
      div.append(
        $(
          '<label class="form-check-label" for="' +
            "room_" +
            roomList[key].roomId +
            '">' +
            roomList[key].roomDispName + "(定員：" + roomList[key].capacity + "人)" +
            "</label>"
        )
      );
      $("#selectRoomList").append(div);
    });
  }
  $("#joinRoom").click(function() {
    let roomId = $('input[name=roomRadios]:checked').val();
    socket.emit("join", {
      roomId: $('input[name=roomRadios]:checked').val(),
      playerName: $("#playerName").val()
    });
  });
  socket.on("joinedRoom", function(joinMembers) {
    //部屋ジョイン後
    console.log("JoinedRoom");
    $("#roomSelectArea").hide();
    $("#gameArea").show();
    Object.keys(joinMembers).forEach(function(key){
      $("#gameCommentaryArea").append( joinMembers[key] + "さんが部屋に入りました<br />" );
      $("#gameCommentaryArea").scrollTop( $("#gameCommentaryArea")[0].scrollHeight );
    });
  });
  socket.on("otherMemberJoinedRoom", function(joinMemberName) {
    //他のメンバーが部屋に入ったとき
    console.log("otherMemberJoinedRoom");
    $("#gameCommentaryArea").append( joinMemberName + "さんが部屋に入りました<br />" );
    $("#gameCommentaryArea").scrollTop( $("#gameCommentaryArea")[0].scrollHeight );
  });
  socket.on("connectError", function(msg) {
    $('#errorModalBody').text("");
    $('#errorModalBody').text(msg);
    $('#errorModal').modal();
  });
  //ゲームの準備ができたことを受け取る
  socket.on("gameReady", function(msg) {
    $("#gameCommentaryArea").append( "ゲームを開始します" + "<br />" );
    $("#gameCommentaryArea").scrollTop( $("#gameCommentaryArea")[0].scrollHeight );
    $("#gameFieldArea").show();
    $("#send").prop("disabled", true);
    $("#pass").prop("disabled", true);
    $("#cardList").empty();
    msg.card.forEach(element => {
      var check = $(
        '<label id="' +
          element.type +
          element.number +
          '">' +
          DISPLAY_DIC[element.type + element.number] +
          "</label>"
      ).prepend(
        $('<input type="checkbox" />').attr({
          name: "cards",
          value: element.type + "_" + element.number
        })
      );
      $("#cardList").append(check);
    });
    console.log("order accept");
    if (msg.yourTurn) {
      $("#send").prop("disabled", false);
      $("#pass").prop("disabled", false);
      $("#cardList input").prop("disabled", false);
      $("#order").text("あなたの番です");
      if (msg.skip) {
        socket.emit("pass", {
          id: $('input[name=roomRadios]:checked').val()
        });
      }
    } else {
      $("#send").prop("disabled", true);
      $("#pass").prop("disabled", true);
      $("#cardList input").prop("disabled", true);
      $("#order").text(msg.playerName + "の番です");
    }
  });
  socket.on("order", function(msg) {
    console.log("order accept");
    if (msg.flag) {
      $("#send").prop("disabled", false);
      $("#pass").prop("disabled", false);
      $("#cardList input").prop("disabled", false);
      $("#order").text("あなたの番です");
      if (msg.skip) {
        socket.emit("pass", {
          id: $('input[name=roomRadios]:checked').val()
        });
      }
    } else {
      $("#send").prop("disabled", true);
      $("#pass").prop("disabled", true);
      $("#cardList input").prop("disabled", true);
      $("#order").text(msg.playerName + "の番です");
    }
    window.scrollTo(0, document.body.scrollHeight);
  });
　//カードを出したとき
  $("#send").click(function() {
    let sendCards = [];
    let cardarr;
    $('input:checkbox[name="cards"]:checked').each(function() {
      cardarr = $(this)
        .val()
        .split("_");
      sendCards.push({ type: cardarr[0], number: Number(cardarr[1]) });
    });
    //カードの確認をしてもらう
    socket.emit("validate", {
      cards: sendCards,
      id: $('input[name=roomRadios]:checked').val()
    });
  });
  $("#pass").click(function() {
    socket.emit("pass", {
      id: $('input[name=roomRadios]:checked').val()
    });
  });
  socket.on("validateError", function(msg) {
    $("#errorMsg").show();
    $("#errorMsg").text(msg.reason);
  });
  socket.on("result", function(msg) {
    let message = "現在のカード: ";
    for (let i = 0; i < msg.card.length; i++) {
      message =
        message +
        "　" +
        DISPLAY_DIC[msg.result[i].type + msg.result[i].number];
      $("#" + msg.card[i].type + msg.card[i].number).remove();
    }
    $("#field").text(message);
    $("#other").text("");
    $("#errorMsg").hide();
    $("#errorMsg").text("");
  });
  socket.on("changeStatus", function(msg) {
    switch (msg.type) {
      case "elevenback":
        $("#elevenback").text(msg.value ? "　11Back　" : "");
        break;
      case "revolution":
        $("#revolution").text(msg.value ? "　革命中　" : "");
        break;
      case "shibari":
        $("#shibari").text(msg.value ? "　縛り　" : "");
        break;
      case "winjoker":
        $("#other").text("JOKER討伐したので流しました。");
        $("#field").text("現在のカード: なし");
        for (let i = 0; i < msg.value.cards.length; i++) {
          $("#" + msg.value.cards[i].type + msg.value.cards[i].number).remove();
        }
        $("#elevenback").text("");
        $("#shibari").text("");
        break;
      case "doblejoker":
        $("#other").text("ダブルJOKERなので流しました。");
        $("#field").text("現在のカード: なし");
        for (let i = 0; i < msg.value.cards.length; i++) {
          $("#" + msg.value.cards[i].type + msg.value.cards[i].number).remove();
        }
        $("#elevenback").text("");
        $("#shibari").text("");
        break;
      case "cut8":
        $("#other").text("8切ました。");
        $("#field").text("現在のカード: なし");
        for (let i = 0; i < msg.value.cards.length; i++) {
          $("#" + msg.value.cards[i].type + msg.value.cards[i].number).remove();
        }
        $("#elevenback").text("");
        $("#shibari").text("");
        break;
      case "cutPass":
        $("#other").text("パスが一周したので流しました");
        $("#field").text("現在のカード: なし");
        $("#elevenback").text("");
        $("#shibari").text("");
        break;
    }
  });
  socket.on("finish", function(msg) {
    console.log("finish accept");
    $("#gameFieldArea").toggle();
    switch (msg) {
      case "daihugou":
        $("#seiseki").text("大富豪です！！！");
        break;
      case "hugou":
        $("#seiseki").text("富豪です！！！");
        break;
      case "heimin":
        $("#seiseki").text("平民です！！！");
        break;
      case "hinmin":
        $("#seiseki").text("貧民です！！！");
        break;
      case "daihinmin":
        $("#seiseki").text("大貧民です！！！");
        break;
    }
  });
  socket.on("finishNotification", function(msg) {
    console.log("finish accept notification");
    $("#rank").append(
      $("<li>").text(RANKING_DIC[msg.rank] + "：" + msg.playerName)
    );
  });
  socket.on("gameFinish", function(msg) {
    console.log("game finish");
    $("#rematch").show();
  });
  $("#rematch").click(function() {
    $("#rank").text("");
    $("#rematch").hide();
    $("#seiseki").text("");
    $("#field").text("現在のカード：なし");
    $("#other").text("");
    $("#elevenback").text("");
    $("#shibari").text("");
    $("#revolution").text("");
    socket.emit("rematch", { id: $('input[name=roomRadios]:checked').val(), roomid: $('input[name=roomRadios]:checked').val() });
  });
});
