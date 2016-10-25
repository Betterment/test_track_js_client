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
                browsers: ['PhantomJS']
            },
            crossBrowser: {
                browsers: ['PhantomJS', 'Chrome', 'Firefox']
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
                        'bower_components/base-64/base64.js',
                        'bower_components/blueimp-md5/js/md5.js',
                        'bower_components/node-uuid/uuid.js',
                        'bower_components/jquery.cookie/jquery.cookie.js',
                        'dist/testTrack.js'
                    ]
                }
            }
        },

        'release-it': {
            options: {
                pkgFiles: ['package.json', 'bower.json'],
                buildCommand: 'grunt',
                npm: false
            }
        }
    });

    grunt.registerTask('test', 'Run jshint and tests.', ['jshint', 'karma:run']);
    grunt.registerTask('default', ['test', 'build']);
    grunt.registerTask('build', ['preprocess', 'uglify']);
};
