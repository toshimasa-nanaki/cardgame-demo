const nodeExternals = require("webpack-node-externals");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

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
    plugins: [
      new MiniCssExtractPlugin({
        filename: `../css/[name].css`,
        chunkFilename: `../css/[id].css`,
      }),
    ],
    module:{
      rules:[
        {
          test: /\.js$/,
          use: "es6-loader",
          exclude: /node_modules/,
        },
        {
          test: /\.(sc|sa|c)ss/,
          use: [
            {
              loader: MiniCssExtractPlugin.loader,
            },
            {
              loader: "css-loader",
              options: {
                url: false,
                sourceMap: true,
                //minimize: true,
                importLoaders: 2,
              },
            },
            {
              loader: "postcss-loader",
              options: {
                sourceMap: true,
                plugins: () => [require("autoprefixer")],
              },
            },
            {
              loader: "sass-loader",
              options: {
                sourceMap: true,
              },
            },
          ],
        }
      ]
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
