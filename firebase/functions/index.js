'use strict';

const functions = require('firebase-functions');
const cors = require('cors')({origin: true});

exports.ojan = functions.https.onRequest((req, res) => {
  if (req.method !== 'GET') {
    res.status(403).send('Forbidden!');
    return;
  }

  cors(req, res, () => {
    // query params req.query.format;
    // post params req.body.format;
    res.status(200).send("ojan!");
  });
});
