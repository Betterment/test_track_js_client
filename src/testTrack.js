// Test Track Version // @echo version
;(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['node-uuid', 'blueimp-md5', 'jquery', 'base-64', 'jquery.cookie'], factory);
    } else if (typeof exports !== 'undefined') {
        var uuid = require('node-uuid'),
            md5 = require('blueimp-md5'),
            jquery = require('jquery'),
            base64 = require('base-64'),
            _jqCookie = require('jquery.cookie'); // jshint ignore:line
        // nodejs/commonjs
        module.exports = factory(uuid, md5, jquery, base64);
    } else {
        // Browser globals (root is window)
        root.TestTrack = factory(root.uuid, root.md5, root.jQuery, root.base64);
    }
})(this, function (uuid, md5, $, base64) {
    'use strict';

    if (typeof uuid === 'undefined') {
        throw new Error('TestTrack depends on node-uuid. Make sure you are including "bower_components/node-uuid/uuid.js"');
    } else if (typeof md5 === 'undefined') {
        throw new Error('TestTrack depends on blueimp-md5. Make sure you are including "bower_components/blueimp-md5/js/md5.js"');
    } else if (typeof $ === 'undefined') {
        throw new Error('TestTrack depends on jquery. You can use your own copy of jquery or the one in "bower_components/jquery/dist/jquery.js"');
    } else  if (typeof $.cookie !== 'function') {
        throw new Error('TestTrack depends on jquery.cookie. You can user your own copy of jquery.cooke or the one in bower_components/jquery.cookie/jquery.cookie.js');
    } else if (typeof base64 === 'undefined') {
        throw new Error('TestTrack depends on base-64. Make sure you are including "bower_components/base-64/base64.js"');
    }

    // @include ../src/bindPolyfill.js
    // @include ../src/mixpanelAnalytics.js
    // @include ../src/assignment.js
    // @include ../src/configParser.js
    // @include ../src/testTrackConfig.js
    // @include ../src/variantCalculator.js
    // @include ../src/assignmentNotification.js
    // @include ../src/assignmentOverride.js
    // @include ../src/visitor.js
    // @include ../src/session.js
    // @include ../src/identifier.js
    // @include ../src/varyDSL.js
    // @include ../src/abConfiguration.js

    var TestTrack = new Session().getPublicAPI(),
        notifyListener = function() {
            window.dispatchEvent(new CustomEvent('tt:lib:loaded', {
                detail: {
                    TestTrack: TestTrack
                }
            }));
        };

    try {
        // Add class to body of page after body is loaded to enable chrome extension support
        $(document).ready(function() {
            $(document.body).addClass('_tt');
            try {
                window.dispatchEvent(new CustomEvent('tt:class:added'));
            } catch(e) {}
        });
        // **** The order of these two lines is important, they support 2 different cases:
        // in the case where there is already code listening for 'tt:lib:loaded', trigger it immediately
        // in the case where there is not yet code listening for 'tt:lib:loaded', listen for 'tt:listener:ready' and then trigger 'tt:lib:loaded'
        notifyListener();
        window.addEventListener('tt:listener:ready', notifyListener);
    } catch(e) {}

    return TestTrack;
});
