var config = require('./config');
var memjs = require('memjs');

exports.memcache = memjs.Client.create(config.memcacheUrl);
