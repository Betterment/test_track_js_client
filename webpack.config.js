var path = require('path');

module.exports = {
  entry: './src/testTrack.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'testTrack.js',
    library: 'TestTrack',
    libraryTarget: 'umd'
  },
  externals: {
    jquery: 'jQuery'
  }
};
