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

exports.list = function(req, res){
  tokenStore.get((tokens) => {
    if (!tokens)
      res.redirect('/login?next=' + req.originalUrl);
    else
      res.render('thermostats/index');
  });
};

function temperatureAsInt(temp) {
  return parseInt(temp, 10) * 10; // our canonical form is F * 10
}

function updateThermostats(req, res, options) {
  tokenStore.get((tokens) => {
    if (!tokens) {
      serveJsonLoginRedirect(res, "No auth tokens");
      return;
    }

    api.calls.updateThermostats(tokens.access_token, options, (err, val) => {
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
  var duration = req.param('duration');
  // hold_type values: dateTime, nextTransition, indefinite, holdHours.
  // https://www.ecobee.com/home/developer/api/documentation/v1/functions/SetHold.shtml
  var updateFunction = new api.SetHoldFunction(desiredCool, desiredHeat, fan, duration);
  var options = new api.ThermostatsUpdateOptions(req.params.id, [updateFunction]);
  updateThermostats(req, res, options);
}

exports.resume = function(req, res) {
  var updateFunction = new api.ResumeProgramFunction();
  var options = new api.ThermostatsUpdateOptions(req.params.id, [updateFunction]);
  updateThermostats(req, res, options);
}

exports.mode = function(req, res) {
  var thermostats_update_options = new api.ThermostatsUpdateOptions(req.params.id);
  var settings = new api.ModeUpdateSettings(req.param('mode'));
  var options = new api.ThermostatsUpdateOptions(req.params.id, null, settings);
  updateThermostats(req, res, options);
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

  var overrideTime;
  if (thermostat.events.length > 1) {
    // TODO: Probably shouldn't hard code this and instead just check
    // if the data is more than a year out.
    if (thermostat.events[0]['endDate'] == '2035-01-01') {
      overrideTime = '∞';
    } else {
      var endTime = thermostat.events[0]['endTime'];
      var parts = endTime.split(':');
      var hours = Number(parts[0]);
      var minutes = parts[1];
      var suffix;
      if (hours < 12) {
        suffix = 'AM';
        if (hours == 00)
          hours = 12;
      } else {
        suffix = 'PM';
        if (hours != 12)
          hours -= 12;
      }

      overrideTime = `${hours}:${minutes} ${suffix}`;
    }
  }

  res.json({
    currentTemp: thermostat.runtime.actualTemperature / 10,
    desiredCool: thermostat.runtime.desiredCool / 10,
    desiredHeat: thermostat.runtime.desiredHeat / 10,
    desiredFanMode: thermostat.runtime.desiredFanMode,
    overrideTime: overrideTime,
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
