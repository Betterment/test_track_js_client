// Karma configuration
// Generated on Wed Nov 06 2013 09:05:54 GMT-0500 (EST)

module.exports = function(config) {
    config.set({

        basePath: '..',

        frameworks: ['mocha', 'sinon-chai'],

        files: [
            // Dependencies
            'node_modules/node-uuid/uuid.js',
            'node_modules/blueimp-md5/js/md5.js',
            'node_modules/jquery/dist/jquery.js',
            'node_modules/jquery.cookie/jquery.cookie.js',
            'node_modules/base-64/base64.js',

            // PhantomJS 1.9.8 doesn't have Function.prototype.bind
            'node_modules/es5-shim/es5-shim.js',

            // TestTrack Components
            { pattern: 'src/**/*.js' },

            // Test Setup
            'test/setup.js',

            // Tests
            { pattern: 'test/specs/**/*.spec.js' }
        ],

        exclude: [
            'src/testTrack.js'
        ],

        // test results reporter to use
        // possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
        reporters: ['progress', 'coverage'],

        preprocessors: {
            'src/**/*.js': ['coverage']
        },

        port: 9876,

        colors: true,

        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,

        // Start these browsers, currently available:
        // - Chrome
        // - ChromeCanary
        // - Firefox
        // - Opera (has to be installed with `yarn add --dev karma-opera-launcher`)
        // - Safari (only Mac; has to be installed with `yarn add --dev karma-safari-launcher`)
        // - PhantomJS
        // - IE (only Windows; has to be installed with `yarn add --dev karma-ie-launcher`)
        browsers: ['PhantomJS', 'Chrome', 'Firefox'],

        // If browser does not capture in given timeout [ms], kill it
        captureTimeout: 60000,

        // Continuous Integration mode
        // if true, it capture browsers, run tests and exit
        singleRun: true
    });
};
