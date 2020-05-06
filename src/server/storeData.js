const commonUtil = require("./commonUtil.js");

module.exports.persistentData = {};

module.exports.createRankTable = (count) => {
  if (count == 2) {
    return [{ rankId: "hugou", point: 1 }, { rankId: "hinmin", point: 0 }];
  } else if (count == 3) {
    return [
      { rankId: "hugou", point: 1 },
      { rankId: "heimin", point: 0 },
      { rankId: "hinmin", point: -1 }
    ];
  } else if (count == 4) {
    return [
      { rankId: "daihugou", point: 2 },
      { rankId: "hugou", point: 1 },
      { rankId: "hinmin", point: 0 },
      { rankId: "daihinmin", point: -1 }
    ];
  } else {
    let rankTable = [
      { rankId: "daihugou", point: 2 },
      { rankId: "hugou", point: 1 }
    ];
    for (let i = 0; i < count - 4; i++) {
      rankTable.push({ rankId: "heimin", point: 0 });
    }
    rankTable.push({ rankId: "heimin", point: -1 });
    rankTable.push({ rankId: "hinmin", point: -2 });
    return rankTable;
  }
}

module.exports.fieldClear = (roomId) => {
  module.exports.persistentData[roomId]["fieldCards"] = [];
  module.exports.persistentData[roomId].passCount = 0;
  module.exports.persistentData[roomId].elevenback = false;
  module.exports.persistentData[roomId].stair = false;
  module.exports.persistentData[roomId].shibari = false;
  module.exports.persistentData[roomId].shibariSuites = [];
}

module.exports.sortCard = (roomId, userId, isASC = true) => {
  module.exports.persistentData[roomId]['users'][userId].card = commonUtil.sortArray(module.exports.persistentData[roomId]['users'][userId].card, isASC);
}