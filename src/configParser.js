import base64 from 'base-64';

var ConfigParser = function() {};

ConfigParser.prototype.getConfig = function() {
  if (typeof window.atob === 'function') {
    return JSON.parse(window.atob(window.TT));
  } else {
    return JSON.parse(base64.decode(window.TT));
  }
};

export default ConfigParser;
