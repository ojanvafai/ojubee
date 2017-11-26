const key = 'tokens';

export default class {
  static delete(callback) {
    localStorage.removeItem(key);
    callback();
    // localStorage.delete(datastoreKey, function(err) {
    //   if (err)
    //     console.log("Couldn't delete tokens from datastore:", err);
    //   else
    //     console.log("Deleted tokens to datastore.");

    //   callback();
    // });
  };

  static save(tokens) {
    localStorage.setItem(key, JSON.stringify(tokens));

    // const entity = {
    //   key: datastoreKey,
    //   data: tokens,
    // };

    // datastore.save(entity).then(
    //   () => {
    //     console.log("Wrote tokens to datastore:", tokens);
    //   },
    //   (err) => {
    //     console.log(`Couldn't save tokens:`, tokens, err);
    //   }
    // );
  };

  static get(callback) {
    let tokens = localStorage.getItem(key);
    try {
      callback(JSON.parse(tokens));
    } catch (e) {
      callback();
    }

  //   datastore.get(datastoreKey).then(
  //     (entities) => {
  //       callback(entities[0]);
  //     },
  //     (err) => {
  //       console.log("Couldn't read tokens from datastore:", err);
  //       callback();
  //     }
  //   );
  };
}
