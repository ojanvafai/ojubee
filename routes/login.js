var api = require('../ecobee-api');
var config = require('../config');
var tokenStore = require('../tokens');

const REFRESH_TRY_COUNT = 2;

function renderGetPin(req, res) {
  var scope = 'smartWrite';
  var appKey = config.appKey;

  api.calls.getPin(appKey, scope, function(err, pinResults) {
    if (err) {
      res.redirect('/login/error');
    } else {
      tokenStore.delete(() => {
        console.log(pinResults);
        res.render('login/getpin', {
          pin: pinResults.ecobeePin,
          code: pinResults.code,
          interval: pinResults.interval,
          isError: false,
          tooFast: false
        });
      });
    }
  });
}

exports.list = function(req, res){
  // No next param means this is just for the cron, so serve response
  // instead of redirecting.
  var next = req.param('next');
  var nextParams = next ? ('?next=' + next) : '';

  function refreshFailed(msg) {
    console.log(msg);
    if (next)
      renderGetPin(req, res);
    else
      res.status(500).send(msg);
  }

  tokenStore.get((tokens) => {
    if (!tokens) {
      refreshFailed("No refresh token.");
      return;
    }

    var refresh_token = tokens.refresh_token;
    console.log("Refreshing with these tokens:", tokens);
    var triesLeft = REFRESH_TRY_COUNT;

    var refreshTokens = () => {
      api.calls.refresh(refresh_token, function(err, registerResultObject) {
        if (err) { // if we error refreshing the token re-login
          console.log("Error refreshing token:", err);
          triesLeft--;

          if (triesLeft)
            setTimeout(refreshTokens, 5000);
          else
            refreshFailed(`Retried refreshing token ${REFRESH_TRY_COUNT} times before giving up.`);
        } else { // refresh of the tokens was successful to we can proceed to the main app
          console.log('New tokens:', registerResultObject);
          tokenStore.save(registerResultObject);

          if (next)
            res.redirect(next);
          else
            res.status(200).send("Refresh succeeded.");
        }
      });
    };
    refreshTokens();
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
        errorMessage = 'You must first authorize the app on your ecobee portal settings page. Then click the complete link button below.';
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
