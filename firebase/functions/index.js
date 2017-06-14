'use strict';

const functions = require('firebase-functions');
const cors = require('cors')({origin: true});
const api = require('./ecobee-api');
const config = require('./config');

exports.ojan = functions.https.onRequest((req, res) => {
  if (req.method !== 'GET') {
    res.status(403).send('Forbidden!');
    return;
  }

  cors(req, res, () => {
    var scope = 'smartWrite';
    var appKey = config.appKey;

    api.calls.getPin(appKey, scope, function(err, pinResults) {
      if (err) {
        res.status(500).send(err);
      } else {
        res.status(200).send(pinResults);
        // tokenStore.delete(() => {
        //   console.log(pinResults);
        //   res.render('login/getpin', {
        //     pin: pinResults.ecobeePin,
        //     code: pinResults.code,
        //     interval: pinResults.interval,
        //     isError: false,
        //     tooFast: false
        //   });
        // });
      }
    });
  });
});

exports.authcode = functions.https.onRequest((req, res) => {
  res.status(200).send("code!");
  // // No next param means this is just for the cron, so serve response
  // // instead of redirecting.
  // var next = req.param('next');
  // var nextParams = next ? ('?next=' + next) : '';

  // function refreshFailed(msg) {
  //   console.log(msg);
  //   if (next)
  //     renderGetPin(req, res);
  //   else
  //     res.status(500).send(msg);
  // }

  // tokenStore.get((tokens) => {
  //   if (!tokens) {
  //     refreshFailed("No refresh token.");
  //     return;
  //   }

  //   var refresh_token = tokens.refresh_token;
  //   console.log("Refreshing with these tokens:", tokens);
  //   var triesLeft = REFRESH_TRY_COUNT;

  //   var refreshTokens = () => {
  //     api.calls.refresh(refresh_token, function(err, registerResultObject) {
  //       if (err) { // if we error refreshing the token re-login
  //         console.log("Error refreshing token:", err);
  //         triesLeft--;

  //         if (triesLeft)
  //           setTimeout(refreshTokens, 5000);
  //         else
  //           refreshFailed(`Retried refreshing token ${REFRESH_TRY_COUNT} times before giving up.`);
  //       } else { // refresh of the tokens was successful to we can proceed to the main app
  //         console.log('New tokens:', registerResultObject);
  //         tokenStore.save(registerResultObject);

  //         if (next)
  //           res.redirect(next);
  //         else
  //           res.status(200).send("Refresh succeeded.");
  //       }
  //     });
  //   };
  //   refreshTokens();
});