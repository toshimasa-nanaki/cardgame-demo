const nodeExternals = require("webpack-node-externals");

module.exports = [
  //クライアント側(javascript)
  {
    mode: "development",
    entry: {
      client: `${__dirname}/src/client/index.js`,
    },
    output: {
      filename: "[name].js",
      path: `${__dirname}/public/js`,
    },
    resolve: {
      extensions: [".js", ".json"],
    },
  },
  //サーバ側
  {
    mode: "development",
    entry: {
      server: `${__dirname}/src/server/index.js`,
    },
    target: 'node',
    node: {
      // expressエラー対策：https://medium.com/@binyamin/creating-a-node-express-webpack-app-with-dev-and-prod-builds-a4962ce51334
      // らしいが、いらなそう？
      __dirname: false,
      __filename: false,
    },
    externals: [nodeExternals()],
  }
];
