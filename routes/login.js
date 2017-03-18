var api = require('../ecobee-api');
var config = require('../config');
var memcache = require('../memcache').memcache;

function cacheTokens(tokens) {
	memcache.set('tokens', JSON.stringify(tokens), function(err, val) {
		if (err)
			console.log("Couldn't write tokens to memcache");
		else
			console.log("Wrote tokens to memcache:", val);
	}, 600);
}

// TODO: Remove the copy-paste in thermostats.js.
function getTokens(callback) {
  memcache.get('tokens', function(err, val) {
    if (err)
      console.log("Couldn't get tokesn from memcache");
    else
      return callback(JSON.parse(val));
  }, 600);
}

exports.list = function(req, res){
  getTokens((tokens) => {
	  var cookie_refresh = req.cookies.refreshtoken;

		var next = req.param('next');
		var nextParams = next ? ('?next=' + next) : '';

	  if (cookie_refresh || tokens) {
			var refresh_token = cookie_refresh || tokens.refresh_token;

			api.calls.refresh(refresh_token, function(err, registerResultObject) {
				if (err) { // if we error refreshing the token clear session and re-log
					req.session.destroy();
					res.redirect('/login/getpin' + nextParams);
				} else { // refresh of the tokens was successful to we can proceed to the main app
					cacheTokens(registerResultObject);
					if (next)
						res.redirect(next);
					else
						res.redirect('/thermostats');
				}
			});
		} else {
			res.redirect('/login/getpin' + nextParams);
		}
	});
};

exports.create = function(req, res) {
	// get the users login credentials
	var authcode = req.param('authcode');
	var appKey = config.appKey;
	var scope = config.scope;

	api.calls.registerPin(appKey, authcode, function(err, registerResultObject) {
		var tooFast = false;
		if (err) {
			var errorMessage = '';

			console.log(err)
			if (err.data && err.data.error && err.data.error === 'slow_down') {
				errorMessage = 'Polling too fast: Please wait ' + req.session.interval + ' seconds before attempting to complete the link again.';
				tooFast = true;
			} else {
				errorMessage = 'you must first authorize the app on your ecobee portal settings page. Then click the complete link button below.';
			}
			res.render('login/getpin', {pin: req.session.pin, code: req.session.authcode, interval: req.session.interval, isError: true, tooFast: tooFast,  error: errorMessage});
		} else {
			cacheTokens(registerResultObject);
			res.redirect('/thermostats');
		}
	});
}
exports.error = function(req, res) {
	res.render('login/error');
},
exports.getpin = function(req, res) {
	var scope = 'smartWrite';
	var client_id = config.appKey;

	api.calls.getPin(client_id, scope, function(err, pinResults) {
		if (err) {
			res.redirect('/login/error');
		} else {
			console.log(pinResults);
			req.session.authcode = pinResults.code;
			req.session.pin = pinResults.ecobeePin;
			req.session.interval = pinResults.interval;
			res.render('login/getpin', {pin: pinResults.ecobeePin, code: pinResults.code, interval:pinResults.interval, isError: false, tooFast: false});
		}
	});
}
