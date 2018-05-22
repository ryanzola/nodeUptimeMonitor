// Create and export configuration variables
const environments = {};

// Staging environment (default)
environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: 'staging',
  hashingSecret: 'thisIsASecret',
  maxChecks: 5,
  twilio: {
    'accountSid' : 'YOUR TWILIO ACCOUNT ID',
    'authToken' : 'YOUR TWILIO AUTH TOKEN',
    'fromPhone' : 'YOUR PHONE NUMBER'
  },
  templateGlobals: {
    appName: 'Uptime checker',
    companyName: 'Not A Real Company, Inc.',
    yearCreated: '2018',
    baseUrl: 'http://localhost:3000/'
  }
};

// Production environment
environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: 'production',
  hashingSecret: 'thisIsAlsoASecret',
  maxChecks: 5,
  twilio: {
    'accountSid' : 'YOUR TWILIO ACCOUNT ID',
    'authToken' : 'YOUR TWILIO AUTH TOKEN',
    'fromPhone' : 'YOUR PHONE NUMBER'
  },
  templateGlobals: {
    appName: 'Uptime checker',
    companyName: 'Not A Real Company, Inc.',
    yearCreated: '2018',
    baseUrl: 'http://localhost:5000/'
  }
};

// Determine which environment was passed in the command line args
var currentEnvironment =
  typeof process.env.NODE_ENV == 'string'
    ? process.env.NODE_ENV.toLowerCase()
    : '';

// Check that the current environment is a valid environment
var environmentToExport =
  typeof environments[currentEnvironment] == 'object'
    ? environments[currentEnvironment]
    : environments.staging;

// Export the module
module.exports = environmentToExport;