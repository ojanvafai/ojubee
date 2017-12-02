var querystring = {
  stringify: (obj) => {
    var out = [];
    for (let entry of Object.entries(obj)) {
      out.push(encodeURIComponent(entry[0]) + '=' + encodeURIComponent(entry[1]));
    }
    return out.join('&');
  }
};

var config = {};
config.appKey = 'WWiotjboBZKj9Bhf5KoZkxVwG5jZ8bau';
config.ecobeeHost = 'www.ecobee.com';
config.ecobeePort = '443';
config.isHTTPS = true;
config.scope = 'smartWrite';
config.GCLOUD_PROJECT = "oju-bee";

var api = api || {};

var inMemoryCache = {};

api.calls = {
  host: config.ecobeeHost,
  port: config.ecobeePort,
  apiRoot:'/api/1/',

  makeRequest: function(options, dataString, callback) {
    let params = {
      url: `https://${options.host}${options.path}`
    };

    if (options.method == 'GET')
      params.url += '?' + dataString;
    else
      params.data = dataString;

    let url = "https://l1cc9htdah.execute-api.us-east-1.amazonaws.com/prod/ojubee?" +
      querystring.stringify(params);

    // TODO: Switch to fetch once it supports cancellation.
    let request = new XMLHttpRequest();

    request.addEventListener("load", () => {
      let response;
      var contentType = request.getResponseHeader("content-type");
      if (contentType && contentType.includes("application/json"))
        response = JSON.parse(request.response);
      else
        response = request.response;
      callback(null, response);
    });

    request.addEventListener("error", () => {
      callback(request.statusText, null);
    });

    request.open(options.method, url, true);

    if (options.method == 'GET')
      request.send();
    else
      request.send(dataString);

    return request;
  },
  /**
   * get a new pin for an application. The Client id is the api key assigned to the
   * application
   */
  getPin: function(client_id, scope, callback) {
    var options = {
      host: this.host,
      port: this.port,
      path: '/home/authorize',
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    };

    var data = {
      response_type: 'ecobeePin',
      scope: scope,
      client_id: client_id
    };
    var dataString = querystring.stringify(data);
    return this.makeRequest(options, dataString, callback);
  },
  /**
   * Attempt to register a pin once the app has been added on the
   * ecobee app portal
   */
  registerPin: function(client_id, auth_code, callback) {
    var options = {
      host: this.host,
      port: this.port,
      path: '/home/token',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    var data = {
      code: auth_code,
      client_id: client_id,
      grant_type: 'ecobeePin'
    };

    var dataString = querystring.stringify(data);
    return this.makeRequest(options, dataString, callback);
  },
  /**
   * Register Call to obtain a token from user credentials
   * callback signature callback(error, data)
   */
  register: function(registerOptions, callback) {
    if(!registerOptions) {
      registerOptions = new api.RegisterOptions();
    }
    var data = {
      response_type: 'ecobeeAuthz',
      client_id: registerOptions.appKey,
      scope: registerOptions.scope,
      username: registerOptions.username,
      password: registerOptions.password
    }

    var options = {
      host: this.host,
      port: this.port,
      path: '/home/authorize',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    var dataString = querystring.stringify(data);
    return this.makeRequest(options, dataString, callback);
  },
  /**
   * Use a refresh token to get a new set of tokens from the server
   */
  refresh: function(refresh_token, callback) {
    var data = {
      grant_type: 'refresh_token',
      code: refresh_token,
      client_id: config.appKey
    }

    var options = {
      host: this.host,
      port: this.port,
      path: '/home/token',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    var dataString = querystring.stringify(data);
    this.makeRequest(options, dataString, callback);
  },
  /**
   * get the summary for the thermostats associated wtih an account
   * All options are passed in the a ThermostatSummaryOptions object
   */
  thermostatSummary: function(token, thermostatSummaryOptions, callback) {
    var wrappedCallback;
    var storageKey = 'thermostatSummary';

    var cacheResultFn = function(err, data) {
      inMemoryCache[storageKey] = data;
    };

    var cachedSummary = inMemoryCache[storageKey];
    if (cachedSummary) {
      setTimeout(() => { callback(null, cachedSummary) });
      wrappedCallback = cacheResultFn;
    } else {
      wrappedCallback = function(err, data) {
        cacheResultFn(err, data);
        callback(err, data);
      }
    }

    if(!thermostatSummaryOptions) {
      thermostatSummaryOptions = new api.thermostatSummaryOptions();
    }

    var data = {
      json: JSON.stringify(thermostatSummaryOptions),
      token: token
    }

    var options = {
      host: this.host,
      port: this.port,
      path: '/home' + this.apiRoot + 'thermostatSummary',
      method: 'GET',
      headers: {
        Accept:'application/json',
        Authorization: 'Bearer ' + token
      }
    };

    var dataString = querystring.stringify(data);
    return this.makeRequest(options, dataString, wrappedCallback);
  },
  /**
   * get all alerts for a given account. This has not been ported over to node yet
   */
  alerts: function(token, alerts_options, callback) {
    if(!alerts_options) {
      alerts_options = new api.AlertsOptions();
    }

    // $.ajax({
    //   data: {
    //     json: JSON.stringify(alerts_options),
    //     token: token
    //   },

    //   dataType: 'json',

    //   contentType:'application/json',
    //   cache: false,
    //   type: 'GET',
    //   timeout:30000,
    //   headers: {
    //     Authorization: 'Bearer ' + token
    //   },
    //   url: api.api.server + api.api.apiRoot + 'alert',

    //   error: function(req, stat, err) {
  //               try{
  //                 var error = that.createError(req);
  //                 callback(error);
  //               }catch(e){
  //                 callback(new Error('timeout'));
  //                   //var err = new api.api.error.AppError('Exception: '+e);
  //                   //err.setState(args.state);
  //                   //err.postErrorToServer();
  //               }
  //           },

    //   success: function(data, stat, req) {
    //     if(!data) {
    //       callback(new Error('no data returned'));
    //     } else {
    //       callback(null, data);
    //     }
    //   }
    // });
  },
  /**
   * gets thermostats defined by the ThermostatsOptions object.
   */
  thermostats: function(token, thermostats_options, callback) {
    if(!thermostats_options) {
      thermostats_options = new api.ThermostatsOptions();
    }

    var data = {
      json: JSON.stringify(thermostats_options),
      token: token
    }

    var options = {
      host: this.host,
      port: this.port,
      path: '/home' + this.apiRoot + 'thermostat',
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer ' + token
      }
    };

    var dataString = querystring.stringify(data);
    return this.makeRequest(options, dataString, callback);
  },
  /**
   * updates thermostats based on the ThermostatsUpdateOptions object
   * Many common update actions have an associated function which are passed in an array
   * so that multiple updates can be completed at one time.
   * updates are completed in order they appear in the functions array
   */
  updateThermostats: function(token, thermostats_update_options, callback) {
    var dataString = JSON.stringify(thermostats_update_options);

    var options = {
      host: this.host,
      port: this.port,
      path: '/home' + this.apiRoot + 'thermostat?json=true&token=' + token,
      method: 'POST',
      headers: {
        Accept:'application/json',
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    };

    return this.makeRequest(options, dataString, callback);
  }
};

api.Options = function(){};

api.Options.prototype = {
};
/**
 * Register options that can be passed to a register call
 */
api.RegisterOptions = function(username, password, appKey, scope) {
  this.username  = username || 'default@default.com';
  this.password = password || 'deadbeef';
  this.appKey = config.appKey || 'defaultappkey';
  this.scope = config.scope || 'smart';
};
/**
 * Alert options that can control how the alerts call functions
 */
api.AlertsOptions = function() {
  var ms_day = 86400000,
  number_of_days = 31,
  go_back_by = number_of_days * ms_day,
  end_date = new Date(),
  start_date = new Date(end_date.getTime() - go_back_by);

  this.startDate = start_date.getFullYear()+'-'+(start_date.getMonth()+1)+'-'+start_date.getDate();
  this.endDate = end_date.getFullYear()+'-'+(end_date.getMonth()+1)+'-'+end_date.getDate();
  this.selection = {
    selectionType: 'managementSet',
    selectionMatch: '/'
  };

  function validate(date) {
  }
};
/**
 * Thermostat Options which control how the thermostat call functions
 */
api.ThermostatsOptions = function(thermostat_ids) {
  this.selection = {
    selectionType: 'thermostats',
    selectionMatch: thermostat_ids,
    includeEquipmentStatus: true,
    includeEvents: true,
    includeProgram: true,
    includeSettings: true,
    includeRuntime: true,
    includeAlerts: true,
    includeSensors: true,
    includeWeather: true
  }
};
// Change HVAC mode.
api.ModeUpdateSettings = function(mode) {
  this.settings = {
    "hvacMode": mode,
  };
};
/**
 * update options that control how the thermostats update call behaves
 * Functions get pushed into the functions array which are defined
 * farther down.
 */
api.ThermostatsUpdateOptions = function(thermostat_ids, opt_functions, opt_thermostat) {
  this.selection = {
    selectionType: 'thermostats',
    selectionMatch: thermostat_ids
  };

  if (opt_functions)
    this.functions = opt_functions;

  if (opt_thermostat)
    this.thermostat = opt_thermostat;
};
/**
 * options to pass to the summary call
 */
api.ThermostatSummaryOptions = function() {
  this.selection = {
    selectionType: 'registered',
    selectionMatch: null
  }
};
/**
 * Function passed to the thermostatsUpdate call to resume a program.
 */
api.ResumeProgramFunction = function() {
  this.type = 'resumeProgram'
}
/**
 * Function passed to the thermostatsUpdate call to send a message to the thermostat
 */
api.SendMessageFunction = function(text) {
  this.type = 'sendMessage';
  this.params = {
    text: text
  };
};
/**
 * Function passed to the thermostatsUpdate call to acknowledge an alert
 */
api.AcknowledgeFunction = function(thermostat_id, acknowledge_ref, acknowledge_type, remind_later) {
  this.type = 'acknowledge';

  this.params = {
    thermostatIdentifier: thermostat_id,
    ackRef: acknowledge_ref,
    ackType: acknowledge_type,
    remindMeLater: remind_later
  }

  //Values for ack_type: accept, decline, defer, unacknowledged.
}
/**
 * Function passed to the thermostatsUpdate set the occupied state of the thermostat
 * EMS only.
 */
api.SetOccupiedFunction = function(is_occupied, hold_type) {
  this.type = 'setOccupied';
  this.params = {
    occupied: is_occupied,
    holdType: hold_type
  }
};
/**
 * Function passed to the thermostatsUpdate call to set a temperature hold. Need to pass both
 * temperature params.
 */
api.SetHoldFunction = function(cool_hold_temp, heat_hold_temp, fan, hold_type, hold_hours) {
  this.type = 'setHold';

  var isHours = hold_type != 'nextTransition' && hold_type != 'indefinite';

  this.params = {
    coolHoldTemp: cool_hold_temp,
    heatHoldTemp: heat_hold_temp,
    holdType: isHours ? 'holdHours' : hold_type,
    fan: fan,
  }

  if (isHours)
    this.params.holdHours = hold_type;
}
/**
 * get the hierarchy for EMS thermostats based on the node passed in
 * default node is the root level. EMS Only.
 */
api.ManagementSet = function(node) {
  this.selection = {
    selectionType: 'managementSet',
    selectionMatch: node || '/'
  }
}
/**
 * Object that represents a climate.
 */
api.ClimateObject = function(climate_data) {
  return {
    name: climate_data.name,
    climateRef: climate_data.climateRef,
    isOccupied: climate_data.isOccupied,
    coolFan: climate_data.coolFan,
    heatFan: climate_data.heatFan,
    vent: climate_data.vent,
    ventilatorMinOnTime: climate_data.ventilatorMinOnTime,
    owner: climate_data.owner,
    type: climate_data.type,
    coolTemp: climate_data.coolTemp,
    heatTemp: climate_data.heatTemp
  }
}
/**
 * Represents a program and various actions that can be performed on one
 */
api.ProgramObject = function(schedule_object, climates_array) {
  return {
    schedule: schedule_object,
    climates: climates_array,
    getProgram: function() {
      return {
        schedule: this.schedule.schedule,
        climates: this.climates
      };
    },
    validate: function() {
      var climateHash = {},
        climateIndex,
        dayIndex,
        timeIndex;

      for(climateIndex in this.climates) {
        if(climateHash[this.climates[climateIndex].climateRef]) {
          throw new Error('duplicate climate refs exist: ' + this.climates[climateIndex].climateRef);
        }
        climateHash[this.climates[climateIndex].climateRef] = true;
      }

      for(dayIndex in schedule) {
        for(timeIndex in shedule[dayIndex]) {
          if(!climateHash[schedule[dayIndex][timeIndex]]) {
            throw new Error('invalid program. ' + schedule[dayIndex][timeIndex] + ' climate does not exist');
          }
        }
      }

      return true;
    }
  }
}
/**
 * holds the schedule that goes with a program. Each item in the schedule array is a string climateRef that points
 * to a climate obnject
 */
api.ScheduleObject = function(scheduleArray) {

  return {schedule: scheduleArray || [
            [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]
            ],
    getSchedule: function() {
      return this.schedule;
    },
    updateScheduleNode: function(dayIndex, timeIndex, climateRef) {

      this.schedule[dayIndex][timeIndex] = climateRef;
    },
    getScheduleNode: function(dayIndex, timeIndex) {
      return this.shedule[dayIndex][timeIndex];
    }
  };
};
