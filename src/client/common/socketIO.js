const socketIO = require("socket.io-client");

const socketConnection = socketIO().io;

export default socketConnection;