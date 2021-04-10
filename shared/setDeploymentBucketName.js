'use strict';

const BbPromise = require('bluebird');
const _ = require('lodash');

module.exports = {
  setDeploymentBucketName() {
    const providerBucket = this.serverless.service.provider.bucket;
    const service = this.serverless.service.service;
    const stage = this.options.stage;

    let providerBucketName = providerBucket && providerBucket.name;
    if (!providerBucketName) {
      const timestamp = +new Date();
      providerBucketName = `sls-${service}-${stage}-${timestamp}`;
    }

    this.serverless.service.provider.bucket = {
      ...providerBucket,
      name: providerBucketName,
    };

    // check if there's already a deployment and update if available
    const params = {
      project: this.serverless.service.provider.project,
      deployment: `sls-${this.serverless.service.service}-${this.options.stage}`,
    };

    return this.provider
      .request('deploymentmanager', 'resources', 'list', params)
      .then((response) => {
        if (!_.isEmpty(response) && response.resources) {
          const regex = new RegExp(`sls-${service}-${stage}-.+`);

          const deploymentBucket = response.resources.find(
            (resource) => resource.type === 'storage.v1.bucket' && resource.name.match(regex)
          );

          this.serverless.service.provider.bucket.name = deploymentBucket.name;
        }
      })
      .catch(() => BbPromise.resolve()); // if it cannot be found (e.g. on initial deployment)
  },
};
