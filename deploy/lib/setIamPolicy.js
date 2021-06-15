'use strict';

const ServerlessError = require('serverless/lib/classes/Error').ServerlessError;

module.exports = {
  setIamPolicy() {
    return Promise.resolve()
      .then(() => this.getFunctions())
      .then(() => this.setPolicies());
  },

  getFunctions() {
    const project = this.serverless.service.provider.project;
    const region = this.options.region;

    const params = {
      parent: `projects/${project}/locations/${region}`,
    };

    return this.provider
      .request('cloudfunctions', 'projects', 'locations', 'functions', 'list', params)
      .then((response) => {
        return response.functions;
      });
  },

  setPolicies(functions) {
    const policies = this.serverless.service.provider.functionIamBindings;

    // If there are no IAM policies configured with any function, there is nothing to
    // do here.
    if (!policies || !Object.keys(policies).length) {
      return Promise.resolve();
    }
    this.serverless.cli.log('Setting IAM policies...');

    const promises = [];
    Object.entries(policies).forEach((entry) => {
      const func = functions.find((fn) => {
        return fn.name === entry[0];
      });
      if (func) {
        const params = {
          resource: func.name,
          requestBody: {
            policy: {
              bindings: entry[1],
            },
          },
        };

        promises.push(
          this.provider.request(
            'cloudfunctions',
            'projects',
            'locations',
            'functions',
            'setIamPolicy',
            params
          )
        );
      } else {
        const errorMessage = [
          `Unable to set IAM bindings (${entry[1]}) for "${entry[0]}": function not found for`,
          ` project "${this.serverless.service.provider.project}" in region "${this.options.region}".`,
        ].join('');
        throw new ServerlessError(errorMessage);
      }
    });

    return Promise.all(promises);
  },
};
