var g_thermostats;
var g_pageSpecificNavCallback;

fetch('/thermostats/json')
  .then((response) => {
    if (!response.ok) {
      alert("Couldn't load thermostat list. Please reload.");
      return;
    }

    response.json()
      .then((json) => {
        if (json.error) {
          window.location = json.redirectUrl + window.location.pathname;
          return;
        }

        g_thermostats = json.thermostats;
        generateNavBar();
        if (g_pageSpecificNavCallback)
          g_pageSpecificNavCallback();
      });
  })
  .catch(() => {
    alert("Couldn't load thermostat list. Please reload.");
  });

function appendLink(container, href, text) {
  var a = document.createElement('a');
  a.href = href;
  a.textContent = text;
  if (a.pathname == window.location.pathname)
    a.className = 'current';
  container.appendChild(a);
}

function generateNavBar() {
  var navBar = document.getElementById('nav');
  appendLink(navBar, "/", "Ojubee");
  g_thermostats.forEach((thermostat) => {
    appendLink(navBar, `/thermostats/${thermostat.id}`, thermostat.name);
  });
}