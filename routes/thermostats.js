var api = require('../ecobee-api');
var config = require('../config');
var tokenStore = require('../tokens');

function getThermostatArray(req, res, accessToken, callback) {
  var thermostatSummaryOptions = new api.ThermostatSummaryOptions();
  api.calls.thermostatSummary(accessToken, thermostatSummaryOptions, function(err, summary) {
    if (err) {
      console.log("Couldn't get thermostat summary:", err, summary);
      callback(err);
    } else {
      console.log('thermostatSummary:', summary)

      var thermostatArray = [];
      for( var i = 0; i < summary.revisionList.length; i ++) {
        var revisionArray = summary.revisionList[i].split(':');
        thermostatArray.push({ name: revisionArray[1], id: revisionArray[0]} );
      }

      callback(null, thermostatArray);
    }
  });
}

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

    getThermostatArray(req, res, tokens.access_token, function(err, thermostatArray) {
      if (err) {
        serveJsonLoginRedirect(res, "Couldn't refresh token.");
        return;
      }

      res.json({thermostats: thermostatArray});
    });
  });
};

exports.list = function(req, res){
  tokenStore.get((tokens) => {
    if (!tokens) {
      res.redirect('/login?next=' + req.originalUrl);
    } else {
      getThermostatArray(req, res, tokens.access_token, function(err, thermostatArray) {
        if (err) {
          res.redirect('/login?next=' + req.originalUrl);
          return;
        }

        res.render('thermostats/index', {thermostats: thermostatArray});
      });
    }
  });
};

function temperatureAsInt(temp) {
  return parseInt(temp, 10) * 10; // our canonical form is F * 10
}

exports.hold = function(req, res) {
  tokenStore.get((tokens) => {
    var thermostatId = req.params.id;
    var desiredCool = temperatureAsInt(req.param('desiredCool'));
    var desiredHeat = temperatureAsInt(req.param('desiredHeat'));
    var fan = req.param('desiredFanMode');
    var thermostats_update_options = new api.ThermostatsUpdateOptions(thermostatId)
    // cool_hold_temp, heat_hold_temp, hold_type, hold_hours
    // hold_type values: dateTime, nextTransition, indefinite, holdHours.
    // https://www.ecobee.com/home/developer/api/documentation/v1/functions/SetHold.shtml
    var functions_array = [new api.SetHoldFunction(desiredCool, desiredHeat, fan, 'nextTransition', null)];

    api.calls.updateThermostats(tokens.access_token, thermostats_update_options, functions_array, null, function(error) {
      var url = error ? '/login?next=' + req.originalUrl : '/thermostats/' + thermostatId;
      res.redirect(url);
    });
  });
}

exports.resume = function(req, res) {
  tokenStore.get((tokens) => {
    var thermostatId = req.params.id;
    var thermostats_update_options = new api.ThermostatsUpdateOptions(thermostatId);
    var resume_program_function = new api.ResumeProgramFunction();

    var functions_array = [];
    functions_array.push(resume_program_function);

    api.calls.updateThermostats(tokens.access_token, thermostats_update_options, functions_array, null, function(err) {
      if (err) {
        res.redirect('/login?next=' + req.originalUrl);
      } else {
        // TODO(ojan): WTF with this setTimeout.
        setTimeout(function() {
          res.redirect('/thermostats/' + thermostatId);
        }, 5000);
      }
    });
  });
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
    override: thermostat.events.length > 1 ? thermostat.events[0] : null,
    mode: thermostat.settings.hvacMode,
    name: thermostat.name,
    sensors: sensors.sort(sortByName),
    thermostatId: thermostat.identifier,
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
