const webpack = require('webpack');
const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const config = {
  mode: 'production',
  entry: path.resolve(__dirname, 'index.ts'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    library: 'CardanoPeerConnect',
    libraryTarget: 'umd',
    globalObject: 'this',
    publicPath: '/dist/',
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.(js|mjs|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              ['@babel/preset-typescript', { allowNamespaces: true }],
            ],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.ts'],
    fallback: {
      fs: false,
    },
  },
  plugins: [
    new webpack.ProgressPlugin(),
    new CleanWebpackPlugin({
      verbose: true,
      cleanStaleWebpackAssets: true,
    }),
    new webpack.DefinePlugin({
      global: 'globalThis',
      self: 'globalThis',
    }),
  ],
};

module.exports = config;
