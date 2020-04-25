module.exports.express = require("express");
module.exports.app = require("express")();
module.exports.http = require("http").Server(module.exports.app);
module.exports.io = require("socket.io")(module.exports.http);
//const io = module.exports.io;