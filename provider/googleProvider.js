'use strict';

const path = require('path');
const os = require('os');

const _ = require('lodash');
const google = require('googleapis').google;

const pluginPackageJson = require('../package.json'); // eslint-disable-line import/newline-after-import
const googleApisPackageJson = require(require.resolve('googleapis/package.json')); // eslint-disable-line import/no-dynamic-require

const constants = {
  providerName: 'google',
};

class GoogleProvider {
  static getProviderName() {
    return constants.providerName;
  }

  constructor(serverless) {
    this.serverless = serverless;
    this.provider = this; // only load plugin in a Google service context
    this.serverless.setProvider(constants.providerName, this);
    this.serverless.configSchemaHandler.defineProvider(constants.providerName, {
      definitions: {
        cloudFunctionRegion: {
          // Source: https://cloud.google.com/functions/docs/locations
          enum: [
            // Tier pricing 1
            'us-central1', // (Iowa)
            'us-east1', // (South Carolina)
            'us-east4', // (Northern Virginia)
            'europe-west1', // (Belgium)
            'europe-west2', // (London)
            'asia-east2', // (Hong Kong)
            'asia-northeast1', // (Tokyo)
            'asia-northeast2', // (Osaka)
            // Tier pricing 2
            'us-west2', // (Los Angeles)
            'us-west3', // (Salt Lake City)
            'us-west4', // (Las Vegas)
            'northamerica-northeast1', // (Montreal)
            'southamerica-east1', // (Sao Paulo)
            'europe-west3', // (Frankfurt)
            'europe-west6', // (Zurich)
            'australia-southeast1', // (Sydney)
            'asia-south1', // (Mumbai)
            'asia-southeast2', // (Jakarta)
            'asia-northeast3', // (Seoul)
          ],
        },
        cloudFunctionRuntime: {
          // Source: https://cloud.google.com/functions/docs/concepts/exec#runtimes
          enum: [
            'nodejs6', // decommissioned
            'nodejs8', // deprecated
            'nodejs10',
            'nodejs12',
            'nodejs14',
            'python37',
            'python38',
            'go111',
            'go113',
            'java11',
            'dotnet3',
            'ruby26',
            'ruby27',
          ],
        },
        cloudFunctionMemory: {
          // Source: https://cloud.google.com/functions/docs/concepts/exec#memory
          enum: [
            128,
            256, // default
            512,
            1024,
            2048,
            4096,
          ],
        },
        cloudFunctionEnvironmentVariables: {
          type: 'object',
          patternProperties: {
            '^.*$': { type: 'string' },
          },
          additionalProperties: false,
        },
        cloudFunctionBuildEnvironmentVariables: {
          type: 'object',
          patternProperties: {
            '^.*$': { type: 'string' },
          },
          additionalProperties: false,
        },
        resourceManagerLabels: {
          type: 'object',
          propertyNames: {
            type: 'string',
            minLength: 1,
            maxLength: 63,
          },
          patternProperties: {
            '^[a-z][a-z0-9_.]*$': { type: 'string' },
          },
          additionalProperties: false,
        },
      },

      provider: {
        properties: {
          credentials: { type: 'string' },
          project: { type: 'string' },
          region: { $ref: '#/definitions/cloudFunctionRegion' },
          runtime: { $ref: '#/definitions/cloudFunctionRuntime' }, // Can be overridden by function configuration
          serviceAccountEmail: { type: 'string' }, // Can be overridden by function configuration
          memorySize: { $ref: '#/definitions/cloudFunctionMemory' }, // Can be overridden by function configuration
          timeout: { type: 'string' }, // Can be overridden by function configuration
          environment: { $ref: '#/definitions/cloudFunctionEnvironmentVariables' }, // Can be overridden by function configuration
          buildEnvironment: { $ref: '#/definitions/cloudFunctionBuildEnvironmentVariables' }, // Can be overridden by function configuration
          vpc: { type: 'string' }, // Can be overridden by function configuration
          labels: { $ref: '#/definitions/resourceManagerLabels' }, // Can be overridden by function configuration
        },
      },
      function: {
        properties: {
          handler: { type: 'string' },
          runtime: { $ref: '#/definitions/cloudFunctionRuntime' }, // Override provider configuration
          serviceAccountEmail: { type: 'string' }, // Override provider configuration
          memorySize: { $ref: '#/definitions/cloudFunctionMemory' }, // Override provider configuration
          timeout: { type: 'string' }, // Override provider configuration
          environment: { $ref: '#/definitions/cloudFunctionEnvironmentVariables' }, // Override provider configuration
          buildEnvironment: { $ref: '#/definitions/cloudFunctionBuildEnvironmentVariables' }, // Override provider configuration
          vpc: { type: 'string' }, // Override provider configuration
          labels: { $ref: '#/definitions/resourceManagerLabels' }, // Override provider configuration
        },
      },
    });

    const serverlessVersion = this.serverless.version;
    const pluginVersion = pluginPackageJson.version;
    const googleApisVersion = googleApisPackageJson.version;

    google.options({
      headers: {
        'User-Agent': `Serverless/${serverlessVersion} Serverless-Google-Provider/${pluginVersion} Googleapis/${googleApisVersion}`,
      },
    });

    this.sdk = {
      google,
      deploymentmanager: google.deploymentmanager('v2'),
      storage: google.storage('v1'),
      logging: google.logging('v2'),
      cloudfunctions: google.cloudfunctions('v1'),
    };

    this.variableResolvers = {
      gs: this.getGsValue,
    };
  }

  getGsValue(variableString) {
    const groups = variableString.split(':')[1].split('/');
    const bucket = groups.shift();
    const object = groups.join('/');

    return this.serverless
      .getProvider('google')
      .request('storage', 'objects', 'get', {
        bucket,
        object,
        alt: 'media',
      })
      .catch((err) => {
        throw new Error(`Error getting value for ${variableString}. ${err.message}`);
      });
  }

  request() {
    // grab necessary stuff from arguments array
    const lastArg = arguments[Object.keys(arguments).pop()]; //eslint-disable-line
    const hasParams = typeof lastArg === 'object';
    const filArgs = _.filter(arguments, (v) => typeof v === 'string'); //eslint-disable-line
    const params = hasParams ? lastArg : {};

    const service = filArgs[0];
    const serviceInstance = this.sdk[service];
    this.isServiceSupported(service);

    const authClient = this.getAuthClient();

    return authClient.getClient().then(() => {
      const requestParams = { auth: authClient };

      // merge the params from the request call into the base functionParams
      _.merge(requestParams, params);

      return filArgs
        .reduce((p, c) => p[c], this.sdk)
        .bind(serviceInstance)(requestParams)
        .then((result) => result.data)
        .catch((error) => {
          if (
            error &&
            error.errors &&
            error.errors[0].message &&
            _.includes(error.errors[0].message, 'project 1043443644444')
          ) {
            throw new Error(
              "Incorrect configuration. Please change the 'project' key in the 'provider' block in your Serverless config file."
            );
          } else if (error) {
            throw error;
          }
        });
    });
  }

  getAuthClient() {
    let credentials = this.serverless.service.provider.credentials;

    if (credentials) {
      const credParts = this.serverless.service.provider.credentials.split(path.sep);
      if (credParts[0] === '~') {
        credParts[0] = os.homedir();
        credentials = credParts.reduce((memo, part) => path.join(memo, part), '');
      }

      return new google.auth.GoogleAuth({
        keyFile: credentials.toString(),
        scopes: 'https://www.googleapis.com/auth/cloud-platform',
      });
    }

    return new google.auth.GoogleAuth({
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
    });
  }

  isServiceSupported(service) {
    if (!_.includes(Object.keys(this.sdk), service)) {
      const errorMessage = [
        `Unsupported service API "${service}".`,
        ` Supported service APIs are: ${Object.keys(this.sdk).join(', ')}`,
      ].join('');

      throw new Error(errorMessage);
    }
  }

  getRuntime(funcObject) {
    return (
      _.get(funcObject, 'runtime') ||
      _.get(this, 'serverless.service.provider.runtime') ||
      'nodejs10'
    );
  }

  getConfiguredEnvironment(funcObject) {
    return _.merge(
      {},
      _.get(this, 'serverless.service.provider.environment'),
      funcObject.environment
    );
  }

  getConfiguredBuildEnvironment(funcObject) {
    return _.merge(
      {},
      _.get(this, 'serverless.service.provider.buildEnvironment'),
      funcObject.buildEnvironment
    );
  }
}

module.exports = GoogleProvider;
