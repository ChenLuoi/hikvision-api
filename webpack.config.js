const path = require('path');

module.exports = {
  mode: "production",
  target: "node",
  entry: {
    main: "./index.ts",
  },
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: "bundle.js",
    libraryExport: "default",
    globalObject: 'this',
    libraryTarget: 'umd'
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader"
      }
    ]
  }
};
