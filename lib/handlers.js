/*
 * Request handlers
 */

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');

// Define handlers
const handlers = {};

/**
 * HTML HANDLERS
*/

// Index Handler
handlers.index = function(data,callback){
  // Reject any request that isn't a GET
  if(data.method == 'get'){

    // Prepare data for interpolation
    var templateData = {
      'head.title': 'Uptime Monitoring - Made Simple',
      'head.description': 'We offer free, simple uptime monitoring of HTTP/HTTPS sites. When your site goes down, we\'ll send you a text to let you know.',
      'body.class': 'index'
    };

    // Read in a template as a string
    helpers.getTemplate('index', templateData, function(err,str){
      if(!err && str){
        // Add universal header and footer
        helpers.addUniversalTemplates(str, templateData, function(err,str) {
          if(!err && str) {
            // Return that page as html
            callback(200, str, 'html');
          } else {
            callback(500, undefined, 'html');
          }
        });
      } else {
        callback(500, undefined, 'html')
      }
    });
    // Return that template as HTML
  } else {
    callback(405, undefined, 'html');
  }
};

// Create Account Handler

// Favicon handler
handlers.favicon = function(data, callback) {
  if(data.method == 'get') {
    // Read the favicon data
    helpers.getStaticAsset('favicon.ico', function(err, data) {
      if(!err && data) {
        // Callback the data
        callback(200, data, 'favicon');
      } else {
        callback(500);
      }
    });
  } else {
    callback(405)
  }
};

// Public handler
handlers.public = function(data, callback) {
  if(data.method == 'get') {
    // Get the filename being requested
    var trimmedAssetName = data.trimmedPath.replace('public/', '');
    if(trimmedAssetName.length > 0) {
      // Read the asset's data
      helpers.getStaticAsset(trimmedAssetName, function(err, data) {
        if(!err && data) {
          // Determine the content type and default to plain text
          var contentType = 'plain';

          if(trimmedAssetName.indexOf('.css') > -1) {
            contentType = 'css';
          }

          if(trimmedAssetName.indexOf('.png') > -1) {
            contentType = 'png';
          }

          if(trimmedAssetName.indexOf('.jpeg') > -1) {
            contentType = 'jpg';
          }

          if(trimmedAssetName.indexOf('.ico') > -1) {
            contentType = 'favicon';
          }

          callback(200, data, contentType);

        } else {
          callback(404);
        }
      });
    } else {
      callback(404);
    }

  } else {
    callback(405);
  }
};

/*
 * JSON API HANDLERS
 */
/*----- USERS -----*/
// users handler
handlers.users = function(data, callback) {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for the users submethods
handlers._users = {};

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = function(data, callback) {
  // Check that all required fields are filled out
  // Check that all required fields are filled out
  var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

  if (firstName && lastName && phone && password && tosAgreement) {
    // Make sure that the user doesnt already exist
    _data.read('users', phone, function(err, data) {
      if (err) {
        // Hash the password
        var hashedPassword = helpers.hash(password);

        // Create the user object
        if (hashedPassword) {
          var userObject = {
            firstName: firstName,
            lastName: lastName,
            phone: phone,
            hashedPassword: hashedPassword,
            tosAgreement: true
          };

          // Store the user
          _data.create('users', phone, userObject, function(err) {
            if (!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500, { Error: 'Could not create the new user.' });
            }
          });
        } else {
          callback(500, { Error: 'Could not hash the user password.' });
        }
      } else {
        callback(400, { Error: 'This user already exists' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required fields' });
  }
};

// Users - get
// Required data: phone
// Optional data: none
handlers._users.get = function(data, callback) {
  // Check that the phone number is valid
  const phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
  if(phone) {
    // Get the token from the headers
    const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
      if(tokenIsValid) {
        // Lookup the user
        _data.read('users', phone, function(err, data) {
          if(!err && data) {
            // Remove hashed password from the user object before returning it
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404)
          }
        })
      } else { 
        callback(403, {'Error': 'Missing required token in header or token is invalid.'});
      }
    })
  } else {
    callback(400, {'Error': 'Missing required field'});
  }

};

// Users - put
// Required data: phone
// Optional data: first name, last name, password (at least one must be specified)
handlers._users.put = function(data, callback) {
  var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  // Error if the phone is invalid
  if(phone) {
    // Error if nothing is sent to update
    if(firstName || lastName || password) {

      // Get the token from the headers
      const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
      
      handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
        if(tokenIsValid) {
          // Lookup user
          _data.read('users', phone, function(err, userData) {
            if(!err && userData) {
              // Update necessary fields
              if(firstName) {
                userData.firstName = firstName;
              }
              if(lastName) {
                userData.lastName  = lastName;
              }
              if(password) {
                userData.hashedPassword  = helpers.hash(password);
              }
              // Store the new updates
              _data.update('users', phone, userData, function(err) {
                if(!err) {
                  callback(200);
                } else {
                  callback(500, {'Error': 'Could not update the user'});
                }
              })
            } else {
              callback(400, {'Error': 'The specified user does not exist'})
            }
          });
        } else {
          callback(403, {'Error': 'Missing required token in header or token is invalid.'});
        }
      });
    } else {
      callback(400, {'Error': 'Missing fields to update'});
    }
  } else {
    callback(400, {'Error': 'Missing required field'})
  }
};

// Users - delete
// Required data: phone
// Optional data: none
handlers._users.delete = function(data, callback) {
  // Check that the phone number is valid
  const phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
  if(phone) {
    //Get the token from the headers
    const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
      if(tokenIsValid) {
        // Lookup the user
        _data.read('users', phone, function(err, userData) {
          if(!err && userData) {
          _data.delete('users', phone, function(err) {
            if(!err) {
              // Delete each of the checks associated with the user
              const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
              const checksToDelete = userChecks.length;
              if(checksToDelete > 0) {
                var checksDeleted = 0;
                var deletionErrors = false;

                // Loop through checks
                userChecks.forEach(function(checkId) {
                  // Delete the check
                  _data.delete('checks', checkId, function(err) {
                    if(err) {
                      deletionErrors = true;
                    } 

                    checksDeleted++;
                    if(checksDeleted == checksToDelete) {
                      if(!deletionErrors) {
                        callback(200);
                      } else {
                        callback(500, {'Error': 'Errors encountered while attempting to delete all of the users checks. All checks may not have been deleted from the system successfully.'})
                      }
                    }
                  })
                });

              } else{
                callback(200)
              }
            } else {
              callback(500, {'Error': 'Could not delete the specified user.'});
            }
          })
          } else {
            callback(400, {'Error': 'Could not find specified user.'})
          }
        });
      } else {
        callback(403, {'Error': 'Missing required token in header or token is invalid.'});
      }
    });
  } else {
    callback(400, {'Error': 'Missing required field'});
  }
};

/*----- TOKENS -----*/
// tokens handler
handlers.tokens = function(data, callback) {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for all token methods
handlers._tokens = {};

// Tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = function(data, callback) {
  var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  if(phone && password) {
    // Look up the user who matches the phone number
    _data.read('users', phone, function(err, userData) {
      if(!err && userData) {
        // Hash the sent password and compare it to the stored user password
        const hashedPassword = helpers.hash(password);
        if(hashedPassword == userData.hashedPassword) {
          // If valid, create a new token with a random name, set exp date 1 hour
          const tokenId = helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            phone: phone,
            id: tokenId,
            expires: expires
          };

          // Store the token
          _data.create('tokens', tokenId, tokenObject, function(err) {
            if(!err) {
              callback(200, tokenObject)
            } else {
              callback(500, {'Error': 'Could not create the new token'})
            }
          })
        } else {
          callback(400, {'Error': 'Password did not match the specified users stored password'})
        }
      } else {
        callback(400, {'Error': 'Could not find the specified user.'})
      }
    })
  } else {
    callback(400, {'Error': 'Missing required fields.'})
  }
};

// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = function(data, callback) {
  // Check that the id is valid
  const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(id) {
    // Lookup the user
    _data.read('tokens', id, function(err, tokenData) {
      if(!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404)
      }
    })
  } else {
    callback(400, {'Error': 'Missing required field'});
  }
};

// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = function(data, callback) {
  var id = typeof(data.payload.id ) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
  var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
  if(id && extend) {
    _data.read('tokens', id, function(err, tokenData) {
      if(!err && tokenData) {
        // Check to make sure the token isnt already expired
        if(tokenData.expires > Date.now()) {
          // Set the expiration to an hour from now
          tokenData.expires = Date.now() + 1000 * 60 * 60;

          // Store the new updates
          _data.update('tokens', id, tokenData, function(err) {
            if(!err) {
              callback(200);
            } else {
              callback(500, {'Error': 'Could not update token expiration.'})
            }
          })
        } else {
          callback(400, {'Error': 'The token has already expired and cannot be extended'});
        }
      } else {
        callback(400, {'Error': 'Specified token does not exist'});
      }
    })
  } else {
    callback(400, {'Error': 'Missing required fields or fields are invalid'});
  }

};

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = function(data, callback) {
  const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(id) {
    _data.read('tokens', id, function(err, tokenData) {
      if(!err && tokenData) {
        _data.delete('tokens', id, function(err) {
          if(!err) {
            callback(200);
          } else {
            callback(500, {'Error': 'Could not delete the specified  token.'})
          }
        })
      } else {
        callback(400, {'Error': 'Could not find specified token.'})
      }
    })

  } else {
    callback(400, {'Error': 'Missing required field.'});
  }
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function(id, phone, callback) {
  // Look uo the token
  _data.read('tokens', id, function(err, tokenData) {
    if(!err && tokenData) {
      // Check that the token is for a given user and has not expired
      if(tokenData.phone == phone && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  })
}

/*----- CHECKS -----*/
// checks handler
handlers.checks = function(data, callback) {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for all checks methods
handlers._checks = {};

// Checks - post
// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none
handlers._checks.post = function(data, callback) {
  // Validate inputs
  const protocol = typeof(data.payload.protocol) == 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  const url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  const method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  const successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  const timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  if(protocol && url && method && successCodes && timeoutSeconds) {
    // Get the token from headers
    const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    // Look up the user by reading the token
    _data.read('tokens', token, function(err, tokenData) {
      if(!err && tokenData) {
        const userPhone = tokenData.phone;
        // Lookup the user data
        _data.read('users', userPhone, function(err, userData) {
          if(!err && userData) {
            const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

            // Verify that the user has less than the number of max checks (5) per user
            if(userChecks.length < config.maxChecks) {
              // Create a random id for the check
              const checkId = helpers.createRandomString(20);

              // Create the check object and include the users phone
              const checkObject = {
                id: checkId,
                userPhone: userPhone,
                protocol: protocol,
                url: url,
                method: method,
                successCodes: successCodes,
                timeoutSeconds: timeoutSeconds
              };

              // Store this object on disk
              _data.create('checks', checkId, checkObject, function(err) {
                if(!err) {
                  // Add the check id to the users object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);

                  // Save the new user data
                  _data.update('users', userPhone, userData, function(err) {
                    if(!err) {
                      callback(200, checkObject);
                    } else {
                      callback(500, {'Error': 'Could not update the user with the new check.'})
                    }
                  })
                } else {
                  callback(500, {'Error': 'Could not create the new check'})
                }
              })
            } else {
              callback(400, {'Error': 'The user already has the maximum number of checks ('+config.maxChecks+')'});
            }
          } else {
            callback(403)
          }
        })
      } else {
        callback(403);
      }
    })
  } else {
    callback(400, {'Error': 'Missing required inputs or inputs are invalid'});
  }
};

// Checks - get
// Required data: id
// Optional data: none
handlers._checks.get = function(data, callback) {
  // Check that the id is valid
  const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(id) {

    // Look up the check
    _data.read('checks', id, function(err, checkData) {
      if(!err && checkData) {


        // Get the token from the headers
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        // Verify that the given token is valid and belongs to the user who created the check
        handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid) {
          if(tokenIsValid) {
            // Return the check data
            callback(200, checkData)
          } else { 
            callback(403);
          }
        });
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, {'Error': 'Missing required field'});
  }

};

// Checks - put
// Required data: id
// Optional data: protocol, url, method, successCodes, timeoutSeconds (one must be sent)
handlers._checks.put = function(data, callback) {
  // Check for the required field
  const id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id : false;

  // Check of the optional fields
  const protocol = typeof(data.payload.protocol) == 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  const url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  const method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  const successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  const timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  if(id) {
    // Check to make sure one of the optional fields has been sent
    if(protocol || url || method || successCodes || timeoutSeconds) {
      // Look up check
      _data.read('checks', id, function(err, checkData) {
        if(!err && checkData) {
          // Get the token from the headers
          const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

          // Verify that the token is valid and belongs to the user who created the check
          handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid) {
            if(tokenIsValid) {
              // Update the check where necessarry
              if(protocol) {
                checkData.protocol = protocol;
              }

              if (url) {
                checkData.url = url;
              }

              if(method) {
                checkData.method = method;
              }

              if(successCodes) {
                checkData.successCodes = successCodes;
              }

              if(timeoutSeconds) {
                checkData.timeoutSeconds = timeoutSeconds;
              }

              // Store the updates
              _data.update('checks', id, checkData, function(err) {
                if(!err) {
                  callback(200);
                } else {
                  callback(500, {'Error': 'Could not update the check'});
                }
              });
            } else {
              callback(403)
            }
          });
        } else {
          callback(400, {'Error': 'Check id does not exist.'})
        }
      });
    } else {
      callback(400, {'Error': 'Missing fields to update.'});
    }
  } else {
    callback(400, {'Error': 'Missing required field'});
  }
};

// Checks - delete
// Required data: id
// Optional data: none
handlers._checks.delete = function(data, callback) {
  // Check that the id is valid
  const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(id) {
    // Look up the check
    _data.read('checks', id, function(err, checkData) {
      if(!err && checkData) {
        // Get the token from the headers
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        // Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsValid) {
          if(tokenIsValid) {

            // Delete the check data
            _data.delete('checks', id, function(err) {
              if(!err) {
                // Look up the user
                _data.read('users', checkData.userPhone, function(err, userData) {
                  if(!err && userData) {
                    // Get the checks array from the user object
                    const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

                    // Remove the deleted check from thier list of checks
                    var checkPosition = userChecks.indexOf(id);
                    if(checkPosition > -1) {
                      userChecks.splice(checkPosition, 1);

                      // Resave the user's data
                      _data.update('users', checkData.userPhone, userData, function(err) {
                        if(!err) {
                          callback(200)
                        } else {
                          callback(500, {'Error': 'Could not update the specified user.'})
                        }
                      });
                    } else {
                      callback(500, {'Error': 'Could not find the check on the users object so could not remove it.'})
                    }
                  } else {
                    callback(500, {'Error': 'Could not find the user who created the check so could not remove the check from the list of checks on the user object.'})
                  }
                })
              } else {
                callback(500, {'Error': 'Could not delete the check data.'})
              }
            });
          } else {
            callback(403);
          }
        });
      } else {
        callback(400, {'Error': 'Could not find the specific check id.'});
      }
    })
  } else {
    callback(403, {'Error': 'Missing required field.'});
  }

}

// ping handler
handlers.ping = function(data, callback) {
  callback(200);
};

// Not found handler
handlers.notFound = function(data, callback) {
  callback(404);
};

module.exports = handlers;
