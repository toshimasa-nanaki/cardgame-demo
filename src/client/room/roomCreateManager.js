//const socketConnection = require("../common/socketIO.js");
import socketConnection from "../common/socketIO";

/**
 * ルーム作成ボタンクリック時の動作
 */
document.getElementById("requestRoomCreate").addEventListener("click", () => {
  //部屋作成時
  socketConnection.emit("requestRoomCreate", {
    dispName: document.getElementById("roomDispName").value,
    capacity: document.getElementById("roomcapacity").value,
    setNum: document.getElementById("setNum").value,
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
};

/**
 * ルールプリセットの選択を変更した際の動作
 */
document.getElementById("rulePresetSelectbox").addEventListener("change", () => {
// $("#rulePresetSelectbox").on("change", event => {
  console.log($(event.currentTarget).val());
  switch ($(event.currentTarget).val()) {
    case "default":
      document.getElementById("setNum").value = "";
      document.getElementById("elevenBackSetting").checked = true;
      document.getElementById("stairSetting").checked = true;
      document.getElementById("shibariSetting").checked = true;
      
      // $("#elevenBackSetting").prop("checked", true);
      // $("#stairSetting").prop("checked", true);
      // $("#shibariSetting").prop("checked", true);
      break;
    case "official":
      document.getElementById("setNum").value = 3;
      document.getElementById("elevenBackSetting").checked = false;
      document.getElementById("stairSetting").checked = true;
      document.getElementById("shibariSetting").checked = true;
      // $("#elevenBackSetting").prop("checked", false);
      // $("#stairSetting").prop("checked", true);
      // $("#shibariSetting").prop("checked", true);
      break;
  }
});
/**
 * 部屋作成完了後の動作
 */
socketConnection.on("createdRoom", createdRoomInfo => {
  //部屋作成完了後
  // debugLog("CreatedRoom");
  // createRoomCardList(createdRoomInfo);
  $('#nav-tab a[href="#nav-joinroom"]')[0].Tab.show();
});
