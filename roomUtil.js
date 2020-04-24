module.exports.createRoom = () => {
  
}

module.exports.roomJoin = () => {
  
}


const createdDefaultRoomName = () => {
  let now = new Date();
  return (
    now.getFullYear() +
    "_" +
    (now.getMonth() + 1) +
    "_" +
    now.getDate() +
    "_" +
    now.getHours() +
    ":" +
    now.getMinutes() +
    ":" +
    now.getSeconds()
  );
}