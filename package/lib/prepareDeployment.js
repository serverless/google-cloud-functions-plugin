'use strict';

/* eslint no-use-before-define: 0 */

const path = require('path');

const _ = require('lodash');
const BbPromise = require('bluebird');

module.exports = {
  prepareDeployment() {
    let deploymentTemplate = this.serverless.service.provider.compiledConfigurationTemplate;

    deploymentTemplate = this.serverless.utils.readFileSync(
      path.join(__dirname, '..', 'templates', 'core-configuration-template.yml')
    );

    const bucket = deploymentTemplate.resources.find(findDeploymentBucket);

    const name = this.serverless.service.provider.deploymentBucketName;
    const location = this.serverless.service.provider.region;
    const updatedBucket = updateBucket(bucket, name, location);

    const bucketIndex = deploymentTemplate.resources.findIndex(findDeploymentBucket);

    deploymentTemplate.resources[bucketIndex] = updatedBucket;

    this.serverless.service.provider.compiledConfigurationTemplate = deploymentTemplate;

    // functionIamBindings holds a mapping of function name to array of bindings which
    // were configured for it. This is populated during function compile.
    this.serverless.service.provider.functionIamBindings = {};

    return BbPromise.resolve();
  },
};

const updateBucket = (bucket, name, location) => {
  const newBucket = _.cloneDeep(bucket);
  newBucket.name = name;
  if (location) {
    if (!newBucket.properties) newBucket.properties = {};
    newBucket.properties.location = location;
  }
  return newBucket;
};

const findDeploymentBucket = (resource) => {
  const type = 'storage.v1.bucket';
  const name = 'will-be-replaced-by-serverless';

  return resource.type === type && resource.name === name;
};
