$(function() {
  var socket = io();
  const RANKING_DIC = {
    daihugou: "大富豪",
    hugou: "富豪",
    heimin: "平民",
    hinmin: "貧民",
    daihinmin: "大貧民"
  };
  const ERROR_DIC = {
    diffNumOfCards: "カードの枚数は合わせてください。",
    diffSuitCards: "スートしばりに合ったカードを出してください。",
    loseCards: "場のカードより強いものを出してください。",
    handError: "役ができていません。"
  };
  const DISPLAY_IMAGE_ID = {
    spade3: "3_spade",
    spade4: "4_spade",
    spade5: "5_spade",
    spade6: "6_spade",
    spade7: "7_spade",
    spade8: "8_spade",
    spade9: "9_spade",
    spade10: "10_spade",
    spade11: "jack_spade",
    spade12: "queen_spade",
    spade13: "king_spade",
    spade14: "1_spade",
    spade15: "2_spade",
    club3: "3_club",
    club4: "4_club",
    club5: "5_club",
    club6: "6_club",
    club7: "7_club",
    club8: "8_club",
    club9: "9_club",
    club10: "10_club",
    club11: "jack_club",
    club12: "queen_club",
    club13: "king_club",
    club14: "1_club",
    club15: "2_club",
    diamond3: "3_diamond",
    diamond4: "4_diamond",
    diamond5: "5_diamond",
    diamond6: "6_diamond",
    diamond7: "7_diamond",
    diamond8: "8_diamond",
    diamond9: "9_diamond",
    diamond10: "10_diamond",
    diamond11: "jack_diamond",
    diamond12: "queen_diamond",
    diamond13: "king_diamond",
    diamond14: "1_diamond",
    diamond15: "2_diamond",
    heart3: "3_heart",
    heart4: "4_heart",
    heart5: "5_heart",
    heart6: "6_heart",
    heart7: "7_heart",
    heart8: "8_heart",
    heart9: "9_heart",
    heart10: "10_heart",
    heart11: "jack_heart",
    heart12: "queen_heart",
    heart13: "king_heart",
    heart14: "1_heart",
    heart15: "2_heart",
    joker199: "black_joker",
    joker299: "red_joker"
  };
  const DISPLAY_DIC = {
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
    club3: "♧3",
    club4: "♧4",
    club5: "♧5",
    club6: "♧6",
    club7: "♧7",
    club8: "♧8",
    club9: "♧9",
    club10: "♧10",
    club11: "♧J",
    club12: "♧Q",
    club13: "♧K",
    club14: "♧A",
    club15: "♧2",
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
  $("#svgArea").load("https://cdn.glitch.com/1e9ade85-2eff-47c4-a1d3-a43938390d3d%2Fsvg-cards.svg?v=1587262437456 svg", function(){
		//SVGの処理
    console.log("画像読み込み完了");
	});
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
            roomList[key].roomDispName +
            "(定員：" +
            roomList[key].capacity +
            "人)" +
            "</label>"
        )
      );
      $("#selectRoomList").append(div);
    });
  }
  $("#joinRoom").click(function() {
    let roomId = $("input[name=roomRadios]:checked").val();
    socket.emit("join", {
      roomId: $("input[name=roomRadios]:checked").val(),
      playerName: $("#playerName").val()
    });
  });
  socket.on("joinedRoom", function(joinMembers) {
    //部屋ジョイン後
    console.log("JoinedRoom");
    $("#roomSelectArea").hide();
    $("#gameArea").show();
    Object.keys(joinMembers).forEach(function(key) {
      $("#gameCommentaryArea").append(
        joinMembers[key].dispName + "さんが部屋に入りました<br />"
      );
      $("#gameCommentaryArea").scrollTop(
        $("#gameCommentaryArea")[0].scrollHeight
      );
    });
  });
  socket.on("otherMemberJoinedRoom", function(joinMemberName) {
    //他のメンバーが部屋に入ったとき
    console.log("otherMemberJoinedRoom");
    $("#gameCommentaryArea").append(
      joinMemberName + "さんが部屋に入りました<br />"
    );
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
  });
  socket.on("connectError", function(msg) {
    $("#errorModalBody").text("");
    $("#errorModalBody").text(msg);
    $("#errorModal").modal();
  });
  //ゲームの準備ができたことを受け取る
  socket.on("gameReady", function(msg) {
    $("#gameCommentaryArea").append(
      "第" + msg.gameNum + "回ゲームを開始します" + "<br />"
    );
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
    $("#gameFieldArea").show();
    $("#rank").text("");
    $("#rematch").hide();
    $("#seiseki").text("");
    $("#field").text("なし");
    $("#other").text("");
    $("#elevenback").text("");
    $("#shibari").text("");
    $("#revolution").text("");
    $("#send").prop("disabled", true);
    $("#pass").prop("disabled", true);
    $("#cardList").empty();
    $("#cardList2").empty();
    msg.card.forEach(element => {
      const cardType = element.number + element.type;
      const svgInfo = $("#" + DISPLAY_IMAGE_ID[element.type + element.number])[0].innerHTML;
      //画像データを取得する
      let svg = $('<svg class="handCardImage">' + svgInfo + '</svg>');
      var check = $('<input class="disabled_checkbox" type="checkbox" checked="" />').attr({
          name: "cards",
          value: element.type + "_" + element.number
        });
      let box = $('<div class="image_box"/>').append(svg).append(check);
      let li = $('<li></li>').append(box);
      $("#cardList2").append(li);
    });
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
      //$("#order").text("あなたの番です");
      $("#gameCommentaryArea").append(
        "あなたのターンです。<br />"
      );
      if (msg.skip) {
        socket.emit("pass", {
          id: $("input[name=roomRadios]:checked").val()
        });
      }
    } else {
      $("#send").prop("disabled", true);
      $("#pass").prop("disabled", true);
      $("#cardList input").prop("disabled", true);
      //$("#order").text(msg.playerName + "の番です");
      $("#gameCommentaryArea").append(
        msg.playerName + "さんのターンです。<br />"
      );
    }
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
  });
  socket.on("order", function(msg) {
    console.log("order accept");
    if (msg.flag) {
      $("#send").prop("disabled", false);
      $("#pass").prop("disabled", false);
      $("#cardList input").prop("disabled", false);
      //$("#order").text("あなたの番です");
      $("#gameCommentaryArea").append(
        "あなたのターンです。<br />"
      );
      if (msg.skip) {
        socket.emit("pass", {
          id: $("input[name=roomRadios]:checked").val()
        });
      }
    } else {
      $("#send").prop("disabled", true);
      $("#pass").prop("disabled", true);
      $("#cardList input").prop("disabled", true);
      $("#gameCommentaryArea").append(
        msg.playerName + "さんのターンです。<br />"
      );
    }
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
  }); //カードを出したとき
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
      id: $("input[name=roomRadios]:checked").val()
    });
  });
  $("#pass").click(function() {
    socket.emit("pass", {
      id: $("input[name=roomRadios]:checked").val()
    });
  });
  socket.on("validateError", function(msg) {
    $("#errorMsg").show();
    $("#errorMsg").text(ERROR_DIC[msg.reason]);
  });
  socket.on("result", function(msg) {
    let message = "";
    for (let i = 0; i < msg.card.length; i++) {
      message =
        message + "　" + DISPLAY_DIC[msg.result[i].type + msg.result[i].number];
      $("#" + msg.card[i].type + msg.card[i].number).remove();
    }
    $("#field").text(message);
    $("#gameCommentaryArea").append(
          msg.playerName + "さんが"+ message +"を出しました。<br />"
    );      
    $("#other").text("");
    $("#errorMsg").hide();
    $("#errorMsg").text("");
  });
  socket.on("changeStatus", function(msg) {
    switch (msg.type) {
      case "elevenback":
        if(msg.value){
          $("#gameCommentaryArea").append(
          msg.playerName + "さんが11バックを発動しました。<br />"
        );
        } 
        $("#elevenback").text(msg.value ? "　11Back　" : "");
        break;
      case "revolution":
        if(msg.value){
          $("#gameCommentaryArea").append(
          msg.playerName + "さんが革命を発動しました。<br />"
        );
        }
        $("#revolution").text(msg.value ? "　革命中　" : "");
        break;
      case "shibari":
        if(msg.value){
          $("#gameCommentaryArea").append(
          msg.playerName + "さんがスートしばりを発動しました。<br />"
        );
        }
        $("#shibari").text(msg.value ? "　縛り　" : "");
        break;
      case "winjoker":
        $("#gameCommentaryArea").append(
          msg.playerName + "さんがスペ3返しを発動しました。場を流します。<br />"
        );
        //$("#other").text("JOKER討伐したので流しました。");
        $("#field").text("なし");
        for (let i = 0; i < msg.value.cards.length; i++) {
          $("#" + msg.value.cards[i].type + msg.value.cards[i].number).remove();
        }
        $("#elevenback").text("");
        $("#shibari").text("");
        break;
      case "doblejoker":
        $("#gameCommentaryArea").append(
          msg.playerName + "さんがダブルJOKERを発動しました。場を流します。<br />"
        );
        $("#field").text("なし");
        for (let i = 0; i < msg.value.cards.length; i++) {
          $("#" + msg.value.cards[i].type + msg.value.cards[i].number).remove();
        }
        $("#elevenback").text("");
        $("#shibari").text("");
        break;
      case "cut8":
        $("#gameCommentaryArea").append(
          msg.playerName + "さんが8切りを発動しました。場を流します。<br />"
        );
        $("#field").text("なし");
        for (let i = 0; i < msg.value.cards.length; i++) {
          $("#" + msg.value.cards[i].type + msg.value.cards[i].number).remove();
        }
        $("#elevenback").text("");
        $("#shibari").text("");
        break;
      case "cutPass":
        $("#gameCommentaryArea").append(
          "パスが一周したので場を流します。<br />"
        );
        $("#field").text("なし");
        $("#elevenback").text("");
        $("#shibari").text("");
        break;
    }
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
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
    $("#gameCommentaryArea").append("10秒後に次のゲームを始めます。<br />");
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
  });
  socket.on("nextGameStart", function(msg) {
    console.log("next game start");
    //$("#rematch").show();
    $("#gameCommentaryArea").append("10秒後に次のゲームを始めます。<br />");
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
    sleep(10, function () {
      socket.emit("rematch", {
        id: $("input[name=roomRadios]:checked").val(),
        roomid: $("input[name=roomRadios]:checked").val()
      });
    });
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
    socket.emit("rematch", {
      id: $("input[name=roomRadios]:checked").val(),
      roomid: $("input[name=roomRadios]:checked").val()
    });
  });
  
  // setIntervalを使う方法
  function sleep(waitSec, callbackFunc) {
    // 経過時間（秒）
    var spanedSec = 0;

    // 1秒間隔で無名関数を実行
    var id = setInterval(function() {
      spanedSec++;

      // 経過時間 >= 待機時間の場合、待機終了。
      if (spanedSec >= waitSec) {
        // タイマー停止
        clearInterval(id);

        // 完了時、コールバック関数を実行
        if (callbackFunc) callbackFunc();
      }
    }, 1000);
  }
});
