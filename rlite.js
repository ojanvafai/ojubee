/*
Copyright (c) 2016 Chris Davies

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

export default function rlite(notFound, routeDefinitions) {
  var routes = {};
  var decode = decodeURIComponent;

  init();

  return run;

  function init() {
    for (var key in routeDefinitions) {
      add(key, routeDefinitions[key]);
    }
  };

  function noop(s) { return s; }

  function sanitize(url) {
    ~url.indexOf('/?') && (url = url.replace('/?', '?'));
    url[0] == '/' && (url = url.slice(1));
    url[url.length - 1] == '/' && (url = url.slice(0, -1));

    return url;
  }

  // Recursively searches the route tree for a matching route
  // pieces: an array of url parts, ['users', '1', 'edit']
  // esc: the function used to url escape values
  // i: the index of the piece being processed
  // rules: the route tree
  // params: the computed route parameters (this is mutated), and is a stack since we don't have fast immutable datatypes
  //
  // This attempts to match the most specific route, but may end int a dead-end. We then attempt a less specific
  // route, following named route parameters. In searching this secondary branch, we need to make sure to clear
  // any route params that were generated during the search of the dead-end branch.
  function recurseUrl(pieces, esc, i, rules, params) {
    if (!rules) {
      return;
    }

    if (i >= pieces.length) {
      var cb = rules['@'];
      return cb && {
        cb: cb,
        params: params.reduce(function(h, kv) { h[kv[0]] = kv[1]; return h; }, {}),
      };
    }

    var piece = esc(pieces[i]);
    var paramLen = params.length;
    return recurseUrl(pieces, esc, i + 1, rules[piece.toLowerCase()], params)
      || recurseNamedUrl(pieces, esc, i + 1, rules, ':', piece, params, paramLen)
      || recurseNamedUrl(pieces, esc, pieces.length, rules, '*', pieces.slice(i).join('/'), params, paramLen);
  }

  // Recurses for a named route, where the name is looked up via key and associated with val
  function recurseNamedUrl(pieces, esc, i, rules, key, val, params, paramLen) {
    params.length = paramLen; // Reset any params generated in the unsuccessful search branch
    var subRules = rules[key];
    subRules && params.push([subRules['~'], val]);
    return recurseUrl(pieces, esc, i, subRules, params);
  }

  function processQuery(url, ctx, esc) {
    if (url && ctx.cb) {
      var hash = url.indexOf('#'),
          query = (hash < 0 ? url : url.slice(0, hash)).split('&');

      for (var i = 0; i < query.length; ++i) {
        var nameValue = query[i].split('=');

        ctx.params[nameValue[0]] = esc(nameValue[1]);
      }
    }

    return ctx;
  }

  function lookup(url) {
    var querySplit = sanitize(url).split('?');
    var esc = ~url.indexOf('%') ? decode : noop;

    return processQuery(querySplit[1], recurseUrl(querySplit[0].split('/'), esc, 0, routes, []) || {}, esc);
  }

  function add(route, handler) {
    var pieces = route.split('/');
    var rules = routes;

    for (var i = +(route[0] === '/'); i < pieces.length; ++i) {
      var piece = pieces[i];
      var name = piece[0] == ':' ? ':' : piece[0] == '*' ? '*' : piece.toLowerCase();

      rules = rules[name] || (rules[name] = {});

      (name == ':' || name == '*') && (rules['~'] = piece.slice(1));
    }

    rules['@'] = handler;
  }

  function run(url, arg) {
    var result = lookup(url);

    return (result.cb || notFound)(result.params, arg, url);
  };
};
