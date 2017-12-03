const key = 'tokens';

// TODO: Store this somewhere other than plain text.
let apiKey = '1_feHI1criVLQfGzgGRvBlLTCf7WAUpz';
let url = `https://api.mlab.com/api/1/databases/ojubee/collections/tokens/current?apiKey=${ apiKey }`;

// TODO: Change to throwing an error on !response.ok and having a catch handler so it
// also catches things like being offline.

let cachedTokens;
let fetchInProgress = false;
let resolvers = new Set();
let rejecters = new Set();

function clear() {
  resolvers.clear();
  rejecters.clear();
  fetchInProgress = false;
}

export default class {
  static async save(tokens) {
    cachedTokens = tokens;

    let tokenString = JSON.stringify(tokens);
    localStorage[key] = tokenString;

    return new Promise((resolve, reject) => {
      fetch(url, {
        method: 'put',
        headers: new Headers({
          "Content-Type": "application/json",
        }),
        body: tokenString,
      }).then((response) => {
        if (!response.ok) {
          console.log("Couldn't write token to datastore: ", tokens);
          reject();
          return;
        }
        console.log("Wrote tokens to datastore: ", tokens);
        return resolve();
      });
    });
  };

  static async get() {
    return new Promise((resolve, reject) => {
      if (!cachedTokens) {
        let localTokens = localStorage[key];
        if (localTokens)
          cachedTokens = JSON.parse(localTokens);
      }

      if (cachedTokens) {
        resolve(cachedTokens);
        return;
      }

      resolvers.add(resolve);
      rejecters.add(reject);

      if (fetchInProgress)
        return;
      fetchInProgress = true;

      fetch(url, {
        method: 'get',
      }).then((response) => {
        // TODO: Use try/finally once it's supported.
        if (response.ok) {
          response.json().then((tokens) => {
            cachedTokens = tokens;
            for (let resolve of resolvers) resolve(tokens);
            clear();
          });
        } else {
          for (let reject of rejecters) reject(cachedTokens);
          clear();
        }
      });
    });
  };
}
