"use strict";

const loggerUtil = require("./loggerUtil.js");
const LOGGER = loggerUtil.logger;

/*
カードの役を確認する
*/
module.exports.checkValidateHand = (sc) => {
  //1枚だし
  //複数枚だし
  //階段(3枚以上、順番、同スート)
  let result = {
    error: 0,
    type: ""
  };
  if (sc.length === 1) {
    //1枚だしは特に問題なし
    LOGGER.debug("大富豪の役：1枚だし");
    result.type = "unit";
  } else if (isAllSameNumber(sc)) {
    //複数枚だしで数字がそろっていること
    LOGGER.debug("大富豪の役：複数枚だし");
    result.type = "multiple";
  } else if (isStairsCard(sc)) {
    //階段
    LOGGER.debug("大富豪の役：階段");
    result.type = "stair";
  } else {
    result.error = 1;
  }
  return result;
}

/*
すべての数字が同じかどうか判定。
(JOKERも対応)
*/
const isAllSameNumber = (sc) => {
  let base = sc[0].number;
  for (let i = 1; i < sc.length; i++) {
    if (~sc[i].type.indexOf("joker")) {
      continue;
    }
    if (base !== sc[i].number) {
      return false;
    }
  }
  return true;
}

/*
階段かどうか判定
*/
const isStairsCard = (sc) => {
  //Jokerの数を確認
  let jokerCount = sc.filter(item => ~item.type.indexOf("joker")).length;
  if (sc.length < 3) {
    //3枚以上でなければ階段ではない
    return false;
  }
  //Note 数字1枚、ジョーカー2枚は複数出しになるので意識しなくてよい。
  let suit = false;
  let stairNum = false;
  for (let i = 0; i < sc.length; i++) {
    //比較対象がない場合は抜ける。
    if (i + 1 === sc.length) {
      break;
    }
    //比較対象がJokerの場合は終わり
    if (~sc[i + 1].type.indexOf("joker")) {
      break;
    }
    //スートチェック
    if (sc[i + 1].type === sc[i].type) {
      suit = true;
    } else {
      return false; //1回でもマークが違ったら階段ではない
    }
    //階段チェック
    //Note 差が0のときはスートチェックで引っかかるので相手しない
    const diff = sc[i + 1].number - sc[i].number;
    if (diff === 1) {
      //差が1なら階段と判断
      stairNum = true;
    } else {
      if (jokerCount > 0) {
        //Jokerで救えるか確認する
        if (diff - 1 <= jokerCount) {
          stairNum = true;
          jokerCount = jokerCount - (diff - 1);
        } else {
          //Jokerでも救うことができない
          return false;
        }
      } else {
        //Jokerがなく、差が1より大きいと階段ではない
        return false;
      }
    }
  }
  return suit && stairNum;
}

//autoパスできるか否か
const isAutoPass = (roomId) => {
  
}