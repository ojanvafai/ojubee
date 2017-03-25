var config = require('./config');
var Datastore = require('@google-cloud/datastore');

const datastore = Datastore({
  projectId: config.GCLOUD_PROJECT
});

const TOKEN_KEY = 'tokens'
const kind = TOKEN_KEY;
const name = TOKEN_KEY;
const datastoreKey = datastore.key([kind, name]);

exports.delete = (callback) => {
  datastore.delete(datastoreKey, function(err) {
    if (err)
      console.log("Couldn't delete tokens from datastore:", err);
    else
      console.log("Deleted tokens to datastore.");

    callback();
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
    },
    (err) => {
      console.log(`Couldn't save tokens:`, tokens, err);
    }
  );
}

exports.get = (callback) => {
  datastore.get(datastoreKey).then(
    (entities) => {
      callback(entities[0]);
    },
    (err) => {
      console.log("Couldn't read tokens from datastore:", err);
      callback();
    }
  );
}
