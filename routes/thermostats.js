var api = require('../ecobee-api');
var config = require('../config');
var tokenStore = require('../tokens');

function getThermostatArray(req, res, accessToken, callback) {
  var thermostatSummaryOptions = new api.ThermostatSummaryOptions();
  api.calls.thermostatSummary(accessToken, thermostatSummaryOptions, function(err, summary) {
    if (err) {
      console.log("Couldn't get thermostat summary:", err, summary);
      res.redirect('/login?next=' + req.originalUrl);
    } else {
      console.log('thermostatSummary:', summary)

      var thermostatArray = [];
      for( var i = 0; i < summary.revisionList.length; i ++) {
        var revisionArray = summary.revisionList[i].split(':');
        thermostatArray.push({ name: revisionArray[1], thermostatId: revisionArray[0]} );
      }

      callback(thermostatArray);
    }
  });
}

exports.list = function(req, res){
  tokenStore.get((tokens) => {
    if (!tokens) {
      res.redirect('/login?next=' + req.originalUrl);
    } else {
      getThermostatArray(req, res, tokens.access_token, function(thermostatArray) {
        res.cookie('refreshtoken', tokens.refresh_token, { expires: new Date(Date.now() + 9000000)});
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
    var thermostats_update_options = new api.ThermostatsUpdateOptions(thermostatId)
    // cool_hold_temp, heat_hold_temp, hold_type, hold_hours
    // hold_type values: dateTime, nextTransition, indefinite, holdHours.
    // https://www.ecobee.com/home/developer/api/documentation/v1/functions/SetHold.shtml
    var functions_array = [new api.SetHoldFunction(desiredCool, desiredHeat, 'nextTransition', null)];

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
        setTimeout(function() {
          res.redirect('/thermostats/' + thermostatId);
        }, 5000);
      }
    });
  });
}

exports.mode = function(req, res) {
  res.redirect('/');
}

function renderViewPage(response, thermostat, thermostatSummaryArray) {
  if (!thermostat || !thermostatSummaryArray)
    return;

  var currentTemp = Math.round(thermostat.runtime.actualTemperature / 10);
  var desiredHeat = Math.round(thermostat.runtime.desiredHeat / 10);
  var desiredCool = Math.round(thermostat.runtime.desiredCool / 10);
  var hvacMode = thermostat.settings.hvacMode;
  var desiredTemp = null;
  var isHold = false;
  var thermostatId = thermostat.identifier;
  var name = thermostat.name;
  var template = null;
  var isHold = thermostat.events.length > 0;

  response.render('thermostats/show', {
    thermostat: thermostat,
    thermostats: thermostatSummaryArray,
    currentTemp: currentTemp,
    desiredCool: desiredCool,
    desiredHeat: desiredHeat,
    hvacMode: hvacMode,
    isHold: isHold,
    thermostatId: thermostatId,
    name: name
  });
}

exports.view = function(req, res) {
  tokenStore.get((tokens) => {
    var thermostatId = req.params.id;
    var thermostatsOptions = new api.ThermostatsOptions(thermostatId);

    if (!tokens) {
      res.redirect('/login?next=' + req.originalUrl);
    } else {
      var thermostatSummaryArray;
      var thermostat;

      getThermostatArray(req, res, tokens.access_token, function(thermostatArray) {
        thermostatSummaryArray = thermostatArray;
        renderViewPage(res, thermostat, thermostatSummaryArray);
      });

      api.calls.thermostats(tokens.access_token, thermostatsOptions, function(err, thermostats) {
        if (err) {
          res.redirect('/');
        } else {
          thermostat = thermostats.thermostatList[0];
          renderViewPage(res, thermostat, thermostatSummaryArray);
        }
      });
    }
  });
}
