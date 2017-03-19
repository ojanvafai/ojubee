/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var login = require('./routes/login');
var thermostats = require('./routes/thermostats');
var http = require('http');
var path = require('path');
var favicon = require('serve-favicon');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon(path.join(__dirname, 'public','img','favicon.ico'))); 
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('ecobee sample api app')); // using signed cookies to store the refresh token
  app.use(express.session());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

// Define all of the applicaiton endpoints for get and post
app.get('/', thermostats.list);

// check routes/login.js for the implementation details of the login routes
app.get('/login', login.list);  // login page
app.get('/login/getpin', login.getpin);  // login page
app.get('/login/error', login.error); // error page
app.post('/login', login.create);  // login post handler

// check routes/thermostats.js for the implementation details of the thermostat routes
app.post('/thermostats/:id/sethold', thermostats.hold);  // adjust a specific thermostat hold
app.post('/thermostats/:id/resume', thermostats.resume);  // resume a specific thermostat
app.post('/thermostats/:id/mode', thermostats.mode); // change the mode of a specific thermostats
app.get('/thermostats/:id', thermostats.view); // view a specific thermostat

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
