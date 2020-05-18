const socket = require("socket.io-client");  

/**
   * ルーム作成ボタンクリック時の動作
   */
  document.getElementById("requestRoomCreate").addEventListener('click', () => {
    //部屋作成時
    socket.emit("requestRoomCreate", {
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
  }