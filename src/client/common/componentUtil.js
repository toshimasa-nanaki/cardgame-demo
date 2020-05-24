/**
 * テーブルを作成し、指定の場所に配置する
 */
export const createTable = (headerData, initData, playerNum, tableParentDivId) => {
  //テーブル作成
  const table = document.createElement("table");
  table.className = "table";
  table.id = tableParentDivId + "Table"; //Tableというプレフィックスをつける。

  //ヘッダー作成
  const header = table.createTHead();
  const insertHeader = header.insertRow(-1);
  headerData.forEach((element, index) => {
    const th = document.createElement("th");
    th.innerHTML = headerData[index];
    th.setAttribute("scope", "col");
    insertHeader.appendChild(th);
  });

  //ボディ作成
  const body = table.createTBody();

  // 表に2次元配列の要素を格納
  for (let rowNum = 0; rowNum < playerNum; rowNum++) {
    const row = body.insertRow(-1);
    //rows.push(table.insertRow(-1));  // 行の追加
    for (let colNum = 0; colNum < initData[0].length; colNum++) {
      const cell = row.insertCell(-1);
      cell.appendChild(document.createTextNode(initData[rowNum][colNum]));
    }
  }
  // 指定したdiv要素に表を加える
  document.getElementById(tableParentDivId).appendChild(table);
};
