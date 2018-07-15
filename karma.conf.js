var webpackConfig = require('./webpack.config.js');

module.exports = function(config) {
    config.set({
        basePath: '.',
        frameworks: ['mocha', 'sinon-chai'],

        files: [
            'node_modules/jquery/dist/jquery.js',
            'node_modules/jquery.cookie/jquery.cookie.js',

            { pattern: 'src/**/*.js' },
            { pattern: 'test/specs/**/*.spec.js' }
        ],

        exclude: [
            'src/testTrack.js'
        ],

        webpack: webpackConfig,
        reporters: ['progress', 'coverage'],

        preprocessors: {
            'test/specs/**/*.spec.js': ['webpack'],
            'src/**/*.js': ['webpack', 'coverage']
        },

        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        browsers: ['ChromeHeadless'],
        captureTimeout: 60000,
        singleRun: true
    });
};
