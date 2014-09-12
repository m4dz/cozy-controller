// Generated by CoffeeScript 1.8.0
var exec, fs;

fs = require('fs');

exec = require('child_process').exec;

module.exports.info = (function(_this) {
  return function(req, res, next) {
    var extractDataFromDfResult, extractValueFromDfValue, freeMemCmd, getCouchStoragePlace;
    freeMemCmd = "free | grep cache: | cut -d':' -f2 | sed -e 's/^ *[0-9]* *//'";
    extractValueFromDfValue = function(val) {
      var unit;
      unit = val[val.length - 1];
      val = val.substring(0, val.length - 1);
      val = val.replace(',', '.');
      if (unit === 'M') {
        val = "" + (parseFloat(val) / 1000);
      }
      if (unit === 'T') {
        val = "" + (parseFloat(val) * 1000);
      }
      return val;
    };
    extractDataFromDfResult = function(dir, resp) {
      var currentMountPoint, data, line, lineData, lines, mountPoint, _i, _len;
      data = {};
      lines = resp.split('\n');
      currentMountPoint = '';
      for (_i = 0, _len = lines.length; _i < _len; _i++) {
        line = lines[_i];
        line = line.replace(/[\s]+/g, ' ');
        lineData = line.split(' ');
        if (lineData.length > 5) {
          mountPoint = lineData[5];
          if (dir.indexOf(mountPoint) === 0 && currentMountPoint.length < mountPoint.length && mountPoint.length <= dir.length && mountPoint[0] === '/') {
            currentMountPoint = mountPoint;
            data.freeDiskSpace = extractValueFromDfValue(lineData[3]);
            data.usedDiskSpace = extractValueFromDfValue(lineData[2]);
            data.totalDiskSpace = extractValueFromDfValue(lineData[1]);
          }
        }
      }
      return data;
    };
    getCouchStoragePlace = function(callback) {
      var couchConfigFile, databaseDirLine;
      couchConfigFile = "/usr/local/etc/couchdb/local.ini";
      databaseDirLine = "database_dir";
      return fs.readFile(couchConfigFile, function(err, data) {
        var dir, line, lines, _i, _len;
        dir = '/';
        if (err == null) {
          lines = data.toString().split('\n');
          for (_i = 0, _len = lines.length; _i < _len; _i++) {
            line = lines[_i];
            if (line.indexOf(databaseDirLine) === 0) {
              dir = line.split('=')[1];
            }
          }
          return callback(null, dir.trim());
        } else {
          return callback(err);
        }
      });
    };
    return getCouchStoragePlace(function(err, dir) {
      return exec('df -h', function(err, resp) {
        if (err) {
          return res.send(500, err);
        } else {
          return res.send(200, extractDataFromDfResult(dir, resp));
        }
      });
    });
  };
})(this);
