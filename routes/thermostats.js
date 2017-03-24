var api = require('../ecobee-api');
var config = require('../config');
var tokenStore = require('../tokens');

function serveJsonLoginRedirect(res, msg) {
  res.json({
    "error": msg,
    "redirectUrl": "/login?next=",
  });
}

exports.listJson = function(req, res) {
  tokenStore.get((tokens) => {
    if (!tokens) {
      serveJsonLoginRedirect(res, "No auth tokens");
      return;
    }

    var thermostatSummaryOptions = new api.ThermostatSummaryOptions();
    api.calls.thermostatSummary(tokens.access_token, thermostatSummaryOptions, function(err, summary) {
      if (err) {
        serveJsonLoginRedirect(res, "Couldn't get thermostat summary.");
        return;
      }

      var thermostatArray = [];
      for( var i = 0; i < summary.revisionList.length; i ++) {
        var revisionArray = summary.revisionList[i].split(':');
        thermostatArray.push({ name: revisionArray[1], id: revisionArray[0]} );
      }

      res.json({thermostats: thermostatArray});
    });
  });
};

function temperatureAsInt(temp) {
  return parseInt(temp, 10) * 10; // our canonical form is F * 10
}

function updateThermostats(req, res, updateFunction) {
  tokenStore.get((tokens) => {
    var thermostatId = req.params.id;
    var thermostats_update_options = new api.ThermostatsUpdateOptions(thermostatId);
    var functions_array = [updateFunction];

    api.calls.updateThermostats(tokens.access_token, thermostats_update_options, functions_array, null, (err, val) => {
      if (err)
        serveJsonLoginRedirect(res, "Couldn't update thermostats.");
      else
        res.json(val);
    });
  });
}

exports.hold = function(req, res) {
  var desiredCool = temperatureAsInt(req.param('desiredCool'));
  var desiredHeat = temperatureAsInt(req.param('desiredHeat'));
  var fan = req.param('desiredFanMode');
  // cool_hold_temp, heat_hold_temp, hold_type, hold_hours
  // hold_type values: dateTime, nextTransition, indefinite, holdHours.
  // https://www.ecobee.com/home/developer/api/documentation/v1/functions/SetHold.shtml
  var updateFunction = new api.SetHoldFunction(desiredCool, desiredHeat, fan, 'nextTransition', null);
  updateThermostats(req, res, updateFunction);
}

exports.resume = function(req, res) {
  var updateFunction = new api.ResumeProgramFunction();
  updateThermostats(req, res, updateFunction);
}

function sortByName(a, b) {
  if (a.name > b.name)
    return 1;
  if (a.name < b.name)
    return -1;
  return 0;
}

function serveViewJson(req, res, thermostatList) {
  var thermostat = thermostatList[0];

  var sensors = [];
  thermostat.remoteSensors.forEach((sensor) => {
    sensor.capability.forEach((capability) => {
      if (capability.type == 'temperature')
        sensors.push({
          name: sensor.name,
          temp: parseInt(capability.value, 10) / 10,
        });
    })
  });

  res.json({
    currentTemp: thermostat.runtime.actualTemperature / 10,
    desiredCool: thermostat.runtime.desiredCool / 10,
    desiredHeat: thermostat.runtime.desiredHeat / 10,
    desiredFanMode: thermostat.runtime.desiredFanMode,
    overrideTime: thermostat.events.length > 1 ? thermostat.events[0]['endTime'] : null,
    mode: thermostat.settings.hvacMode,
    name: thermostat.name,
    sensors: sensors.sort(sortByName),
    thermostatId: thermostat.identifier,
    equipmentStatus: thermostat.equipmentStatus,
  });
}

exports.json = (req, res) => {
  tokenStore.get((tokens) => {
    if (!tokens) {
      serveJsonLoginRedirect(res, "No auth tokens");
      return;
    }

    var thermostatId = req.params.id;
    var thermostatsOptions = new api.ThermostatsOptions(thermostatId);

    api.calls.thermostats(tokens.access_token, thermostatsOptions, function(err, thermostats) {
      if (err) {
        serveJsonLoginRedirect(res, "Couldn't refresh token.");
        return;
      }
      serveViewJson(req, res, thermostats.thermostatList);
    });
  });
}

exports.view = function(req, res) {
  tokenStore.get((tokens) => {
    if (tokens)
      res.render('thermostats/show');
    else
      res.redirect('/login?next=' + req.originalUrl);
  });
}
