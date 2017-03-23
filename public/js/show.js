var g_thermostatId = location.pathname.replace("/thermostats/", "");
var g_state;
var g_pendingRequest;
var g_pendingUpdateState;
var g_tempsModified = false;

function applyState() {
  document.getElementById('details').classList.remove('hidden');

  var html = '';
  g_state.sensors.forEach(function(sensor) {
    html += '<div>' + sensor.name + ': ' + sensor.temp + '</div>';
  });
  document.getElementById('sensors').innerHTML = html;

  ["currentTemp", "desiredCool", "desiredHeat", "mode",].forEach((id) => {
    document.getElementById(id).textContent = g_state[id];
  });

  var fan = document.getElementById('fan');
  fan.setAttribute('state', g_state.desiredFanMode);
}

function updateState() {
  showSpinner();

  if (g_pendingUpdateState)
    g_pendingUpdateState.abort();

  g_pendingUpdateState = new XMLHttpRequest();
  g_pendingUpdateState.responseType = 'json';

  g_pendingUpdateState.addEventListener('load', () =>{
    var newState = g_pendingUpdateState.response;

    if (newState.error) {
      window.location = newState.redirectUrl + window.location.pathname;
      return;
    }

    // Check if desiredCool/heat don't match early return and
    // issue another updateTemp request and loop through till it takes.
    if (g_tempsModified && g_state &&
        (newState.desiredHeat != g_state.desiredHeat ||
         newState.desiredCool != g_state.desiredCool)) {
      console.log("Numbers didn't take. Retrying.",
        newState.desiredHeat, g_state.desiredHeat,
        newState.desiredCool, g_state.desiredCool);
      setTimeout(updateTemp, 1000);
      return;
    }

    g_tempsModified = false;
    hideSpinner();
    g_state = newState;
    applyState();
  });

  g_pendingUpdateState.addEventListener('error', () =>{});
  g_pendingUpdateState.open("GET", `/thermostats/${g_thermostatId}/json`);
  g_pendingUpdateState.send();
}

function resumeSchedule() {
  showSpinner();

  var xhr = new XMLHttpRequest();
  xhr.addEventListener('load', updateState);
  xhr.addEventListener('error', () => {
    updateState();
    alert('Resume schedule failed. Reload the page to be safe.');
  });
  xhr.open("POST", `/thermostats/${g_thermostatId}/resume`);
  xhr.send();
}

function encodedValue(id) {
  // TODO: spaces as '+'
  return id + '=' + encodeURIComponent(g_state[id]);
}

function toggleFan() {
  if (g_state.desiredFanMode == 'auto')
    g_state.desiredFanMode = 'on';
  else
    g_state.desiredFanMode = 'auto';

  applyState();
  updateTemp();
}

function modifyTemp(id, delta) {
  g_tempsModified = true;
  g_state[id] = g_state[id] + delta;

  // Must have a minimum of 5 degrees difference.
  // Otherwise the server tries to do this logic but
  // goes crazy and uses fractional values.
  if (g_state.desiredCool - g_state.desiredHeat < 5) {
    if (id == 'desiredHeat')
      g_state.desiredCool = g_state.desiredHeat + 5;
    else
      g_state.desiredHeat = g_state.desiredCool - 5;
  }

  applyState();
  updateTemp();
}

// This rounding shouldn't be necessary, but ecobee sometimes returns
// fractional values and everything gets confused.
// Seems to happen if you try to set temp values that aren't allowed,
// e.g. at the bounds of allowed, or hot/cold too close to each other.
function roundTempValues(state) {
  state.desiredHeat = Math.round(state.desiredHeat);
  state.desiredCool = Math.round(state.desiredCool);
}

function showSpinner() {
  spinner.classList.remove('hidden');
}

function hideSpinner() {
  spinner.classList.add('hidden');
}

function updateTemp() {
  if (g_pendingRequest)
    g_pendingRequest.abort();

  showSpinner();

  g_pendingRequest = new XMLHttpRequest();
  g_pendingRequest.addEventListener('load', updateState);
  g_pendingRequest.addEventListener('error', () => {
    updateState();
    alert('Update failed. Reload the page to be safe.');
  });

  g_pendingRequest.open("POST", `/thermostats/${g_thermostatId}/sethold`);
  g_pendingRequest.setRequestHeader('Content-Type','application/x-www-form-urlencoded')

  roundTempValues(g_state);
  g_pendingRequest.send(`${encodedValue('desiredHeat')}&${encodedValue('desiredCool')}&${encodedValue('desiredFanMode')}`);
}

window.addEventListener('DOMContentLoaded', () => {
  updateState();
  window.addEventListener('focus', updateState);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('../service-worker.js').then(
      () => {},
      () => {
        console.log('CLIENT: service worker registration failure.');
      }
    );
  }
});
