var api = require('../ecobee-api')
  , config = require('../config');

function getThermostatArray(response, accessToken, callback) {
  var thermostatSummaryOptions = new api.ThermostatSummaryOptions();
  api.calls.thermostatSummary(accessToken, thermostatSummaryOptions, function(err, summary) {
    if(err) {
      console.log("Couldn't get thermostat summary:", err, summary);
      response.redirect('/login?next=' + req.originalUrl);
    } else {
      console.log('thermostatSummary:', summary)

      var thermostatArray = [];
      for( var i = 0; i < summary.revisionList.length; i ++) {
        var revisionArray = summary.revisionList[i].split(':');
        thermostatArray.push({ name : revisionArray[1], thermostatId : revisionArray[0]} );
      }

      callback(thermostatArray);
    }
  });
}

exports.list = function(req, res){
  var tokens = req.session.tokens;

  if (!tokens) {
    res.redirect('/login?next=' + req.originalUrl);
  } else {
    getThermostatArray(res, tokens.access_token, function(thermostatArray) {
      res.cookie('refreshtoken', tokens.refresh_token, { expires: new Date(Date.now() + 9000000)});
      res.render('thermostats/index', {thermostats : thermostatArray});
    });
  }
};

function tempAsInt(temp) {
  return parseInt(temp, 10) * 10; // our canonical form is F * 10
}

exports.hold = function(req, res) {
  var tokens = req.session.tokens
    , thermostatId = req.params.id
    , desiredCool = tempAsInt(req.param('desiredCool'))
    , desiredHeat = tempAsInt(req.param('desiredHeat'))
    , hvacMode = req.param('hvacmode')
    , thermostats_update_options = new api.ThermostatsUpdateOptions(thermostatId)

  var functions_array = [];
  var set_hold_function = new api.SetHoldFunction(desiredCool, desiredHeat,'indefinite', null);

  functions_array.push(set_hold_function);

  api.calls.updateThermostats(tokens.access_token, thermostats_update_options, functions_array, null, function(error) {
    if (error) {
      res.redirect('/login?next=' + req.originalUrl);
    } else {
      // we set a timeout since it takes some time to update a thermostat. One solution would be to use ajax
      // polling or websockets to improve this further.
      setTimeout(function() {
        res.redirect('/thermostats/' + thermostatId);
      }, 6000)
    }
  });
}

exports.resume = function(req, res) {
  var tokens = req.session.tokens
    , thermostatId = req.params.id
    , thermostats_update_options = new api.ThermostatsUpdateOptions(thermostatId)
    , resume_program_function = new api.ResumeProgramFunction();

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
}

exports.mode = function(req, res) {
  res.redirect('/thermostats');
}

function renderViewPage(response, thermostat, thermostatSummaryArray) {
  if (!thermostat || !thermostatSummaryArray)
    return;

  var currentTemp = Math.round(thermostat.runtime.actualTemperature / 10)
    , desiredHeat = Math.round(thermostat.runtime.desiredHeat / 10)
    , desiredCool = Math.round(thermostat.runtime.desiredCool / 10)
    , hvacMode = thermostat.settings.hvacMode
    , desiredTemp = null
    , isHold = false
    , thermostatId = thermostat.identifier
    , name = thermostat.name
    , template = null
    , isHold = thermostat.events.length > 0;

  response.render('thermostats/show', {
    thermostat : thermostat,
    thermostats : thermostatSummaryArray,
    currentTemp : currentTemp,
    desiredCool : desiredCool,
    desiredHeat : desiredHeat,
    hvacMode : hvacMode,
    isHold : isHold,
    thermostatId : thermostatId,
    name : name
  });
}

exports.view = function(req, res) {
  var tokens = req.session.tokens
    , thermostatId = req.params.id
    , thermostatsOptions = new api.ThermostatsOptions(thermostatId);
  if (!tokens) {
    res.redirect('/login?next=' + req.originalUrl);
  } else {
    var thermostatSummaryArray;
    var thermostat;

    getThermostatArray(res, tokens.access_token, function(thermostatArray) {
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
}