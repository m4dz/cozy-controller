// Generated by CoffeeScript 1.9.0
var config, controller, exec, forever, fs, log, path, token;

forever = require('forever-monitor');

fs = require('fs');

path = require('path');

exec = require('child_process').exec;

token = require('../middlewares/token');

controller = require('../lib/controller');

log = require('printit')();

config = require('../lib/conf').get;


/*
    Start application <app> with forever-monitor and carapace
 */

module.exports.start = function(app, callback) {
  var env, environment, foreverOptions, key, pwd, result, _i, _j, _len, _len1, _ref, _ref1, _ref2, _ref3, _ref4;
  result = {};
  if (this.process) {
    this.process.stop();
  }
  if ((_ref = app.name) === "home" || _ref === "proxy" || _ref === "data-system") {
    pwd = token.get();
  } else {
    pwd = app.password;
  }
  env = {
    NAME: app.name,
    TOKEN: pwd,
    USER: app.user,
    USERNAME: app.user,
    HOME: app.dir,
    NODE_ENV: process.env.NODE_ENV
  };
  if (process.env.DB_NAME != null) {
    env.DB_NAME = process.env.DB_NAME;
  }
  if ((_ref1 = config("env")) != null ? _ref1[app.name] : void 0) {
    environment = config("env")[app.name];
    _ref2 = Object.keys(environment);
    for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
      key = _ref2[_i];
      env[key] = environment[key];
    }
  }
  if ((_ref3 = config("env")) != null ? _ref3.global : void 0) {
    environment = config("env").global;
    _ref4 = Object.keys(environment);
    for (_j = 0, _len1 = _ref4.length; _j < _len1; _j++) {
      key = _ref4[_j];
      env[key] = environment[key];
    }
  }
  foreverOptions = {
    fork: true,
    silent: true,
    max: 5,
    stdio: ['ipc', 'pipe', 'pipe'],
    cwd: app.dir,
    logFile: app.logFile,
    outFile: app.logFile,
    errFile: app.logFile,
    env: env,
    killTree: true,
    killTTL: 0,
    command: 'node'
  };
  if (fs.existsSync(app.logFile)) {
    app.backup = app.logFile + "-backup";
    if (fs.existsSync(app.backup)) {
      fs.unlink(app.backup);
    }
    fs.rename(app.logFile, app.backup);
  }
  fs.openSync(app.logFile, 'w');
  foreverOptions.options = ['--plugin', 'net', '--plugin', 'setuid', '--setuid', app.user];
  if (app.name === "proxy") {
    foreverOptions.options = foreverOptions.options.concat(['--bind_ip', config('bind_ip_proxy')]);
  }
  return fs.readFile(app.dir + "/package.json", 'utf8', function(err, data) {
    var carapaceBin, onError, onExit, onPort, onRestart, onStart, onStderr, onTimeout, process, responded, server, start, timeout, _ref5;
    data = JSON.parse(data);
    server = app.server;
    if (((_ref5 = data.scripts) != null ? _ref5.start : void 0) != null) {
      start = data.scripts.start.split(' ');
      app.startScript = path.join(app.dir, start[1]);
      if (start[0] === "coffee") {
        foreverOptions.options = foreverOptions.options.concat(['--plugin', 'coffee']);
      }
    }
    if ((start == null) && server.slice(server.lastIndexOf("."), server.length) === ".coffee") {
      foreverOptions.options = foreverOptions.options.concat(['--plugin', 'coffee']);
    }
    fs.stat(app.startScript, function(err, stats) {
      if (err != null) {
        return callback(err);
      }
    });
    foreverOptions.options.push(app.startScript);
    carapaceBin = path.join(require.resolve('cozy-controller-carapace'), '..', '..', 'bin', 'carapace');
    process = new forever.Monitor(carapaceBin, foreverOptions);
    responded = false;
    onExit = function() {
      app.backup = app.logFile + "-backup";
      fs.rename(app.logFile, app.backup);
      process.removeListener('error', onError);
      clearTimeout(timeout);
      log.error('Callback on Exit');
      if (callback) {
        return callback(new Error(app.name + " CANT START"));
      } else {
        log.error(app.name + " HAS FAILLED TOO MUCH");
        return setTimeout((function() {
          return process.exit(1);
        }), 1);
      }
    };
    onError = function(err) {
      if (!responded) {
        err = err.toString();
        responded = true;
        callback(err);
        process.removeListener('exit', onExit);
        process.removeListener('message', onPort);
        return clearTimeout(timeout);
      }
    };
    onStart = function(monitor, data) {
      return result = {
        monitor: process,
        process: monitor.child,
        data: data,
        pid: monitor.childData.pid,
        pkg: app
      };
    };
    onRestart = function() {
      return log.info(app.name + ":restart");
    };
    onTimeout = function() {
      process.removeListener('exit', onExit);
      process.stop();
      controller.removeRunningApp(app.name);
      err = new Error('Error spawning drone');
      log.error('callback timeout');
      return callback(err);
    };
    onPort = function(info) {
      if (!responded && (info != null ? info.event : void 0) === 'port') {
        responded = true;
        result.port = info.data.port;
        callback(null, result);
        process.removeListener('exit', onExit);
        process.removeListener('error', onError);
        process.removeListener('message', onPort);
        return clearTimeout(timeout);
      }
    };
    onStderr = function(err) {
      err = err.toString();
      return fs.appendFile(app.logFile, err, function(err) {
        if (err != null) {
          return console.log(err);
        }
      });
    };
    process.start();
    timeout = setTimeout(onTimeout, 8000000);
    process.once('exit', onExit);
    process.once('error', onError);
    process.once('start', onStart);
    process.on('restart', onRestart);
    process.on('message', onPort);
    return process.on('stderr', onStderr);
  });
};
