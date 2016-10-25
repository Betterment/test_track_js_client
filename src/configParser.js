var ConfigParser = (function() { // jshint ignore:line
    var _ConfigParser = function() {
    };

    _ConfigParser.prototype.getConfig = function() {
        if (typeof window.atob === 'function') {
            return JSON.parse(window.atob(window.TT));
        } else {
            return JSON.parse(base64.decode(window.TT));
        }
    };

    return _ConfigParser;
})();
