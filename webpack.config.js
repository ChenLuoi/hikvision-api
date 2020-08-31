const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = [{
  mode: "production",
  target: "node",
  entry: {
    main: "./index.ts"
  },
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: "bundle.js",
    chunkFilename: "[name].bundle.js",
    libraryExport: "default",
    globalObject: 'this',
    libraryTarget: 'umd'
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: 'src/worker/Decoder.wasm',
          to: 'worker'
        }
      ]
    })
  ],
  resolve: {
    extensions: [".ts", ".tsx", ".js"]
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader"
      }
    ]
  }
}, {
  mode: "production",
  target: "web",
  entry: {
    main: "./index.ts"
  },
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: "browser.js",
    libraryExport: "default",
    globalObject: 'this',
    libraryTarget: 'umd'
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"]
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader"
      }
    ]
  }
}];
