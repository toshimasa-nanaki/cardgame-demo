$(function() {
  var socket = io();
  const debugMode =
    location.search.substring(1) === "debug=true" ? true : false;
  const debugLog = debugMode ? console.log.bind(console) : () => {};
  const SUITES_DIC = {
    spade: "♠",
    club: "♣",
    diamond: "♦",
    heart: "♥"
  };
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
    handError: "役ができていません。",
    goOutRoom: "プレイヤーの数が減ったため部屋を解散します。",
    roomFull: "この部屋は既に定員に達しています。"
  };
  const LOSE_REASON_DIC = {
    spade3Finish: "スペ3あがりのため、反則負けとなりました。",
    jokerFinish: "ジョーカーあがりのため、反則負けとなりました。",
    card8Finish: "非階段状態での8あがりのため、反則負けとなりました。",
    card3Finish: "革命状態での3あがりのため、反則負けとなりました。",
    card2Finish: "非革命状態での2あがりのため、反則負けとなりました。",
    fallingOutCity: "都落ちのため、負けとなりました。"
  };
  const DISPLAY_IMAGE_ID = {
    spade3: "spade_3",
    spade4: "spade_4",
    spade5: "spade_5",
    spade6: "spade_6",
    spade7: "spade_7",
    spade8: "spade_8",
    spade9: "spade_9",
    spade10: "spade_10",
    spade11: "spade_jack",
    spade12: "spade_queen",
    spade13: "spade_king",
    spade14: "spade_1",
    spade15: "spade_2",
    club3: "club_3",
    club4: "club_4",
    club5: "club_5",
    club6: "club_6",
    club7: "club_7",
    club8: "club_8",
    club9: "club_9",
    club10: "club_10",
    club11: "club_jack",
    club12: "club_queen",
    club13: "club_king",
    club14: "club_1",
    club15: "club_2",
    diamond3: "diamond_3",
    diamond4: "diamond_4",
    diamond5: "diamond_5",
    diamond6: "diamond_6",
    diamond7: "diamond_7",
    diamond8: "diamond_8",
    diamond9: "diamond_9",
    diamond10: "diamond_10",
    diamond11: "diamond_jack",
    diamond12: "diamond_queen",
    diamond13: "diamond_king",
    diamond14: "diamond_1",
    diamond15: "diamond_2",
    heart3: "heart_3",
    heart4: "heart_4",
    heart5: "heart_5",
    heart6: "heart_6",
    heart7: "heart_7",
    heart8: "heart_8",
    heart9: "heart_9",
    heart10: "heart_10",
    heart11: "heart_jack",
    heart12: "heart_queen",
    heart13: "heart_king",
    heart14: "heart_1",
    heart15: "heart_2",
    joker199: "joker_black",
    joker299: "joker_red"
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
  function mypreload() {
    Object.keys(DISPLAY_IMAGE_ID).forEach(key => {
      //const imgUri = "https://raw.githubusercontent.com/kentei/SVG-cards/master/png/2x/" + DISPLAY_IMAGE_ID[element.type + element.number] + ".png";
      $("<img>").attr(
        "src",
        "https://raw.githubusercontent.com/kentei/SVG-cards/master/png/2x/" +
          DISPLAY_IMAGE_ID[key] +
          ".png"
      );
    });
  }
  //関数の呼び出し。
  mypreload();
  // 画像がクリックされた時の処理です。
  $("img.handCardImage").click(function() {
    if (!$(this).is(".checked")) {
      // チェックが入っていない画像をクリックした場合、チェックを入れます。
      $(this).addClass("checked");
    } else {
      // チェックが入っている画像をクリックした場合、チェックを外します。
      $(this).removeClass("checked");
    }
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
    debugLog("CreatedRoom");
    createSelectRoomRadioButton(roomList);
  });

  socket.on("showRoomList", function(roomList) {
    //サーバ接続時に部屋一覧を渡す
    debugLog("ShowRoom");
    createSelectRoomRadioButton(roomList);
  });
  
  $("#playerName").val(document.cookie.split(';')[0])

  // 部屋一覧のラジオボタン生成
  function createSelectRoomRadioButton(roomList) {
    Object.keys(roomList).forEach(function(key) {
      debugLog(roomList[key]);
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
      $("#selectRoomList").prepend(div);
    });
    $("#selectRoomList > :first > input").prop("checked", true);
  }
  $("#joinRoom").click(function() {
    let roomId = $("input[name=roomRadios]:checked").val();
    socket.emit("join", {
      roomId: $("input[name=roomRadios]:checked").val(),
      playerName: $("#playerName").val()
    });
    document.cookie = 'name="' + $("#playerName").val() + '; max-age=259200';
  });
  socket.on("joinedRoom", function(joinMembers) {
    //部屋ジョイン後
    debugLog("JoinedRoom");
    $("#roomSelectArea").hide();
    $("#gameArea").show();
    //$("#gameCommentaryArea").show();
    $("#gameController").hide();
    $("#bottomController").show();
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
    debugLog("otherMemberJoinedRoom");
    $("#gameCommentaryArea").append(
      joinMemberName + "さんが部屋に入りました<br />"
    );
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
  });
  socket.on("connectError", function(msg) {
    $("#errorModalBody").text("");
    $("#errorModalBody").text(ERROR_DIC[msg]);
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
    $("#give").prop("disabled", true);
    $("#gameFieldArea").show();

    $("#gameController").show();
    $("#giveCard").hide();
    $("#playerInfoDropdown").show();
    // $("#giveCardCommentaryArea").hide();
    $("#rank").text("");
    $("#rematch").hide();
    $("#seiseki").text("");
    //$("#field").text("なし");
    $("#field").empty();
    $("#other").text("");
    $("#elevenback").text("");
    $("#shibari").text("");
    $("#revolution").text("");
    $("#bottomController").show();
    $("#send").prop("disabled", true);
    $("#pass").prop("disabled", true);
    $("#cardList").empty();
    $("#cardList2").empty();
    $("#giveCardList").empty();
    $("#playerNameDisp").text(msg.playerName2);
    $("#playerPoint").text(msg.playerPoint);
    $("#blindCards").empty();
    msg.blindCards.forEach(ele => {
      $("#blindCards").append($('<li>' + DISPLAY_DIC[ele.type + ele.number] +'</li>'));
    });
    msg.card.forEach(element => {
      const cardType = element.number + element.type;
      const imgUri =
        "https://raw.githubusercontent.com/kentei/SVG-cards/master/png/2x/" +
        DISPLAY_IMAGE_ID[element.type + element.number] +
        ".png";
      //画像データを取得する
      let img = $('<img class="handCardImage" src="' + imgUri + '"></img>')
        .attr({
          value: element.type + "_" + element.number
        })
        .on("click", function() {
          if (!$(this).is(".checked")) {
            // チェックが入っていない画像をクリックした場合、チェックを入れます。
            $(this).addClass("checked");
          } else {
            // チェックが入っている画像をクリックした場合、チェックを外します。
            $(this).removeClass("checked");
          }
        });
      var check = $(
        '<input class="disabled_checkbox" type="checkbox" checked="" />'
      )
        .attr({
          name: "cards",
          value: element.type + "_" + element.number
        })
        .on("click", function() {
          return false;
        });
      let box = $('<div class="image_box"/>')
        .append(img)
        .append(check);
      let li = $('<li id="' + element.type + element.number + '"></li>').append(
        box
      );
      $("#cardList2").append(li);
    });
    debugLog("order accept");
    if (msg.yourTurn) {
      $("#send").prop("disabled", false);
      $("#pass").prop("disabled", false);
      $("#cardList2 img").prop("disabled", false);
      //$("#order").text("あなたの番です");
      $("#gameCommentaryArea").append("あなたのターンです。<br />");
      if (msg.skip) {
        socket.emit("pass", {
          id: $("input[name=roomRadios]:checked").val()
        });
      }
    } else {
      $("#send").prop("disabled", true);
      $("#pass").prop("disabled", true);
      $("#cardList2 img").prop("disabled", true);
      //$("#order").text(msg.playerName + "の番です");
      $("#gameCommentaryArea").append(
        msg.playerName + "さんのターンです。<br />"
      );
    }
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
  });
  socket.on("notNeedGiveCard", msg => {
    debugLog("order accept");
    if (msg.yourTurn) {
      $("#send").prop("disabled", false);
      $("#pass").prop("disabled", false);
      $("#cardList input").prop("disabled", false);
      //$("#order").text("あなたの番です");
      $("#gameCommentaryArea").append("あなたのターンです。<br />");
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
  socket.on("giveToHigherStatus2", msg => {
    $("#giveCard").show();
    msg.targetCard.forEach(element => {
      const imgUri =
        "https://raw.githubusercontent.com/kentei/SVG-cards/master/png/2x/" +
        DISPLAY_IMAGE_ID[element.type + element.number] +
        ".png";
      let li = $("<li></li>").append(
        $('<img class="giveCardViewImage" src="' + imgUri + '"></img>')
      );
      $("#giveCardList").append(li);
    });
    $("#gameCommentaryArea").append(
      "大富豪に上記の" +
        DISPLAY_DIC[msg.targetCard[0].type + msg.targetCard[0].number] +
        "と" +
        DISPLAY_DIC[msg.targetCard[1].type + msg.targetCard[1].number] +
        "を渡します。<br />"
    );
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
  });
  socket.on("giveToLowerStatus2", msg => {
    $("#giveCard").show();
    $("#gameController2").show();
    msg.targetCard.forEach(element => {
      const cardType = element.number + element.type;
      const imgUri =
        "https://raw.githubusercontent.com/kentei/SVG-cards/master/png/2x/" +
        DISPLAY_IMAGE_ID[element.type + element.number] +
        ".png";
      //画像データを取得する
      let img = $('<img class="giveCardImage" src="' + imgUri + '"></img>')
        .attr({
          value: element.type + "_" + element.number
        })
        .on("click", function() {
          if (!$(this).is(".checked")) {
            // チェックが入っていない画像をクリックした場合、チェックを入れます。
            $(this).addClass("checked");
            if ($("img.giveCardImage.checked").length == 2) {
              // ボタン有効
              $("#give").prop("disabled", false);
            }else{
              // ボタン無効
              $("#give").prop("disabled", true);
            }
          } else {
            // チェックが入っている画像をクリックした場合、チェックを外します。
            $(this).removeClass("checked");
            if ($("img.giveCardImage.checked").length == 2) {
              // ボタン有効
              $("#give").prop("disabled", false);
            }else{
              // ボタン無効
              $("#give").prop("disabled", true);
            }
          }
        });
      var check = $(
        '<input class="disabled_checkbox" type="checkbox" checked="" />'
      )
        .attr({
          name: "cards",
          value: element.type + "_" + element.number
        })
        .on("click", function() {
          return false;
        });
      let box = $('<div class="image_box"/>')
        .append(img)
        .append(check);
      let li = $('<li id="' + element.type + element.number + '"></li>').append(
        box
      );
      $("#giveCardList").append(li);
    });
    $("#gameCommentaryArea").append(
      "大貧民に渡すカードを選んでください。<br />"
    );
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
  });
  socket.on("giveToHigherStatus1", msg => {
    $("#giveCard").show();
    msg.targetCard.forEach(element => {
      const imgUri =
        "https://raw.githubusercontent.com/kentei/SVG-cards/master/png/2x/" +
        DISPLAY_IMAGE_ID[element.type + element.number] +
        ".png";
      let li = $("<li></li>").append(
        $('<img class="giveCardViewImage" src="' + imgUri + '"></img>')
      );
      $("#giveCardList").append(li);
    });
    $("#gameCommentaryArea").append(
      "富豪に上記の" +
        DISPLAY_DIC[msg.targetCard[0].type + msg.targetCard[0].number] +
        "を渡します。<br />"
    );
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
  });
  socket.on("giveToLowerStatus1", msg => {
    $("#giveCard").show();
    $("#gameController2").show();
    msg.targetCard.forEach(element => {
      const cardType = element.number + element.type;
      const imgUri =
        "https://raw.githubusercontent.com/kentei/SVG-cards/master/png/2x/" +
        DISPLAY_IMAGE_ID[element.type + element.number] +
        ".png";
      //画像データを取得する
      let img = $('<img class="giveCardImage" src="' + imgUri + '"></img>')
        .attr({
          value: element.type + "_" + element.number
        })
        .on("click", function() {
          if (!$(this).is(".checked")) {
            // チェックが入っていない画像をクリックした場合、チェックを入れます。
            $(this).addClass("checked");
            if ($("img.giveCardImage.checked").length == 1) {
              // ボタン有効
              $("#give").prop("disabled", false);
            }else{
              // ボタン無効
              $("#give").prop("disabled", true);
            }
          } else {
            // チェックが入っている画像をクリックした場合、チェックを外します。
            $(this).removeClass("checked");
            if ($("img.giveCardImage.checked").length == 1) {
              // ボタン有効
              $("#give").prop("disabled", false);
            }else{
              // ボタン無効
              $("#give").prop("disabled", true);
            }
          }
    });
      var check = $(
        '<input class="disabled_checkbox" type="checkbox" checked="" />'
      )
        .attr({
          name: "cards",
          value: element.type + "_" + element.number
        })
        .on("click", function() {
          return false;
        });
      let box = $('<div class="image_box"/>')
        .append(img)
        .append(check);
      let li = $('<li id="' + element.type + element.number + '"></li>').append(
        box
      );
      $("#giveCardList").append(li);
    });
    $("#gameCommentaryArea").append("貧民に渡すカードを選んでください。<br />");
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
  });
  $("#give").click(function() {
    let giveCards = [];
    let cardarr;
    $("img.giveCardImage.checked").each(function() {
      cardarr = $(this)
        .attr("value")
        .split("_");
      giveCards.push({ type: cardarr[0], number: Number(cardarr[1]) });
    });
    //カードの確認をしてもらう
    socket.emit("selectedGiveCard", {
      cards: giveCards,
      id: $("input[name=roomRadios]:checked").val()
    });
    $("#gameCommentaryArea").append(
      "カードの譲渡処理が終了するまでお待ちください。<br />"
    );
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
    $("#gameController2").hide();
  });

  socket.on("order", function(msg) {
    debugLog("order accept");
    if (msg.flag) {
      $("#send").prop("disabled", false);
      $("#pass").prop("disabled", false);
      $("#cardList input").prop("disabled", false);
      //$("#order").text("あなたの番です");
      $("#gameCommentaryArea").append("あなたのターンです。<br />");
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
  });

  //カードを出したとき
  $("#send").click(function() {
    let sendCards = [];
    let cardarr;
    $("img.handCardImage.checked").each(function() {
      cardarr = $(this)
        .attr("value")
        .split("_");
      sendCards.push({ type: cardarr[0], number: Number(cardarr[1]) });
    });
    if (sendCards.length === 0) {
      //選択していない場合
      $("#errorMsg").show();
      $("#errorMsg").text("カードを選択してください。");
      return;
    }
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
    $("#field").empty();
    for (let i = 0; i < msg.card.length; i++) {
      message =
        message + "　" + DISPLAY_DIC[msg.result[i].type + msg.result[i].number];
      //手札削除
      $("#" + msg.card[i].type + msg.card[i].number).remove();
      //場にカードを置く
      const imgUri =
        "https://raw.githubusercontent.com/kentei/SVG-cards/master/png/2x/" +
        DISPLAY_IMAGE_ID[msg.result[i].type + msg.result[i].number] +
        ".png";
      let li = $("<li></li>").append(
        $('<img class="fieldCardImage" src="' + imgUri + '"></img>')
      );
      $("#field").append(li);
    }
    //$("#field").text(message);
    $("#gameCommentaryArea").append(
      msg.playerName + "さんが" + message + "を出しました。<br />"
    );
    $("#other").text("");
    $("#errorMsg").hide();
    $("#errorMsg").text("");
  });
  socket.on("changeStatus", function(msg) {
    switch (msg.type) {
      case "elevenback":
        if (msg.value) {
          $("#gameCommentaryArea").append(
            msg.playerName + "さんが11バックを発動しました。<br />"
          );
        }
        $("#elevenback").text(msg.value ? "　11Back　" : "");
        break;
      case "revolution":
        if (msg.value) {
          $("#gameCommentaryArea").append(
            msg.playerName + "さんが革命を発動しました。<br />"
          );
        }
        $("#revolution").text(msg.value ? "　革命中　" : "");
        break;
      case "shibari":
        if (msg.value) {
          $("#gameCommentaryArea").append(
            msg.playerName + "さんがスートしばりを発動しました。<br />"
          );
        }
        let suites = "";
        msg.suites.forEach(ele => (suites = suites + SUITES_DIC[ele]));
        $("#shibari").text(msg.value ? "　縛り　" + suites : "");
        break;
      case "winjoker":
        $("#gameCommentaryArea").append(
          msg.playerName + "さんがスペ3返しを発動しました。場を流します。<br />"
        );
        //$("#other").text("JOKER討伐したので流しました。");
        $("#field").empty();
        for (let i = 0; i < msg.value.cards.length; i++) {
          $("#" + msg.value.cards[i].type + msg.value.cards[i].number).remove();
        }
        $("#elevenback").text("");
        $("#shibari").text("");
        break;
      case "doblejoker":
        $("#gameCommentaryArea").append(
          msg.playerName +
            "さんがダブルJOKERを発動しました。場を流します。<br />"
        );
        $("#field").empty();
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
        $("#field").empty();
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
        $("#field").empty();
        $("#elevenback").text("");
        $("#shibari").text("");
        break;
    }
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
  });
  socket.on("finish", function(msg) {
    debugLog("finish accept");
    $("#cardList2").empty();
    $("#gameController").hide();
    if (msg.rankReason !== "") {
      //何か問題があったと判断
      $("#gameCommentaryArea").append(
        LOSE_REASON_DIC[msg.rankReason] + "<br/>"
      );
    }
    $("#gameCommentaryArea").append(
      "ゲームが終了したため、観戦モードに移行します。<br />"
    );
  });
  socket.on("finishNotification", function(msg) {
    debugLog("finish accept notification");
    if (msg.rankReason !== "") {
      //何か問題があったと判断
      $("#gameCommentaryArea").append(
        msg.playerName + "さんが、" + LOSE_REASON_DIC[msg.rankReason] + "<br />"
      );
    } else {
      $("#gameCommentaryArea").append(
        msg.playerName + "さんがあがりました。<br />"
      );
    }
  });
  socket.on("gameFinish", function(msg) {
    debugLog("game finish");
    $("#field").empty();
    $("#gameCommentaryArea").append(
      "第" + msg.gameNum + "回のゲーム結果は以下の通りです。<br />"
    );
    let mes = "";
    msg.ranking.forEach(function(ele) {
      $("#gameCommentaryArea").append(
        ele.dispName + "さん : " + RANKING_DIC[ele.rank] + "<br />"
      );
      mes = mes + RANKING_DIC[ele.rank] + " : " + ele.dispName + "さん<br />";
    });
    $("#playerPoint").text(msg.point);
    $("#battleResult" + msg.gameNum).append(mes);
    $("#battle" + msg.gameNum).show();
    $("#battle" + msg.gameNum + "Content").collapse('show');
    //$("#gameCommentaryArea").append("10秒後に次のゲームを始めます。<br />");

    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
  });
  socket.on("nextGameStart", function(msg) {
    debugLog("next game start");
    //$("#rematch").show();
    msg.ranking.forEach(function(key) {});
    //$("#gameCommentaryArea").append("10秒後に次のゲームを始めます。<br />");
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
    socket.emit("rematch", {
      id: $("input[name=roomRadios]:checked").val(),
      roomid: $("input[name=roomRadios]:checked").val()
    });
    // sleep(10, function () {
    //   socket.emit("rematch", {
    //     id: $("input[name=roomRadios]:checked").val(),
    //     roomid: $("input[name=roomRadios]:checked").val()
    //   });
    // });
  });
  socket.on("gameSet", function(msg) {
    debugLog("game set");
    //TODO 渡し方次第な気がする。
    //$("#gameCommentaryArea").append("あなたは、" + RANKING_DIC[msg.rank] + "です。<br />");
    $("#gameCommentaryArea").append(
      "第" + msg.gameNum + "回の結果は以下の通りです。<br />"
    );
    let mes = "";
    msg.ranking.forEach(function(ele) {
      $("#gameCommentaryArea").append(
        ele.dispName + "さん : " + RANKING_DIC[ele.rank] + "<br />"
      );
      mes = mes + RANKING_DIC[ele.rank] + " : " + ele.dispName + "さん<br />";
    });
    $("#battleResult" + msg.gameNum).append(mes);
    $("#battle" + msg.gameNum).show();

    //$("#gameCommentaryArea").append("10秒後に次のゲームを始めます。<br />");
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );

    $("#gameCommentaryArea").append("総合成績は以下の通りです。<br />");
    $("#playerPoint").text(msg.finalPoint);
    let rank = 1;
    msg.overall.forEach(function(ele) {
      $("#gameCommentaryArea").append(
        rank + "位:" + ele.dispName + "さん<br />"
      );
      rank++;
    });
  });
  socket.on("releaseRoom", info => {
    debugLog("部屋がリリースされました");
    $("#releaseRoomModalBody").text("");
    $("#releaseRoomModalBody").text(ERROR_DIC[info.reason]);
    $("#releaseRoomModal").modal({ backdrop: "static", keyboard: false });
  });
  $("#releaseRoomModalButton").click(() => {
    location.reload();
  });

  $("#rematch").click(function() {
    $("#rank").text("");
    $("#rematch").hide();
    $("#seiseki").text("");
    $("#field").empty();
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
