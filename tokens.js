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

function writeToMemcache(tokens) {
  memcache.set(TOKEN_KEY, JSON.stringify(tokens), function(err, val) {
    if (err)
      console.log("Couldn't write tokens to memcache:", tokens, err);
    else
      console.log("Wrote tokens to memcache:", val);
  }, 600);
}

exports.delete = (callback) => {
  var memcacheDone = false;
  var datastoreDone = false;
  var finished = () => {
    if (memcacheDone && datastoreDone)
      callback();
  }

  memcache.delete(TOKEN_KEY, function(err, success) {
    if (err)
      console.log("Couldn't delete tokens from memcache:", err);
    else
      console.log("Deleted tokens to memcache:", success);

    memcacheDone = true;
    finished();
  }, 600);

  datastore.delete(datastoreKey, function(err) {
    if (err)
      console.log("Couldn't delete tokens from datastore:", err);
    else
      console.log("Deleted tokens to datastore.");

    datastoreDone = true;
    finished();
  });
}

exports.save = (tokens) => {
  const entity = {
    key: datastoreKey,
    data: tokens,
  };

  datastore.save(entity).then(
    () => {
      console.log("Wrote tokens to datastore:", tokens);
      writeToMemcache(tokens);
    },
    (err) => {
      console.log(`Couldn't save tokens:`, tokens, err);
    }
  );
}

exports.get = (callback) => {
  memcache.get(TOKEN_KEY, function(err, val) {
    if (err || !val) {
      console.log("Couldn't get tokens from memcache. Getting from datastore:", err, val);
      datastore.get(datastoreKey).then(
        (entities) => {
          var tokens = entities[0];
          console.log("Trying to write datastore value to memcache:", tokens);
          if (tokens)
            writeToMemcache(tokens);
          callback(tokens);
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
