module.exports.TRUMPDATA = {
  total: 54,
  card: [
    { type: "club", count: 13 },
    { type: "spade", count: 13 },
    { type: "heart", count: 13 },
    { type: "diamond", count: 13 }
  ],
  joker: 2
};

module.exports.DEBUG_TRUMPDATA = {
  total: 14,
  card: [
    { type: "club", count: 3 },
    { type: "spade", count: 3 },
    { type: "heart", count: 3 },
    { type: "diamond", count: 3 }
  ],
  joker: 2
};

module.exports.createUniqueId = function(digits) {
  var strong = typeof digits !== "undefined" ? digits : 1000;
  return (
    Date.now().toString(16) + Math.floor(strong * Math.random()).toString(16)
  );
};

module.exports.sortArrayRandomly = (arrayData) => {
  var arr = arrayData.concat();
  var arrLength = arr.length;
  var randomArr = [];
  for (var i = 0; i < arrLength; i++) {
    var randomTarget = Math.floor(Math.random() * arr.length);
    randomArr[i] = arr[randomTarget];
    arr.splice(randomTarget, 1);
  }
  return randomArr;
}

module.exports.formatDate = (date, format) => {
  format = format.replace(/yyyy/g, date.getFullYear());
  format = format.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2));
  format = format.replace(/dd/g, ('0' + date.getDate()).slice(-2));
  format = format.replace(/HH/g, ('0' + date.getHours()).slice(-2));
  format = format.replace(/mm/g, ('0' + date.getMinutes()).slice(-2));
  format = format.replace(/ss/g, ('0' + date.getSeconds()).slice(-2));
  format = format.replace(/SSS/g, ('00' + date.getMilliseconds()).slice(-3));
  return format;
};

module.exports.htmlentities = (str) => {
    return String(str).replace(/&/g, "&amp;")
              .replace(/"/g, "&quot;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");
}