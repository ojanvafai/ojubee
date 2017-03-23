// Mostly copy-pasted from https://css-tricks.com/serviceworker-for-offline/

var version = 'v2::';
var enableFetchLogging = false;

self.addEventListener("install", (event) => {
  console.log('WORKER: install event in progress.');
  event.waitUntil(
    caches
      .open(version + 'ojubee')
      .then((cache) => {
        return cache.addAll([
          '/',
        ]);
      })
      .then(() => {
        console.log('WORKER: install completed');
      })
  );
});

function shouldCache(url) {
  if (url == "/")
    return true;

  if (url.match(/^chrome-extension:/))
    return false;

  // Only match the main thermostat page.
  if (url.match(/\/thermostats\/[^/]+$/)) {
    return true;
  }

  return url.match(/\/(css|img|js|stylesheets)\//);
}

self.addEventListener("fetch", (event) => {
  if (enableFetchLogging)
    console.log('WORKER: fetch event in progress.');

  var request = event.request;

  if (request.method !== 'GET' || request.cache == "no-store" || !shouldCache(request.url)) {
    if (enableFetchLogging && !request.url.match(/^chrome-extension:/))
      console.log('WORKER: fetch event ignored.', request.method, request.url);
    return;
  }

  event.respondWith(
    caches
      .match(request)
      .then((cached) => {
        var networked = fetch(request)
          .then(fetchedFromNetwork, unableToResolve)
          .catch(unableToResolve);

        if (enableFetchLogging)
          console.log('WORKER: fetch event', cached ? '(cached)' : '(network)', request.url);
        return cached || networked;

        function fetchedFromNetwork(response) {
          var cacheCopy = response.clone();
          if (enableFetchLogging)
            console.log('WORKER: fetch response from network.', request.url);

          caches
            .open(version + 'pages')
            .then(function add(cache) {
              cache.put(request, cacheCopy);
            })
            .then(() => {
              if (enableFetchLogging)
                console.log('WORKER: fetch response stored in cache.', request.url);
            });

          return response;
        }

        function unableToResolve () {
          console.log('WORKER: fetch request failed in both cache and network.');
          return new Response('<h1>Service Unavailable</h1>', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/html'
            })
          });
        }
      })
  );
});

self.addEventListener("activate", (event) => {
  console.log('WORKER: activate event in progress.');
  event.waitUntil(
    caches
      // This method returns a promise which will resolve to an array of available
      // cache keys.
      .keys()
      .then((keys) => {
        // We return a promise that settles when all outdated caches are deleted.
        return Promise.all(
          keys
            .filter((key) => {
              return !key.startsWith(version);
            })
            .map((key) => {
              // Return a promise that's fulfilled
              // when each outdated cache is deleted.
              return caches.delete(key);
            })
        );
      })
      .then(() => {
        console.log('WORKER: activate completed.');
      })
  );
});
