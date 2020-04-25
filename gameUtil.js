module.exports.gameInit = function gameInit(count, sockets, roomId) {
  storeData.persistentData[roomId]["fieldCards"] = [];

  storeData.persistentData[roomId].finishNum = 0;
  storeData.persistentData[roomId].scoreTable = createRankTable(count);
  storeData.persistentData[roomId].elevenback = false;
  storeData.persistentData[roomId].shibari = false;
  storeData.persistentData[roomId].revolution = false;
  storeData.persistentData[roomId].stair = false;
  storeData.persistentData[roomId]["order"] = [];
  storeData.persistentData[roomId].startedGame = true;
  storeData.persistentData[roomId].rankCount = 1;

  //まずは順番決め
  decideOrder(roomId);

  //カード配布
  handOutCards(count, roomId);

  //準備完了通知
  //  notifyGameReady(roomId);
  if (storeData.persistentData[roomId].gameNum == 1) {
    //1回目のゲームの場合は完了通知を送る。
    notifyGameReady(roomId);
  } else {
    //2回目以降はまず献上が先に実施される。(Orderが降順になっているので、それを利用する)
    if (Object.keys(storeData.persistentData[roomId]["users"]).length >= 3) {
      //3人以上の時
      notifyGiveCard(roomId, Object.keys(storeData.persistentData[roomId]["users"]).length);
    } else {
      //2人の時などは献上はなし
      notifyGameReady(roomId);
    }
  }
}(count, sockets, roomId) {
  storeData.persistentData[roomId]["fieldCards"] = [];

  storeData.persistentData[roomId].finishNum = 0;
  storeData.persistentData[roomId].scoreTable = createRankTable(count);
  storeData.persistentData[roomId].elevenback = false;
  storeData.persistentData[roomId].shibari = false;
  storeData.persistentData[roomId].revolution = false;
  storeData.persistentData[roomId].stair = false;
  storeData.persistentData[roomId]["order"] = [];
  storeData.persistentData[roomId].startedGame = true;
  storeData.persistentData[roomId].rankCount = 1;

  //まずは順番決め
  decideOrder(roomId);

  //カード配布
  handOutCards(count, roomId);

  //準備完了通知
  //  notifyGameReady(roomId);
  if (storeData.persistentData[roomId].gameNum == 1) {
    //1回目のゲームの場合は完了通知を送る。
    notifyGameReady(roomId);
  } else {
    //2回目以降はまず献上が先に実施される。(Orderが降順になっているので、それを利用する)
    if (Object.keys(storeData.persistentData[roomId]["users"]).length >= 3) {
      //3人以上の時
      notifyGiveCard(roomId, Object.keys(storeData.persistentData[roomId]["users"]).length);
    } else {
      //2人の時などは献上はなし
      notifyGameReady(roomId);
    }
  }
}