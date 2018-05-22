/**
 * A library for storing and rotating logs
 */

// Depenencies
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Container for the module.
const lib = {};

lib.baseDir = path.join(__dirname, '/../.logs/');

// Append a string to a file, create the file if it does not exist.
lib.append = function(file, str, callback) {
  // Open the file for appending
  fs.open(lib.baseDir + file + '.log', 'a', function(err, fileDescriptor) {
    if(!err && fileDescriptor) {
      fs.appendFile(fileDescriptor, str + '\n', function(err) {
        if(!err) {
          fs.close(fileDescriptor, function(err) {
            if(!err) {
              callback(false);
            } else {
              callback('Error: Could not close the file that was being appended.')
            }
          })
        } else {
          callback('Error: Could not append to file');
        }
      })
    } else {
      callback('Error: Could not open file for appending.')
    }
  })
};

// List all of the logs, and optionally include the compressed logs.
lib.list = function(includeCompressedLogs, callback) {
  fs.readdir(lib.baseDir, function(err, data) {
    if(!err && data) {
      const trimmedNames = [];
      data.forEach(function(fileName) {
        // Add the .log files
        if(fileName.indexOf('.log') > -1) {
          trimmedNames.push(fileName.replace('.log', ''));
        }

        // Optionally add on the compressed files .gz files to this array
        if(fileName.indexOf('.gz.b64') > -1 && includeCompressedLogs) {
          trimmedNames.push(fileName.replace('.gz.b64', ''));
        }
      });
      callback(false, trimmedNames)
    } else {
      callback(err, data);
    }
  });
};

// Compress the contents of one .log file into a .gz.b64 file within the same directory.
lib.compress = function(logId, newFileId, callback) {
  const sourceFile = logId + '.log';
  const destFile = newFileId + '.gz.b64';

  fs.readFile(lib.baseDir + sourceFile, 'utf-8', function(err, inputString) {
    if(!err && inputString) {
      // Compress the data using gzip
      zlib.gzip(inputString, function(err, buffer) {
        if(!err && buffer) {
          // Send the compressed data to the destination file
          fs.open(lib.baseDir + destFile, 'wx', function(err, fileDescriptor) {
            if(!err && fileDescriptor) {
              // Write to the destination file
              fs.writeFile(fileDescriptor, buffer.toString('base64'), function(err) {
                if(!err) {
                  // Close the destination file
                  fs.close(fileDescriptor, function(err) {
                    if(!err) {
                      callback(false);
                    } else {
                      callback(err);
                    }
                  });
                } else {
                  callback(err);
                }
              })
            } else {
              callback(err);
            }
          })
        } else {
          callback(err)
        }
      })
    } else {
      callback(err)
    }
  })
};

// Decompress the contents of a .gz.b64 file into a string variable.
lib.decompress = function(fileId, callback) {
  const fileName = fileId + '.gz.b64';
  fs.readFile(lib.baseDir + fileName, 'utf-8', function(err, str) {
    if(!err && str) {
      // Decompress the data
      const inputBuffer = new Buffer.from(str, 'base64');
      zlib.unzip(inputBuffer, function(err, outputBuffer) {
        if(!err && outputBuffer) {
          const str = outputBuffer.toString();
          callback(false, str);
        } else {
          callback(err);
        }
      });

    } else {
      callback(err)
    }
  });
};

// Truncate a log file.
lib.truncate = function(logId, callback) {
  fs.truncate(lib.baseDir + logId + '.log', 0, function(err) {
    if(!err) {
      callback(false);
    } else {
      callback(err);
    }
  })
};

module.exports = lib;