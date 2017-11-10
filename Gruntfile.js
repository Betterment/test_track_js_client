module.exports = function(grunt) {
    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        jshint: {
            all: {
                options: {
                    jshintrc: '.jshintrc'
                },
                src: ['src/**/*.js']
            }
        },

        karma: {
            options: {
                configFile: 'test/karma.conf.js'
            },
            run: {
                browsers: ['ChromeHeadless']
            },
            crossBrowser: {
                browsers: ['ChromeHeadless', 'Chrome', 'Firefox']
            }
        },

        preprocess: {
            options: {
                context: {
                    version: '<%=  pkg.version %>'
                }
            },
            build: {
                src: 'src/testTrack.js',
                dest: 'dist/testTrack.js'
            }
        },

        uglify: {
            build: {
                files: {
                    'dist/testTrack.min.js': ['dist/testTrack.js'],
                    'dist/testTrack.bundle.min.js': [
                        'node_modules/base-64/base64.js',
                        'node_modules/blueimp-md5/js/md5.js',
                        'node_modules/node-uuid/uuid.js',
                        'node_modules/jquery.cookie/jquery.cookie.js',
                        'dist/testTrack.js'
                    ]
                }
            }
        },

        'release-it': {
            options: {
                pkgFiles: ['package.json'],
                buildCommand: 'grunt',
                npm: false
            }
        }
    });

    grunt.registerTask('test', 'Run jshint and tests.', ['jshint', 'karma:run']);
    grunt.registerTask('default', ['test', 'build']);
    grunt.registerTask('build', ['preprocess', 'uglify']);
};
