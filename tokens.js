var config = require('./config');
var memcache = require('./memcache').memcache;
var Datastore = require('@google-cloud/datastore');

const datastore = Datastore({
  projectId: config.GCLOUD_PROJECT
});

const TOKEN_KEY = 'tokens'
const kind = TOKEN_KEY;
const name = TOKEN_KEY;
const datastoreKey = datastore.key([kind, name]);

exports.save = (tokens) => {
  const entity = {
    key: datastoreKey,
    data: tokens,
  };

  datastore.save(entity).then(
    () => {
      console.log("Wrote tokens to datastore.");
      memcache.set(TOKEN_KEY, JSON.stringify(tokens), function(err, val) {
        if (err)
          console.log("Couldn't write tokens to memcache:", tokens, err);
        else
          console.log("Wrote tokens to memcache.");
      }, 600);
    },
    (err) => {
      console.log(`Couldn't save tokens:`, tokens, err);
    }
  );
}

// TODO: Remove the copy-paste in thermostats.js.
exports.get = (callback) => {
  memcache.get(TOKEN_KEY, function(err, val) {
    if (err || !val) {
      console.log("Couldn't get tokens from memcache. Getting from datastore:", err, val);
      datastore.get(datastoreKey).then(
        (entities) => {
          callback(entities[0]);
        },
        (err) => {
          console.log("Couldn't read tokens from datastore:", err);
          callback();
        }
      );
    } else {
      return callback(JSON.parse(val));
    }
  }, 600);
}
