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
  static async save(tokens) {
    return new Promise(resolve => {
      fetch(url, {
        method: 'put',
        headers: headers,
        body: JSON.stringify(tokens)
      }).then((response) => {
        if (!response.ok) {
          console.log("Couldn't write token to datastore: ", tokens);
          resolve();
          return;
        }
        return response.text();
      }).then((savedTokens) => {
        console.log("Wrote tokens to datastore: ", savedTokens);
        resolve(savedTokens);
      });
    });
  };

  static async get() {
    return new Promise(resolve => {
      fetch(url, {
        method: 'get',
        headers: headers,
      }).then((response) => {
        if (!response.ok) {
          resolve();
          return;
        }
        return response.json();
      }).then((tokens) => {
        resolve(tokens);
      });
    });
  };
}
