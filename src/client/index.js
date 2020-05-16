$(function() {
  const voiceData = require("./voiceData.js");
  const constant = require("./constant.js");
  require("./index.scss");
  require("bootstrap.native/dist/bootstrap-native-v4");
  
  var socket = io();
  let audio = new Audio(voiceData.haihai);
  const debugMode =
    location.search.substring(1) === "debug=true" ? true : false;
  const debugLog = debugMode ? console.log.bind(console) : () => {};
  
  /**
   * 画像のプリロード
   */
  function mypreload() {
    Object.keys(constant.DISPLAY_IMAGE_ID).forEach(key => {
      $("<img>").attr(
        "src",
        "https://raw.githubusercontent.com/kentei/SVG-cards/master/png/2x/" +
          constant.DISPLAY_IMAGE_ID[key] +
          ".png"
      );
    });
  }
  mypreload();
  
  /**
   * ルーム作成ボタンクリック時の動作
   */
  $("#requestRoomCreate").on("click", ()=> {
    //部屋作成時
    socket.emit("requestRoomCreate", {
      dispName: $("#roomDispName").val(),
      capacity: $("#roomcapacity").val(),
      setNum: $("#setNum").val(),
      ruleSet: genRuleSetData()
    });
  });
  
  /**
   * リクエスト用のルールセットデータを作成する
   */
  const genRuleSetData = () => {
    let ruleSet = [];
    const ele = document.getElementsByName("ruleSets");
    for (let i = 0; i < ele.length; i++) {
      if (ele[i].checked) {
        ruleSet.push(ele[i].value);
      }
    }
    return ruleSet;
  }
  
  /**
   * ルールプリセットの選択を変更した際の動作
   */
  $("#rulePresetSelectbox").on("change", event => {
    console.log($(event.currentTarget).val());
    switch ($(event.currentTarget).val()) {
      case "default":
        $("#setNum").val("");
        $("#elevenBackSetting").prop("checked", true);
        $("#stairSetting").prop("checked", true);
        $("#shibariSetting").prop("checked", true);
        break;
      case "official":
        $("#setNum").val(3);
        $("#elevenBackSetting").prop("checked", false);
        $("#stairSetting").prop("checked", true);
        $("#shibariSetting").prop("checked", true);
        break;
    }
  });
  /**
   * 部屋作成完了後の動作
   */
  socket.on("createdRoom", createdRoomInfo => {
    //部屋作成完了後
    debugLog("CreatedRoom");
    createRoomCardList(createdRoomInfo);
    $('#nav-tab a[href="#nav-joinroom"]')[0].Tab.show();
  });
  /**
   * 部屋一覧の更新要求を受けた時の動作
   */
  socket.on("updateRoomList", createdRoomInfo => {
    debugLog("updateRoomList");
    createRoomCardList(createdRoomInfo);
  });
  /**
   * 部屋一覧を表示する(初回接続時)
   */
  socket.on("showRoomList", roomInfoList => {
    //サーバ接続時に部屋一覧を渡す
    debugLog("ShowRoom");
    createRoomCardList(roomInfoList);
  });

  //cookie
  $("#playerName").val(document.cookie.split(";")[0].split("=")[1]);

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
              socket.emit("join", {
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
            .on("click", () => {
              socket.emit("join", {
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

  socket.on("connectRetry", function(leaveMemberInfo) {
    debugLog("Retryモード");
    //選択画面を開く。
    createSelectConnectMemberButton(leaveMemberInfo.leaveUserInfo);
    var myModalInstance = new Modal(myModal,
    { // options object
        content: '<div class="modal-body">Some content to be set on init</div>', // sets modal content
        backdrop: 'static', // we don't want to dismiss Modal when Modal or backdrop is the click event target
        keyboard: false // we don't want to dismiss Modal on pressing Esc key
    });
    $("#retryConnectModal").modal({ backdrop: "static", keyboard: false, roomId: "test" });
  });
  function createSelectConnectMemberButton(leaveMemberInfo) {
    $("#selectMemberList").empty();
    leaveMemberInfo.forEach(function(ele) {
      debugLog(ele.dispName);
      const div = $('<div class="form-check"></div>');
      div.append(
        $('<input type="radio" />').attr({
          class: "form-check-input",
          name: "memberRadios",
          value: ele.id,
          id: "member_" + ele.id
        })
      );
      div.append(
        $(
          '<label class="form-check-label" for="' +
            "member_" +
            ele.id +
            '">' +
            ele.dispName +
            "</label>"
        )
      );
      $("#selectMemberList").prepend(div);
    });
    $("#selectMemberList > :first > input").prop("checked", true);
  }

  $("#retryConnectRoomButton").click(function() {
    //let reconnectUserId = $("input[name=memberRadios]:checked").val();
    socket.emit("reJoin", {
      //roomId: $("input[name=roomRadios]:checked").val(),
      roomId: $("#roomId").text(),
      reconnectUserId: $("input[name=memberRadios]:checked").val(),
      playerName: $("#playerName").val()
    });
    $("#retryConnectModal").modal("hide");
    document.cookie = "name=" + $("#playerName").val() + "; max-age=259200";
  });

  socket.on("reJoinOK", function(msg) {
    if (msg.roomInfo.giveCardPhase) {
      switch (msg.giveInfo.type) {
        case "lower1":
          giveToHigherStatus1(msg.giveInfo);
          break;
        case "lower2":
          giveToHigherStatus2(msg.giveInfo);
          break;
        case "higher1":
          giveToLowerStatus1(msg.giveInfo, msg.giveInfo.alreadyGive);
          break;
        case "higher2":
          giveToLowerStatus2(msg.giveInfo, msg.giveInfo.alreadyGive);
          break;
      }
      $("#roomSelectArea").hide();
      $("#gameArea").show();
      $("#bottomController").show();
      $("#playerInfoDropdown").show();
      $("#gameController").hide();
      msg.roomInfo.rankingHistory.forEach(ele => {
        let mes = "";
        ele.ranking.forEach(function(ele2) {
          mes =
            mes +
            constant.RANKING_DIC[ele2.rank] +
            " : " +
            ele2.dispName +
            "さん<br />";
        });
        $("#battleResult" + ele.gameNum).append(mes);
        $("#battle" + ele.gameNum).show();
        $("#battle" + ele.gameNum + "Content").collapse("show");
      });
      return;
    }
    $("#gameCommentaryArea").append(
      "第" + msg.gameNum + "回ゲームを再開します" + "<br />"
    );
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
    $("#roomSelectArea").hide();
    $("#gameArea").show();
    $("#give").prop("disabled", true);
    $("#gameFieldArea").show();

    $("#gameController").show();
    $("#giveCard").hide();
    $("#playerInfoDropdown").show();
    //$("#rank").text("");
    //$("#rematch").hide();
    //$("#seiseki").text("");
    //$("#field").text("なし");
    $("#field").empty();
    //$("#other").text("");
    $("#elevenback").text(msg.roomInfo.elevenback ? "　11Back　" : "");
    let suites = "";
    msg.roomInfo.shibariSuites.forEach(
      ele => (suites = suites + constant.SUITES_DIC[ele])
    );
    $("#shibari").text(msg.roomInfo.shibari ? "　縛り　" + suites : "");
    $("#revolution").text(msg.roomInfo.revolution ? "　革命中　" : "");
    $("#bottomController").show();
    $("#send").prop("disabled", true);
    $("#pass").prop("disabled", true);
    //$("#cardList").empty();
    $("#handCards").empty();
    $("#giveCardList").empty();
    $("#playerNameDisp").text(msg.playerName2);
    $("#playerPoint").text(msg.playerPoint);
    $("#blindCards").empty();
    $("#orderList").empty();
    let pos = 0;
    msg.roomInfo.orders.forEach(ele => {
      let li = $("<li>").text(ele.playerName + "(" + ele.cardNum + "枚)");
      if (pos === msg.orderNum) {
        li.attr({ style: "color: red" });
      }
      $("#orderList").append(li);
      if (pos !== msg.roomInfo.orders.length - 1) {
        $("#orderList").append("→");
      }
      pos++;
    });
    msg.blindCards.forEach(ele => {
      $("#blindCards").append(
        $("<li>" + constant.DISPLAY_DIC[ele.type + ele.number] + "</li>")
      );
    });
    msg.roomInfo.rankingHistory.forEach(ele => {
      let mes = "";
      ele.ranking.forEach(function(ele2) {
        mes =
          mes +
          constant.RANKING_DIC[ele2.rank] +
          " : " +
          ele2.dispName +
          "さん<br />";
      });
      $("#battleResult" + ele.gameNum).append(mes);
      $("#battle" + ele.gameNum).show();
      $("#battle" + ele.gameNum + "Content").collapse("show");
    });
    for (let i = 0; i < msg.roomInfo.fieldCards.length; i++) {
      //場にカードを置く
      const imgUri =
        "https://raw.githubusercontent.com/kentei/SVG-cards/master/png/2x/" +
        constant.DISPLAY_IMAGE_ID[
          msg.roomInfo.fieldCards[i].type + msg.roomInfo.fieldCards[i].number
        ] +
        ".png";
      let li = $("<li></li>").append(
        $('<img class="fieldCardImage" src="' + imgUri + '"></img>')
      );
      $("#field").append(li);
    }
    msg.card.forEach(element => {
      const cardType = element.number + element.type;
      const imgUri =
        "https://raw.githubusercontent.com/kentei/SVG-cards/master/png/2x/" +
        constant.DISPLAY_IMAGE_ID[element.type + element.number] +
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
      $("#handCards").append(li);
    });
    debugLog("order accept");
    if (msg.yourTurn) {
      audio.play();
      $("#send").prop("disabled", false);
      $("#pass").prop("disabled", false);
      $("#handCards img").prop("disabled", false);
      //$("#order").text("あなたの番です");
      $("#gameCommentaryArea").append("あなたのターンです。<br />");
      if (msg.skip) {
        socket.emit("pass", {
          id: msg.roomInfo.roomId
        });
      }
    } else {
      $("#send").prop("disabled", true);
      $("#pass").prop("disabled", true);
      $("#handCards img").prop("disabled", true);
      //$("#order").text(msg.playerName + "の番です");
      $("#gameCommentaryArea").append(
        msg.playerName + "さんのターンです。<br />"
      );
    }
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
  });

  /**
   * 部屋入ったとき
   */
  socket.on("joinedRoom", joinMembers => {
    //部屋ジョイン後
    debugLog("JoinedRoom");
    $("#roomSelectArea").hide();
    $("#gameArea").show();
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
  /**
   * ほかのメンバーがルームに入った際の更新要求
   */
  socket.on("updateRoomMember", joinMemberName => {
    //他のメンバーが部屋に入ったとき
    debugLog("updateRoomMember");
    $("#gameCommentaryArea").append(
      joinMemberName + "さんが部屋に入りました<br />"
    );
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
  });
  socket.on("otherMemberReJoinedOK", function(msg) {
    //他のメンバーが再接続したとき
    debugLog("otherMemberReJoinedOK");
    $("#gameCommentaryArea").append(
      msg.playerName + "さんが部屋に入りました<br />"
    );
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
    if (msg.memberOK) {
      $("#releaseRoomModal").modal("hide");
    }
  });
  /**
   * ルームのジョインに失敗した場合などサーバとの接続に失敗した場合
   */
  socket.on("connectError", errorType => {
    $("#errorModalBody").text("");
    $("#errorModalBody").text(constant.ERROR_DIC[errorType]);
    $("#errorModal").modal();
  });
  
  const switchDispGameScreen = (info) => {
    //表示関連
    document.getElementById("gameFieldArea").style.display = "block"; //ゲームの場とか手札とか
    document.getElementById("bottomController").style.display = "block"; //ゲームコントローラーの親
    document.getElementById("gameController").style.display = "block"; //playボタン、passボタン
    document.getElementById("playerInfoDropdown").style.display = "block";//右上のプレイヤードロップダウン
    document.getElementById("giveCard").style.display = "none";//譲渡用のエリアを隠す
  }
  
  const initGameScreen = (info) => {
    document.getElementById('orderList').innerHTML = ''; //順番一覧の初期化
    document.getElementById('field').innerHTML = ''; //場のカード初期化
    document.getElementById('elevenback').textContent  = '';//11back表示のバッチ
    document.getElementById('shibari').textContent  = '';//縛りのバッチ
    document.getElementById('revolution').textContent  = '';//革命のバッチ
    // $("#orderList").empty(); //順番一覧の初期化
    // $("#field").empty(); //場のカード初期化
    // $("#elevenback").text(""); //11back表示のバッチ
    // $("#shibari").text(""); //縛りのバッチ
    // $("#revolution").text(""); //革命のバッチtextContent 
    // $("#handCards").empty(); 
    // $("#giveCardList").empty(); 
    document.getElementById('handCards').innerHTML = '';//手札の初期化
    document.getElementById('giveCardList').innerHTML = '';//譲渡カード初期化
    //アクションボタンの設定および非活性化
    document.getElementById('send').dataset.roomId = info.roomId;
    document.getElementById('send').setAttribute("disabled", true);
    document.getElementById('pass').dataset.roomId = info.roomId;
    document.getElementById('pass').setAttribute("disabled", true);
    //TODO これ以降は修正する可能性あり。ただ今はとりあえず設定しておく
    document.getElementById('blindCards').innerHTML = ''; //ブラインドカードの初期化
    document.getElementById('playerNameDisp').textContent  = info.playerName2;//ユーザー名
    document.getElementById('playerPoint').textContent  = info.playerPoint;//ユーザー点数
    
  }
  //ゲームの準備ができたことを受け取る
  socket.on("gameReady", function(msg) {
    $("#gameCommentaryArea").append(
      "第" + msg.gameNum + "回ゲームを開始します" + "<br />"
    );
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
    initGameScreen(msg);
    switchDispGameScreen(msg);
    
//     $("#send").data("roomId", msg.roomId).prop("disabled", true);
//     $("#pass").data("roomId", msg.roomId).prop("disabled", true);

    // $("#playerNameDisp").text(msg.playerName2);
    // $("#playerPoint").text(msg.playerPoint);
    // $("#blindCards").empty();
    //$("#orderList").empty();
    for (let i = 0; i < msg.userList.length; i++) {
      let ele =
        i === 0
          ? $("<li>")
              .text(msg.userList[i] + "(" + msg.card.length + "枚)")
              .attr({ style: "color: red" })
          : $("<li>").text(msg.userList[i] + "(" + msg.card.length + "枚)");
      $("#orderList").append(ele);
      if (i !== msg.userList.length - 1) {
        $("#orderList").append("→");
      }
    }
    msg.blindCards.forEach(ele => {
      $("#blindCards").append(
        $("<li>" + constant.DISPLAY_DIC[ele.type + ele.number] + "</li>")
      );
    });
    msg.card.forEach(element => {
      const cardType = element.number + element.type;
      const imgUri =
        "https://raw.githubusercontent.com/kentei/SVG-cards/master/png/2x/" +
        constant.DISPLAY_IMAGE_ID[element.type + element.number] +
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
      $("#handCards").append(li);
    });
    debugLog("order accept");
    if (msg.yourTurn) {
      audio.play();
      $("#send").prop("disabled", false);
      $("#pass").prop("disabled", false);
      $("#handCards img").prop("disabled", false);
      //$("#order").text("あなたの番です");
      $("#gameCommentaryArea").append("あなたのターンです。<br />");
      if (msg.skip) {
        socket.emit("pass", {
          id: msg.roomId
        });
      }
    } else {
      $("#send").prop("disabled", true);
      $("#pass").prop("disabled", true);
      $("#handCards img").prop("disabled", true);
      //$("#order").text(msg.playerName + "の番です");
      $("#gameCommentaryArea").append(
        msg.playerName + "さんのターンです。<br />"
      );
    }
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
  });
  
  function giveToHigherStatus2(msg) {
    $("#giveCard").show();
    msg.targetCard.forEach(element => {
      const imgUri =
        "https://raw.githubusercontent.com/kentei/SVG-cards/master/png/2x/" +
        constant.DISPLAY_IMAGE_ID[element.type + element.number] +
        ".png";
      let li = $("<li></li>").append(
        $('<img class="giveCardViewImage" src="' + imgUri + '"></img>')
      );
      $("#giveCardList").append(li);
    });
    $("#gameCommentaryArea").append(
      "大富豪に上記の" +
        constant.DISPLAY_DIC[
          msg.targetCard[0].type + msg.targetCard[0].number
        ] +
        "と" +
        constant.DISPLAY_DIC[
          msg.targetCard[1].type + msg.targetCard[1].number
        ] +
        "を渡します。<br />"
    );
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
  }
  socket.on("giveToHigherStatus2", msg => {
    giveToHigherStatus2(msg);
  });
  function giveToLowerStatus2(msg, alreadyFlag) {
    $("#giveCard").show();
    $("#gameController2").show();
    document.getElementById('give').dataset.roomId = msg.roomId;
    msg.targetCard.forEach(element => {
      const cardType = element.number + element.type;
      const imgUri =
        "https://raw.githubusercontent.com/kentei/SVG-cards/master/png/2x/" +
        constant.DISPLAY_IMAGE_ID[element.type + element.number] +
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
            } else {
              // ボタン無効
              $("#give").prop("disabled", true);
            }
          } else {
            // チェックが入っている画像をクリックした場合、チェックを外します。
            $(this).removeClass("checked");
            if ($("img.giveCardImage.checked").length == 2) {
              // ボタン有効
              $("#give").prop("disabled", false);
            } else {
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
    if (alreadyFlag) {
      $("#gameCommentaryArea").append(
        "カードの譲渡処理が終了するまでお待ちください。<br />"
      );
      $("#gameController2").hide();
    } else {
      $("#gameCommentaryArea").append(
        "大貧民に渡すカードを選んでください。<br />"
      );
    }

    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
  }
  socket.on("giveToLowerStatus2", msg => {
    giveToLowerStatus2(msg, false);
  });
  function giveToHigherStatus1(msg) {
    $("#giveCard").show();
    msg.targetCard.forEach(element => {
      const imgUri =
        "https://raw.githubusercontent.com/kentei/SVG-cards/master/png/2x/" +
        constant.DISPLAY_IMAGE_ID[element.type + element.number] +
        ".png";
      let li = $("<li></li>").append(
        $('<img class="giveCardViewImage" src="' + imgUri + '"></img>')
      );
      $("#giveCardList").append(li);
    });
    $("#gameCommentaryArea").append(
      "富豪に上記の" +
        constant.DISPLAY_DIC[
          msg.targetCard[0].type + msg.targetCard[0].number
        ] +
        "を渡します。<br />"
    );
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
  }
  socket.on("giveToHigherStatus1", msg => {
    giveToHigherStatus1(msg);
  });
  function giveToLowerStatus1(msg, alreadyFlag) {
    $("#giveCard").show();
    $("#gameController2").show();
    document.getElementById('give').dataset.roomId = msg.roomId;
    msg.targetCard.forEach(element => {
      const cardType = element.number + element.type;
      const imgUri =
        "https://raw.githubusercontent.com/kentei/SVG-cards/master/png/2x/" +
        constant.DISPLAY_IMAGE_ID[element.type + element.number] +
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
            } else {
              // ボタン無効
              $("#give").prop("disabled", true);
            }
          } else {
            // チェックが入っている画像をクリックした場合、チェックを外します。
            $(this).removeClass("checked");
            if ($("img.giveCardImage.checked").length == 1) {
              // ボタン有効
              $("#give").prop("disabled", false);
            } else {
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
    if (alreadyFlag) {
      $("#gameCommentaryArea").append(
        "カードの譲渡処理が終了するまでお待ちください。<br />"
      );
      $("#gameController2").hide();
    } else {
      $("#gameCommentaryArea").append(
        "貧民に渡すカードを選んでください。<br />"
      );
    }

    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
  }
  socket.on("giveToLowerStatus1", msg => {
    giveToLowerStatus1(msg, false);
  });
  $("#give").click(e => {
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
      // id: $("input[name=roomRadios]:checked").val()
      id: e.currentTarget.dataset.roomId
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
    //最初に
    debugLog("order accept");
    //順番が回ったときはエラーを消そう
    $("#errorMsg").hide();
    if (msg.flag) {
      audio.play();
      $("#send").prop("disabled", false);
      $("#pass").prop("disabled", false);
      //$("#cardList input").prop("disabled", false);
      //$("#order").text("あなたの番です");
      $("#gameCommentaryArea").append("あなたのターンです。<br />");
      if (msg.skip) {
        socket.emit("pass", {
          //id: $("input[name=roomRadios]:checked").val()
          id: msg.roomId
        });
      }
    } else {
      $("#send").prop("disabled", true);
      $("#pass").prop("disabled", true);
      //$("#cardList input").prop("disabled", true);
      $("#gameCommentaryArea").append(
        msg.playerName + "さんのターンです。<br />"
      );
    }

    $("#orderList").empty();
    let pos = 0;
    msg.orders.forEach(ele => {
      let li = $("<li>").text(ele.playerName + "(" + ele.cardNum + "枚)");
      if (pos === msg.orderNum) {
        li.attr({ style: "color: red" });
      }
      $("#orderList").append(li);
      if (pos !== msg.orders.length - 1) {
        $("#orderList").append("→");
      }
      pos++;
    });
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
  });

  //カードを出したとき
  $("#send").on("click", (e) => {
    $("#send").prop("disabled", true);
    $("#pass").prop("disabled", true);
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
      $("#send").prop("disabled", false);
      $("#pass").prop("disabled", false);
      return;
    }
    //カードの確認をしてもらう
    socket.emit("validate", {
      cards: sendCards,
      //id: $("input[name=roomRadios]:checked").val()
      id: e.currentTarget.dataset.roomId
    });
  });
  $("#pass").click(function(e) {
    $("#send").prop("disabled", true);
    $("#pass").prop("disabled", true);
    socket.emit("pass", {
      //id: $("input[name=roomRadios]:checked").val()
      id: e.currentTarget.dataset.roomId
    });
  });
  socket.on("validateError", function(msg) {
    $("#send").prop("disabled", false);
    $("#pass").prop("disabled", false);
    $("#errorMsg").show();
    $("#errorMsg").text(constant.ERROR_DIC[msg.reason]);
  });
  socket.on("result", function(msg) {
    let message = "";
    $("#field").empty();
    for (let i = 0; i < msg.card.length; i++) {
      message =
        message +
        "　" +
        constant.DISPLAY_DIC[msg.result[i].type + msg.result[i].number];
      //手札削除
      $("#" + msg.card[i].type + msg.card[i].number).remove();
      //場にカードを置く
      const imgUri =
        "https://raw.githubusercontent.com/kentei/SVG-cards/master/png/2x/" +
        constant.DISPLAY_IMAGE_ID[msg.result[i].type + msg.result[i].number] +
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
    //$("#other").text("");
    $("#errorMsg").hide();
    $("#errorMsg").text("");
  });
  socket.on("againTurn", function(msg) {
    //ふたたび自分のターンのためsendとpassを復活させる
    $("#send").prop("disabled", false);
    $("#pass").prop("disabled", false);
    $("#orderList").empty();
    let pos = 0;
    msg.orders.forEach(ele => {
      let li = $("<li>").text(ele.playerName + "(" + ele.cardNum + "枚)");
      if (pos === msg.orderNum) {
        li.attr({ style: "color: red" });
      }
      $("#orderList").append(li);
      if (pos !== msg.orders.length - 1) {
        $("#orderList").append("→");
      }
      pos++;
    });
    $("#gameCommentaryArea").append("あなたのターンです。<br />");
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
  });

  socket.on("againTurnForOtherMember", function(msg) {
    //ふたたび誰かさんのターン
    $("#orderList").empty();
    let pos = 0;
    msg.orders.forEach(ele => {
      let li = $("<li>").text(ele.playerName + "(" + ele.cardNum + "枚)");
      if (pos === msg.orderNum) {
        li.attr({ style: "color: red" });
      }
      $("#orderList").append(li);
      if (pos !== msg.orders.length - 1) {
        $("#orderList").append("→");
      }
      pos++;
    });
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
        msg.suites.forEach(ele => (suites = suites + constant.SUITES_DIC[ele]));
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
        //また自分のターン
        // $("#send").prop("disabled", false);
        // $("#pass").prop("disabled", false);
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
        //また自分のターン
        // $("#send").prop("disabled", false);
        // $("#pass").prop("disabled", false);
        break;
      case "cutPass":
        $("#gameCommentaryArea").append(
          "パスが一周したので場を流します。<br />"
        );
        $("#field").empty();
        $("#elevenback").text("");
        $("#shibari").text("");
        //また自分のターン(これは特殊？)
        // $("#send").prop("disabled", false);
        // $("#pass").prop("disabled", false);
        break;
    }
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
  });
  socket.on("finish", function(msg) {
    debugLog("finish accept");
    $("#handCards").empty();
    $("#gameController").hide();
    if (msg.rankReason !== "") {
      //何か問題があったと判断
      $("#gameCommentaryArea").append(
        constant.LOSE_REASON_DIC[msg.rankReason] + "<br/>"
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
        msg.playerName +
          "さんが、" +
          constant.LOSE_REASON_DIC[msg.rankReason] +
          "<br />"
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
    $("#orderList").empty();
    $("#gameCommentaryArea").append(
      "第" + msg.gameNum + "回のゲーム結果は以下の通りです。<br />"
    );
    let mes = "";
    msg.ranking.forEach(function(ele) {
      $("#gameCommentaryArea").append(
        ele.dispName + "さん : " + constant.RANKING_DIC[ele.rank] + "<br />"
      );
      mes =
        mes +
        constant.RANKING_DIC[ele.rank] +
        " : " +
        ele.dispName +
        "さん<br />";
    });
    
    mes += "ブラインドカード" + msg.blindCards;
    $("#playerPoint").text(msg.point);
    $("#battleResult" + msg.gameNum).append(mes);
    $("#battle" + msg.gameNum).show();
    $("#battle" + msg.gameNum + "Content").collapse("show");
    //$("#gameCommentaryArea").append("10秒後に次のゲームを始めます。<br />");

    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
  });
  socket.on("nextGameStart", function(msg) {
    debugLog("next game start");
    msg.ranking.forEach(function(key) {});
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
    socket.emit("rematch", {
      //id: msg.roomId,
      roomId: msg.roomId
    });
  });
  socket.on("gameSet", function(msg) {
    debugLog("game set");
    $("#gameCommentaryArea").append(
      "第" + msg.gameNum + "回の結果は以下の通りです。<br />"
    );
    let mes = "";
    msg.ranking.forEach(function(ele) {
      $("#gameCommentaryArea").append(
        ele.dispName + "さん : " + constant.RANKING_DIC[ele.rank] + "<br />"
      );
      mes =
        mes +
        constant.RANKING_DIC[ele.rank] +
        " : " +
        ele.dispName +
        "さん<br />";
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
    $("#releaseRoomModalBody").text(constant.ERROR_DIC[info.reason]);
    $("#releaseRoomModal").modal({ backdrop: "static", keyboard: false });
  });
  $("#releaseRoomModalButton").click(() => {
    location.reload();
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
