import socket from "./common/socketIO";
$(function() {
  const voiceData = require("./voiceData.js");
  const constant = require("./constant.js");
  require("./index.scss");
  const bsnV4 = require("bootstrap.native/dist/bootstrap-native-v4");
  require("./room/roomCreateManager.js");
  require("./room/roomShowManager.js");

  //var socket = io();

  let audio = new Audio(voiceData.haihai);
  const debugMode =
    location.search.substring(1) === "debug=true" ? true : false;
  const debugLog = debugMode ? console.log.bind(console) : () => {};

  /**
   * 画像のプリロード
   */
  const mypreload = () => {
    Object.keys(constant.DISPLAY_IMAGE_ID).forEach(key => {
      const img = new Image();
      img.src =
        "https://raw.githubusercontent.com/kentei/SVG-cards/master/png/2x/" +
        constant.DISPLAY_IMAGE_ID[key] +
        ".png";
    });
  };
  mypreload();

  const testTable = (initData, playerNum) => {
    // 表の作成開始
    // var data = [["大富豪", "-", "-"],
    //         ["富豪", "-", "-"],
    //         ["貧民", "-", "-"],
    //         ["大貧民", "-", "-"]];
    var rows=[];
    var table = document.createElement("table");

    // 表に2次元配列の要素を格納
    for(let rowNum = 0; rowNum < playerNum; rowNum++){
        rows.push(table.insertRow(-1));  // 行の追加
        for(let j = 0; j < initData[0].length; j++){
            const cell=rows[rowNum].insertCell(-1);
            cell.appendChild(document.createTextNode(initData[rowNum][j]));
            // 背景色の設定
            if(rowNum==0){
                cell.style.backgroundColor = "#bbb"; // ヘッダ行
            }else{
                cell.style.backgroundColor = "#ddd"; // ヘッダ行以外
            }
        }
    }
    // 指定したdiv要素に表を加える
    document.getElementById("testTable").appendChild(table);
    //document.getElementById("tbo").innerHTML = "";
//     let table = document.getElementById("thisRankTable");
//     let newRow = table.insertRow(-1);

//     let newCell = newRow.insertCell();
//     let newText = document.createTextNode("大富豪");
//     newCell.appendChild(newText);

//     newCell = newRow.insertCell();
//     newText = document.createTextNode("賢帝");
//     newCell.appendChild(newText);
    
//     newCell = newRow.insertCell();
//     newText = document.createTextNode("都落ち");
//     newCell.appendChild(newText);
  };
  var data = [["ランク", "名前", "特殊敗因"],
    ["大富豪", "-", "-"],
            ["富豪", "-", "-"],
            ["貧民", "-", "-"],
            ["大貧民", "-", "-"]];
  testTable(data, 4);

  //cookie
  $("#playerName").val(document.cookie.split(";")[0].split("=")[1]);

  socket.on("connectRetry", function(leaveMemberInfo) {
    debugLog("Retryモード");
    //選択画面を開く。
    createSelectConnectMemberButton(leaveMemberInfo.leaveUserInfo);
    const myModalInstance = new bsnV4.Modal(
      document.getElementById("retryConnectModal"),
      {
        // options object
        backdrop: "static", // we don't want to dismiss Modal when Modal or backdrop is the click event target
        keyboard: false // we don't want to dismiss Modal on pressing Esc key
      }
    );
    myModalInstance.show();
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

  $("#retryConnectRoomButton").on("click", e => {
    socket.emit("reJoin", {
      roomId: e.currentTarget.dataset.roomId,
      reconnectUserId: $("input[name=memberRadios]:checked").val(),
      playerName: $("#playerName").val()
    });
    const myModalInstance = new bsnV4.Modal(
      document.getElementById("retryConnectModal"),
      {
        // options object
        backdrop: "static",
        keyboard: false
      }
    );
    myModalInstance.hide();
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
    $("#field").empty();
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
      dispHandCard(element);
      // const cardType = element.number + element.type;
      // const imgUri =
      //   "https://raw.githubusercontent.com/kentei/SVG-cards/master/png/2x/" +
      //   constant.DISPLAY_IMAGE_ID[element.type + element.number] +
      //   ".png";
      // //画像データを取得する
      // let img = $('<img class="handCardImage" src="' + imgUri + '"></img>')
      //   .attr({
      //     value: element.type + "_" + element.number
      //   })
      //   .on("click", function() {
      //     if (!$(this).is(".checked")) {
      //       // チェックが入っていない画像をクリックした場合、チェックを入れます。
      //       $(this).addClass("checked");
      //     } else {
      //       // チェックが入っている画像をクリックした場合、チェックを外します。
      //       $(this).removeClass("checked");
      //     }
      //   });
      // var check = $(
      //   '<input class="disabled_checkbox" type="checkbox" checked="" />'
      // )
      //   .attr({
      //     name: "cards",
      //     value: element.type + "_" + element.number
      //   })
      //   .on("click", function() {
      //     return false;
      //   });
      // let box = $('<div class="image_box"/>')
      //   .append(img)
      //   .append(check);
      // let li = $('<li id="' + element.type + element.number + '"></li>').append(
      //   box
      // );
      // $("#handCards").append(li);
    });
    debugLog("order accept");
    switchOrder(msg);
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
      const myModalInstance = new bsnV4.Modal(
        document.getElementById("releaseRoomModal"),
        {
          // options object
          backdrop: "static", // we don't want to dismiss Modal when Modal or backdrop is the click event target
          keyboard: false // we don't want to dismiss Modal on pressing Esc key
        }
      );
      myModalInstance.hide();
    }
  });
  /**
   * ルームのジョインに失敗した場合などサーバとの接続に失敗した場合
   */
  socket.on("connectError", errorType => {
    document.getElementById("elevenback").textContent =
      constant.ERROR_DIC[errorType];
    // document.getElementById('elevenback').textContent  = ''
    // $("#errorModalBody").text("");
    // $("#errorModalBody").text(constant.ERROR_DIC[errorType]);
    const myModalInstance = new bsnV4.Modal(
      document.getElementById("errorModal"),
      {}
    );
    myModalInstance.show();
    //$("#errorModal").modal();
  });

  const switchDispGameScreen = info => {
    //表示関連
    document.getElementById("gameFieldArea").style.display = "block"; //ゲームの場とか手札とか
    document.getElementById("bottomController").style.display = "block"; //ゲームコントローラーの親
    document.getElementById("gameController").style.display = "block"; //playボタン、passボタン
    document.getElementById("playerInfoDropdown").style.display = "block"; //右上のプレイヤードロップダウン
    document.getElementById("giveCard").style.display = "none"; //譲渡用のエリアを隠す
  };

  const initGameScreen = info => {
    document.getElementById("orderList").innerHTML = ""; //順番一覧の初期化
    document.getElementById("field").innerHTML = ""; //場のカード初期化
    document.getElementById("elevenback").textContent = ""; //11back表示のバッチ
    document.getElementById("shibari").textContent = ""; //縛りのバッチ
    document.getElementById("revolution").textContent = ""; //革命のバッチ
    document.getElementById("handCards").innerHTML = ""; //手札の初期化
    document.getElementById("giveCardList").innerHTML = ""; //譲渡カード初期化
    //アクションボタンの設定および非活性化
    document.getElementById("send").dataset.roomId = info.roomId;
    document.getElementById("send").setAttribute("disabled", true);
    document.getElementById("pass").dataset.roomId = info.roomId;
    document.getElementById("pass").setAttribute("disabled", true);
    //TODO これ以降は修正する可能性あり。ただ今はとりあえず設定しておく
    document.getElementById("blindCards").innerHTML = ""; //ブラインドカードの初期化
    document.getElementById("playerNameDisp").textContent = info.playerName2; //ユーザー名
    document.getElementById("playerPoint").textContent = info.playerPoint; //ユーザー点数
  };

  const displayOrder = info => {
    let displayStr =
      constant.ORDER_LIST_TEMPLATE[String(info.orderDispList.length)];
    info.orderDispList.forEach((element, index) => {
      let className = info.orderNum === index ? "isTurn" : "noTurn";
      if (info.orderDispList[index].cardNum === 0) {
        className = "gameEnd";
      }
      const playerName =
        "<span class=" +
        className +
        ">" +
        info.orderDispList[index].playerName +
        "</span>";
      const cardNum =
        "<span class=" +
        className +
        ">" +
        info.orderDispList[index].cardNum +
        "</span>";
      displayStr = displayStr
        .replace("{player" + index + "}", playerName)
        .replace("{num" + index + "}", cardNum);
    });
    $("#orderList").append(displayStr);
  };
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
    displayOrder(msg);
    // for (let i = 0; i < msg.userList.length; i++) {
    //   let ele =
    //     i === 0
    //       ? $("<li>")
    //           .text(msg.userList[i] + "(" + msg.card.length + "枚)")
    //           .attr({ style: "color: red" })
    //       : $("<li>").text(msg.userList[i] + "(" + msg.card.length + "枚)");
    //   $("#orderList").append(ele);
    //   if (i !== msg.userList.length - 1) {
    //     $("#orderList").append("→");
    //   }
    // }

    msg.blindCards.forEach(ele => {
      $("#blindCards").append(
        $("<li>" + constant.DISPLAY_DIC[ele.type + ele.number] + "</li>")
      );
    });
    msg.card.forEach(element => {
      dispHandCard(element);
      // const cardType = element.number + element.type;
      // const imgUri =
      //   "https://raw.githubusercontent.com/kentei/SVG-cards/master/png/2x/" +
      //   constant.DISPLAY_IMAGE_ID[element.type + element.number] +
      //   ".png";
      // //画像データを取得する
      // let img = $('<img class="handCardImage" src="' + imgUri + '"></img>')
      //   .attr({
      //     value: element.type + "_" + element.number
      //   })
      //   .on("click", function() {
      //     if (!$(this).is(".checked")) {
      //       // チェックが入っていない画像をクリックした場合、チェックを入れます。
      //       $(this).addClass("checked");
      //     } else {
      //       // チェックが入っている画像をクリックした場合、チェックを外します。
      //       $(this).removeClass("checked");
      //     }
      //   });
      // var check = $(
      //   '<input class="disabled_checkbox" type="checkbox" checked="" />'
      // )
      //   .attr({
      //     name: "cards",
      //     value: element.type + "_" + element.number
      //   })
      //   .on("click", function() {
      //     return false;
      //   });
      // let box = $('<div class="image_box"/>')
      //   .append(img)
      //   .append(check);
      // let li = $('<li id="' + element.type + element.number + '"></li>').append(
      //   box
      // );
      // $("#handCards").append(li);
    });
    debugLog("order accept");
    switchOrder(msg);
  });

  const dispHandCard = (cardInfo, isGiveMode = false, giveModeOption = {}) => {
    const imgUri =
      "https://raw.githubusercontent.com/kentei/SVG-cards/master/png/2x/" +
      constant.DISPLAY_IMAGE_ID[cardInfo.type + cardInfo.number] +
      ".png";
    //画像データを取得する
    let img = $('<img class="handCardImage" src="' + imgUri + '"></img>')
      .attr({
        value: cardInfo.type + "_" + cardInfo.number
      })
      .on("click", e => {
        // if (!$(e.currentTarget).is(".checked")) {
        //   // チェックが入っていない画像をクリックした場合、チェックを入れます。
        //   $(e.currentTarget).addClass("checked");
        // } else {
        //   // チェックが入っている画像をクリックした場合、チェックを外します。
        //   $(e.currentTarget).removeClass("checked");
        // }
        cardClickAction(e.currentTarget, isGiveMode, giveModeOption);
      });
    const check = $(
      '<input class="disabled_checkbox" type="checkbox" checked="" />'
    )
      .attr({
        name: "cards",
        value: cardInfo.type + "_" + cardInfo.number
      })
      .on("click", function() {
        return false;
      });
    const box = $('<div class="image_box"/>')
      .append(img)
      .append(check);
    const li = $(
      '<li id="' + cardInfo.type + cardInfo.number + '"></li>'
    ).append(box);
    // TODO できればhandCard1つにまとめたい。
    isGiveMode === true
      ? $("#giveCardList").append(li)
      : $("#handCards").append(li);
  };

  const cardClickAction = (targetCardDom, isGiveMode, giveModeOption) => {
    if (!$(targetCardDom).is(".checked")) {
      // チェックが入っていない画像をクリックした場合、チェックを入れます。
      $(targetCardDom).addClass("checked");
    } else {
      // チェックが入っている画像をクリックした場合、チェックを外します。
      $(targetCardDom).removeClass("checked");
    }
    if (isGiveMode) {
      //Giveモードの時のみ特殊設定
      if (
        $("img.giveCardImage.checked").length === giveModeOption.needGiveNum
      ) {
        // ボタン有効
        $("#give").prop("disabled", false);
      } else {
        // ボタン無効
        $("#give").prop("disabled", true);
      }
    }
  };

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
    document.getElementById("give").dataset.roomId = msg.roomId;
    msg.targetCard.forEach(element => {
      dispHandCard(element, true, { needGiveNum: 2 });
      // const cardType = element.number + element.type;
      // const imgUri =
      //   "https://raw.githubusercontent.com/kentei/SVG-cards/master/png/2x/" +
      //   constant.DISPLAY_IMAGE_ID[element.type + element.number] +
      //   ".png";
      // //画像データを取得する
      // let img = $('<img class="giveCardImage" src="' + imgUri + '"></img>')
      //   .attr({
      //     value: element.type + "_" + element.number
      //   })
      //   .on("click", function() {
      //     if (!$(this).is(".checked")) {
      //       // チェックが入っていない画像をクリックした場合、チェックを入れます。
      //       $(this).addClass("checked");
      //       if ($("img.giveCardImage.checked").length == 2) {
      //         // ボタン有効
      //         $("#give").prop("disabled", false);
      //       } else {
      //         // ボタン無効
      //         $("#give").prop("disabled", true);
      //       }
      //     } else {
      //       // チェックが入っている画像をクリックした場合、チェックを外します。
      //       $(this).removeClass("checked");
      //       if ($("img.giveCardImage.checked").length == 2) {
      //         // ボタン有効
      //         $("#give").prop("disabled", false);
      //       } else {
      //         // ボタン無効
      //         $("#give").prop("disabled", true);
      //       }
      //     }
      //   });
      // var check = $(
      //   '<input class="disabled_checkbox" type="checkbox" checked="" />'
      // )
      //   .attr({
      //     name: "cards",
      //     value: element.type + "_" + element.number
      //   })
      //   .on("click", function() {
      //     return false;
      //   });
      // let box = $('<div class="image_box"/>')
      //   .append(img)
      //   .append(check);
      // let li = $('<li id="' + element.type + element.number + '"></li>').append(
      //   box
      // );
      // $("#giveCardList").append(li);
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
    document.getElementById("give").dataset.roomId = msg.roomId;
    msg.targetCard.forEach(element => {
      dispHandCard(element, true, { needGiveNum: 1 });
      // const cardType = element.number + element.type;
      // const imgUri =
      //   "https://raw.githubusercontent.com/kentei/SVG-cards/master/png/2x/" +
      //   constant.DISPLAY_IMAGE_ID[element.type + element.number] +
      //   ".png";
      // //画像データを取得する
      // let img = $('<img class="giveCardImage" src="' + imgUri + '"></img>')
      //   .attr({
      //     value: element.type + "_" + element.number
      //   })
      //   .on("click", function() {
      //     if (!$(this).is(".checked")) {
      //       // チェックが入っていない画像をクリックした場合、チェックを入れます。
      //       $(this).addClass("checked");
      //       if ($("img.giveCardImage.checked").length == 1) {
      //         // ボタン有効
      //         $("#give").prop("disabled", false);
      //       } else {
      //         // ボタン無効
      //         $("#give").prop("disabled", true);
      //       }
      //     } else {
      //       // チェックが入っている画像をクリックした場合、チェックを外します。
      //       $(this).removeClass("checked");
      //       if ($("img.giveCardImage.checked").length == 1) {
      //         // ボタン有効
      //         $("#give").prop("disabled", false);
      //       } else {
      //         // ボタン無効
      //         $("#give").prop("disabled", true);
      //       }
      //     }
      //   });
      // var check = $(
      //   '<input class="disabled_checkbox" type="checkbox" checked="" />'
      // )
      //   .attr({
      //     name: "cards",
      //     value: element.type + "_" + element.number
      //   })
      //   .on("click", function() {
      //     return false;
      //   });
      // let box = $('<div class="image_box"/>')
      //   .append(img)
      //   .append(check);
      // let li = $('<li id="' + element.type + element.number + '"></li>').append(
      //   box
      // );
      // $("#giveCardList").append(li);
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

  /**
   * 順番切り替え
   */
  const switchOrder = orderInfo => {
    debugLog("order switch");
    if (orderInfo.yourTurn) {
      audio.play();
      $("#send").prop("disabled", false);
      $("#pass").prop("disabled", false);
      //$("#cardList input").prop("disabled", false);
      //$("#order").text("あなたの番です");
      $("#gameCommentaryArea").append("あなたのターンです。<br />");
      if (orderInfo.skip) {
        socket.emit("pass", {
          //id: $("input[name=roomRadios]:checked").val()
          id: orderInfo.roomId
        });
      }
    } else {
      $("#send").prop("disabled", true);
      $("#pass").prop("disabled", true);
      //$("#cardList input").prop("disabled", true);
      $("#gameCommentaryArea").append(
        orderInfo.playerName + "さんのターンです。<br />"
      );
    }
    $("#gameCommentaryArea").scrollTop(
      $("#gameCommentaryArea")[0].scrollHeight
    );
  };

  socket.on("order", function(msg) {
    //最初に
    //debugLog("order accept");
    //順番が回ったときはエラーを消そう
    $("#errorMsg").hide();
    switchOrder(msg);

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
  $("#send").on("click", e => {
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
    let collapse = new bsnV4.Collapse(
      document.getElementById("#battle" + msg.gameNum + "Content"),
      {}
    );
    collapse.show();
    //$("#battle" + msg.gameNum + "Content").collapse("show");
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

  /**
   * 部屋の人数が足りなくなったことによるゲーム中断通知
   */
  socket.on("releaseRoom", info => {
    debugLog("部屋がリリースされました");
    $("#releaseRoomModalBody").text("");
    $("#releaseRoomModalBody").text(constant.ERROR_DIC[info.reason]);
    const myModalInstance = new bsnV4.Modal(
      document.getElementById("releaseRoomModal"),
      {
        // options object
        backdrop: "static", // we don't want to dismiss Modal when Modal or backdrop is the click event target
        keyboard: false // we don't want to dismiss Modal on pressing Esc key
      }
    );
    myModalInstance.show();
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
