var api = require('../ecobee-api');
var config = require('../config');
var tokenStore = require('../tokens');

exports.list = function(req, res){
  tokenStore.get((tokens) => {
    var cookie_refresh = req.cookies.refreshtoken;

    var next = req.param('next');
    var nextParams = next ? ('?next=' + next) : '';

    if (cookie_refresh || tokens) {
      var refresh_token = cookie_refresh || tokenStore.refresh_token;

      console.log(tokens);

      api.calls.refresh(refresh_token, function(err, registerResultObject) {
        if (err) { // if we error refreshing the token re-login
          console.log("Error refreshing token:", err);
          res.redirect('/login/getpin' + nextParams);
        } else { // refresh of the tokens was successful to we can proceed to the main app
          console.log('New tokens:', registerResultObject);
          tokenStore.save(registerResultObject);

          if (next)
            res.redirect(next);
          else
            res.redirect('/');
        }
      });
    } else {
      console.log("No refresh token.");
      res.redirect('/login/getpin' + nextParams);
    }
  });
};

exports.create = function(req, res) {
  // get the users login credentials
  var code = req.param('code');
  var appKey = config.appKey;
  var scope = config.scope;

  api.calls.registerPin(appKey, code, function(err, registerResultObject) {
    var tooFast = false;
    if (err) {
      console.log(err)

      var interval = req.param('interval');
      var errorMessage = '';

      if (err.data && err.data.error && err.data.error === 'slow_down') {
        errorMessage = 'Polling too fast: Please wait ' + interval + ' seconds before attempting to complete the link again.';
        tooFast = true;
      } else {
        errorMessage = 'you must first authorize the app on your ecobee portal settings page. Then click the complete link button below.';
      }

      res.render('login/getpin', {
        pin: req.param('pin'),
        code: code,
        interval: interval,
        isError: true,
        tooFast: tooFast,
        error: errorMessage
      });
    } else {
      console.log('New tokens:', registerResultObject);
      tokenStore.save(registerResultObject);
      res.redirect('/');
    }
  });
};

exports.error = function(req, res) {
  res.render('login/error');
};

exports.getpin = function(req, res) {
  var scope = 'smartWrite';
  var client_id = config.appKey;

  api.calls.getPin(client_id, scope, function(err, pinResults) {
    if (err) {
      res.redirect('/login/error');
    } else {
      console.log(pinResults);
      res.render('login/getpin', {
        pin: pinResults.ecobeePin,
        code: pinResults.code,
        interval: pinResults.interval,
        isError: false,
        tooFast: false
      });
    }
  });
};
