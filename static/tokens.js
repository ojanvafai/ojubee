const key = 'tokens';

// TODO: Store this somewhere other than plain text.
let apiKey = '1_feHI1criVLQfGzgGRvBlLTCf7WAUpz';
let url = `https://api.mlab.com/api/1/databases/ojubee/collections/tokens/current?apiKey=${ apiKey }`;
let headers = new Headers({
  "Content-Type": "application/json",
});

// TODO: Change to throwing an error on !response.ok and having a catch handler so it
// also catches things like being offline.

export default class {
  static save(tokens) {
    fetch(url, {
      method: 'put',
      headers: headers,
      body: JSON.stringify(tokens)
    }).then(function(response) {
      if (!response.ok) {
        console.log("Couldn't write token to datastore: ", tokens);
        return;
      }
      return response.text();
    }).then(function(data) {
      console.log("Wrote tokens to datastore: ", data);
    });

    localStorage.setItem(key, JSON.stringify(tokens));
  };

  static async get(callback) {
    return new Promise(resolve => {
      fetch(url, {
        method: 'get',
        headers: headers,
      }).then(function(response) {
        if (!response.ok) {
          resolve();
          return;
        }
        return response.json();
      }).then(function(tokens) {
        resolve(tokens);
      });
    });
  };
}
