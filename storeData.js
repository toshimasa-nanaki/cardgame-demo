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