module.exports = [
  //クライアント側(javascript)
  {
    mode: "development",
    entry: {
      client: "./src/client/index.js",
    },
    output: {
      filename: "[name].js",
      path: `${__dirname}/public/js`,
    },
  },
  //サーバ側
  {
    mode: "development",
    entry: {
      server: "./src/server/index.js",
    }
  }
];
