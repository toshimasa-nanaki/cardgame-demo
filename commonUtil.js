const log4js = require("log4js");
const logger = log4js.getLogger();
logger.level = "debug";
exports.logger = logger;
// const express = require("express");
// const app = require("express")();
// const http = require("http").Server(app);
// const io = require("socket.io")(http);
// exports.io = io;

// app.get("/", function(req, res) {
//   res.sendFile(__dirname + "/index.html");
// });
// app.use("/css", express.static("public/css"));
// app.use("/js", express.static("public/js"));

// http.listen(port, function() {
//   console.log("listening on *:" + port);
// });