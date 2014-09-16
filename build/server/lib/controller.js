// Generated by CoffeeScript 1.7.0
var App, drones, fs, installDependencies, npm, repo, running, spawner, stack, stackApps, startApp, type, user,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

fs = require('fs');

spawner = require('./spawner');

npm = require('./npm');

repo = require('./repo');

user = require('./user');

stack = require('./stack');

type = [];

type['git'] = require('./git');

App = require('./app').App;

drones = [];

running = [];

stackApps = ['home', 'data-system', 'proxy'];

startApp = (function(_this) {
  return function(app, callback) {
    if (running[app.name] != null) {
      return callback('Application already exists');
    } else {
      return spawner.start(app, function(err, result) {
        if (err != null) {
          return callback(err);
        } else if (result == null) {
          err = new Error('Unknown error from Spawner.');
          return callback(err);
        } else {
          drones[app.name] = result.pkg;
          running[app.name] = result;
          return callback(null, result);
        }
      });
    }
  };
})(this);

installDependencies = (function(_this) {
  return function(app, test, callback) {
    test = test - 1;
    return npm.install(app, function(err) {
      if ((err != null) && test === 0) {
        return callback(err);
      } else if (err != null) {
        return installDependencies(app, test, callback);
      } else {
        return callback();
      }
    });
  };
})(this);

module.exports.install = (function(_this) {
  return function(manifest, callback) {
    var app;
    app = new App(manifest);
    app = app.app;
    if ((drones[app.name] != null) || fs.existsSync(app.dir)) {
      console.log("" + app.name + ":already installed");
      console.log("" + app.name + ":start application");
      return startApp(app, callback);
    } else {
      return user.create(app, function() {
        console.log("" + app.name + ":create directory");
        return repo.create(app, function(err) {
          if (err != null) {
            callback(err);
          }
          console.log("" + app.name + ":git clone");
          return type[app.repository.type].init(app, function(err) {
            if (err != null) {
              return callback(err);
            } else {
              console.log("" + app.name + ":npm install");
              return installDependencies(app, 2, function(err) {
                var _ref;
                if (err != null) {
                  return callback(err);
                } else {
                  console.log("" + app.name + ":start application");
                  if (_ref = app.name, __indexOf.call(stackApps, _ref) >= 0) {
                    stack.addApp(app, function(err) {
                      return console.log(err);
                    });
                  }
                  drones[app.name] = app;
                  return startApp(app, callback);
                }
              });
            }
          });
        });
      });
    }
  };
})(this);

module.exports.start = function(manifest, callback) {
  var app, err;
  app = new App(manifest);
  app = app.app;
  if ((drones[app.name] != null) || fs.existsSync(app.dir)) {
    return startApp(app, (function(_this) {
      return function(err, result) {
        if (err != null) {
          return callback(err);
        } else {
          return callback(null, result);
        }
      };
    })(this));
  } else {
    err = new Error('Cannot start an application not installed');
    return callback(err);
  }
};

module.exports.stop = function(name, callback) {
  var err, onErr, onStop;
  if (running[name] != null) {
    onStop = (function(_this) {
      return function() {
        delete running[name];
        return callback(null, name);
      };
    })(this);
    onErr = (function(_this) {
      return function(err) {
        return callback(err, name);
      };
    })(this);
    running[name].monitor.once('stop', onStop);
    running[name].monitor.once('exit', onStop);
    running[name].monitor.once('error', onErr);
    try {
      running[name].monitor.stop();
      return console.log("callback stop");
    } catch (_error) {
      err = _error;
      console.log(err);
      callback(err, name);
      return onErr(err);
    }
  } else {
    err = new Error('Cannot stop an application not started');
    return callback(err);
  }
};

module.exports.stopAll = function(callback) {
  var name, onErr, onStop, _i, _len, _ref;
  console.log(Object.keys(running));
  _ref = Object.keys(running);
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    name = _ref[_i];
    console.log("" + name + ":stop application");
    onStop = (function(_this) {
      return function() {
        delete running[name];
        return console.log('onStop');
      };
    })(this);
    onErr = (function(_this) {
      return function(err) {
        return running[name].removeListener('stop', onStop);
      };
    })(this);
    running[name].monitor.once('stop', onStop);
    running[name].monitor.once('exit', onStop);
    running[name].monitor.once('error', onErr);
    running[name].monitor.stop();
  }
  return callback();
};

module.exports.uninstall = function(name, callback) {
  var app, err;
  if (running[name] != null) {
    console.log("" + name + ":stop application");
    running[name].monitor.stop();
    delete running[name];
  }
  if (__indexOf.call(stackApps, name) >= 0) {
    console.log("" + name + ":remove from stack.json");
    stack.removeApp(name, function(err) {
      return console.log(err);
    });
  }
  if (drones[name] != null) {
    app = drones[name];
    return repo["delete"](app, (function(_this) {
      return function(err) {
        console.log("" + name + ":delete directory");
        delete drones[name];
        if (err) {
          callback(err);
        }
        return callback(null, name);
      };
    })(this));
  } else {
    err = new Error('Application is not installed');
    console.log(err);
    return callback(err);
  }
};

module.exports.update = function(name, callback) {
  var app, restart;
  restart = false;
  if (running[name] != null) {
    console.log("" + name + ":stop application");
    running[name].stop();
    restart = true;
  }
  app = drones[name];
  console.log("" + name + ":update application");
  return type[app.repository.type].update(app, (function(_this) {
    return function(err) {
      if (err != null) {
        callback(err);
      }
      if (restart) {
        return startApp(app, function(err, result) {
          console.log("" + name + ":start application");
          if (err != null) {
            callback(err);
          }
          return callback(null, result);
        });
      } else {
        return callback(null, app);
      }
    };
  })(this));
};

module.exports.addDrone = function(app, callback) {
  drones[app.name] = app;
  return callback();
};

module.exports.all = function(callback) {
  return callback(null, drones);
};

module.exports.running = function(callback) {
  var app, apps, _i, _len;
  apps = [];
  for (_i = 0, _len = drones.length; _i < _len; _i++) {
    app = drones[_i];
    if (running[app.name] != null) {
      apps[app.name] = app;
    }
  }
  return callback(null, apps);
};