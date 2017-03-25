var g_thermostatId = location.pathname.replace("/thermostats/", "");
var g_state;
var g_tempsModified = false;
var g_pendingRequests = new Map();

function applyOnState(idPrefix, keyword) {
  var id = idPrefix + 'On';
  if (g_state.equipmentStatus.indexOf(keyword) == -1)
    document.getElementById(id).classList.remove(id);
  else
    document.getElementById(id).classList.add(id);
}

function applyState() {
  document.getElementById('container').classList.remove('hidden');
  document.getElementById('load-spinner').style.display = 'none';

  var html = '';
  g_state.sensors.forEach(function(sensor) {
    html += '<div>' + sensor.name + ': ' + sensor.temp + '</div>';
  });
  document.getElementById('sensors').innerHTML = html;

  ["currentTemp", "desiredCool", "desiredHeat",].forEach((id) => {
    document.getElementById(id).textContent = g_state[id];
  });

  var mode = document.getElementById('mode');
  for (var i = 0; i < mode.length; i++) {
    if (mode.item(i).value == g_state.mode) {
      mode.selectedIndex = i;
      break;
    }
  }

  var fan = document.getElementById('fan');
  fan.setAttribute('state', g_state.desiredFanMode);

  var override = document.getElementById('override');
  override.textContent = g_state.overrideTime ? `Held until ${g_state.overrideTime}` : '';

  var resume = document.getElementById('resume');
  if (g_state.overrideTime)
    resume.classList.remove('hidden');
  else
    resume.classList.add('hidden');

  applyOnState('heat', 'auxHeat');
  applyOnState('cool', 'compCool');
  applyOnState('fan', 'fan');
}

// TODO: Use fetch once it supports cancellation.
function fetchJson(requestKey, url, onLoad, onError, opt_postData) {
  showSpinner();

  var pending = g_pendingRequests.get(requestKey);
  if (pending)
    pending.abort();

  var xhr = new XMLHttpRequest();
  xhr.open(opt_postData !== undefined ? "POST" : "GET", url);

  xhr.responseType = 'json';
  xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded')

  xhr.addEventListener('load', () => {
    g_pendingRequests.delete(requestKey);
    onLoad(xhr.response);
  });

  xhr.addEventListener('error', () => {
    g_pendingRequests.delete(requestKey);
    onError();
  });

  xhr.send(opt_postData);

  g_pendingRequests.set(requestKey, xhr);
}

function updateStateLoad(newState) {
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
}

function updateState() {
  var onError = () => {
    console.log('updateState failed.');
  };
  fetchJson('updateState',
    `/thermostats/${g_thermostatId}/json`,
    updateStateLoad,
    onError);
}

function resumeSchedule() {
  var onError = () => {
    updateState();
    alert('Resume schedule failed. Reload the page to be safe.');
  };
  var postData = "";
  fetchJson('resumeSchedule',
    `/thermostats/${g_thermostatId}/resume`,
    updateState,
    onError,
    postData);
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

  if (g_state.desiredCool < g_state.allowedCoolRange[0])
    g_state.desiredCool = g_state.allowedCoolRange[0];
  if (g_state.desiredHeat < g_state.allowedHeatRange[0])
    g_state.desiredHeat = g_state.allowedHeatRange[0];
  if (g_state.desiredCool > g_state.allowedCoolRange[1])
    g_state.desiredCool = g_state.allowedCoolRange[1];
  if (g_state.desiredHeat > g_state.allowedHeatRange[1])
    g_state.desiredHeat = g_state.allowedHeatRange[1];

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
  if (!g_pendingRequests.size)
    spinner.classList.add('hidden');
}

function updateTemp() {
  var onError = () => {
    updateState();
    alert('Update failed. Reload the page to be safe.');
  };

  roundTempValues(g_state);
  var postData = "";
  var postData = `${encodedValue('desiredHeat')}&${encodedValue('desiredCool')}&${encodedValue('desiredFanMode')}&duration=`;
  postData += encodeURIComponent(document.getElementById('duration').selectedOptions[0].value);

  fetchJson('updateTemp',
    `/thermostats/${g_thermostatId}/sethold`,
    updateState,
    onError,
    postData);
}

function updateMode() {
  var onError = () => {
    updateState();
    alert('Update failed. Reload the page to be safe.');
  };

  var newMode = document.getElementById('mode').selectedOptions[0].value;
  var postData = `mode=${encodeURIComponent(newMode)}`;

  fetchJson('updateMode',
    `/thermostats/${g_thermostatId}/setmode`,
    updateState,
    onError,
    postData);
}

var g_updateTimer;
var g_updateFreqency = 30000;

function startUpdates() {
  if (g_updateTimer)
    return;
  updateState();
  g_updateTimer = setInterval(updateState, g_updateFreqency);
}

function stopUpdates() {
  if (!g_updateTimer)
    return;
  clearInterval(g_updateTimer);
  g_updateTimer = null;
}

window.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('focus', startUpdates);
  window.addEventListener('blur', stopUpdates);
  window.addEventListener('visibilityChange', () => {
    if (document.visibilityState == 'visible')
      startUpdates();
    else
      stopUpdates();
  });

  if (document.visibilityState == 'visible')
    startUpdates();
});
