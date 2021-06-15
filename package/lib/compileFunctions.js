'use strict';

/* eslint no-use-before-define: 0 */

const path = require('path');

const _ = require('lodash');
const BbPromise = require('bluebird');
const { validateEventsProperty } = require('../../shared/validate');

module.exports = {
  compileFunctions() {
    const artifactFilePath = this.serverless.service.package.artifact;
    const fileName = artifactFilePath.split(path.sep).pop();
    const projectName = _.get(this, 'serverless.service.provider.project');
    this.serverless.service.provider.region =
      this.serverless.service.provider.region || 'us-central1';
    this.serverless.service.package.artifactFilePath = `${this.serverless.service.package.artifactDirectoryName}/${fileName}`;

    this.serverless.service.getAllFunctions().forEach((functionName) => {
      const funcObject = this.serverless.service.getFunction(functionName);

      this.serverless.cli.log(`Compiling function "${functionName}"...`);

      validateHandlerProperty(funcObject, functionName);
      validateEventsProperty(funcObject, functionName);
      validateVpcConnectorProperty(funcObject, functionName);
      validateIamProperty(funcObject, functionName);

      const eventType = Object.keys(funcObject.events[0])[0];

      const funcTemplate = getFunctionTemplate(
        funcObject,
        projectName,
        this.serverless.service.provider.region,
        `gs://${this.serverless.service.provider.deploymentBucketName}/${this.serverless.service.package.artifactFilePath}`
      );

      funcTemplate.properties.serviceAccountEmail =
        _.get(funcObject, 'serviceAccountEmail') ||
        _.get(this, 'serverless.service.provider.serviceAccountEmail') ||
        null;
      funcTemplate.properties.availableMemoryMb =
        _.get(funcObject, 'memorySize') ||
        _.get(this, 'serverless.service.provider.memorySize') ||
        256;
      funcTemplate.properties.runtime = this.provider.getRuntime(funcObject);
      funcTemplate.properties.timeout =
        _.get(funcObject, 'timeout') || _.get(this, 'serverless.service.provider.timeout') || '60s';
      funcTemplate.properties.environmentVariables =
        this.provider.getConfiguredEnvironment(funcObject);

      const allowUnauthenticated =
        eventType === 'http' &&
        (funcObject.allowUnauthenticated || this.serverless.service.provider.allowUnauthenticated);

      // Collect the configured IAM bindings at the function and provider level and merge the
      // members for each defined role. This transforms the array of IAM bindings into a mapping
      // in order to easily merge.
      const iamBindings = (_.get(funcObject, 'iam.bindings') || [])
        .concat(
          _.get(this, 'serverless.service.provider.iam.bindings') || [],
          allowUnauthenticated
            ? [{ role: 'roles/cloudfunctions.invoker', members: ['allUsers'] }]
            : []
        )
        .reduce((result, value) => {
          result[value.role] = _.union(result[value.role] || [], value.members);
          return result;
        }, {});

      if (!funcTemplate.properties.serviceAccountEmail) {
        delete funcTemplate.properties.serviceAccountEmail;
      }

      if (funcObject.vpc) {
        _.assign(funcTemplate.properties, {
          vpcConnector: _.get(funcObject, 'vpc') || _.get(this, 'serverless.service.provider.vpc'),
        });
      }

      if (funcObject.maxInstances) {
        funcTemplate.properties.maxInstances = funcObject.maxInstances;
      }

      if (!_.size(funcTemplate.properties.environmentVariables)) {
        delete funcTemplate.properties.environmentVariables;
      }

      funcTemplate.properties.labels = _.assign(
        {},
        _.get(this, 'serverless.service.provider.labels') || {},
        _.get(funcObject, 'labels') || {} // eslint-disable-line comma-dangle
      );

      if (eventType === 'http') {
        const url = funcObject.events[0].http;

        funcTemplate.properties.httpsTrigger = {};
        funcTemplate.properties.httpsTrigger.url = url;
      }
      if (eventType === 'event') {
        const type = funcObject.events[0].event.eventType;
        const path = funcObject.events[0].event.path; //eslint-disable-line
        const resource = funcObject.events[0].event.resource;

        funcTemplate.properties.eventTrigger = {};
        funcTemplate.properties.eventTrigger.eventType = type;
        if (path) funcTemplate.properties.eventTrigger.path = path;
        funcTemplate.properties.eventTrigger.resource = resource;
      }

      this.serverless.service.provider.compiledConfigurationTemplate.resources.push(funcTemplate);

      if (Object.keys(iamBindings).length) {
        const fnResource = `projects/${projectName}/locations/${this.serverless.service.provider.region}/functions/${funcObject.name}`;
        this.serverless.service.provider.functionIamBindings[fnResource] = _.flatMap(
          iamBindings,
          (value, key) => {
            return { role: key, members: value };
          }
        );
      }
    });

    return BbPromise.resolve();
  },
};

const validateHandlerProperty = (funcObject, functionName) => {
  if (!funcObject.handler) {
    const errorMessage = [
      `Missing "handler" property for function "${functionName}".`,
      ' Your function needs a "handler".',
      ' Please check the docs for more info.',
    ].join('');
    throw new Error(errorMessage);
  }
};

const validateVpcConnectorProperty = (funcObject, functionName) => {
  if (funcObject.vpc && typeof funcObject.vpc === 'string') {
    const vpcNamePattern = /projects\/[\s\S]*\/locations\/[\s\S]*\/connectors\/[\s\S]*/i;
    if (!vpcNamePattern.test(funcObject.vpc)) {
      const errorMessage = [
        `The function "${functionName}" has invalid vpc connection name`,
        ' VPC Connector name should follow projects/{project_id}/locations/{region}/connectors/{connector_name}',
        ' Please check the docs for more info.',
      ].join('');
      throw new Error(errorMessage);
    }
  }
};

const validateIamProperty = (funcObject, functionName) => {
  if (_.get(funcObject, 'iam.bindings') && funcObject.iam.bindings.length > 0) {
    funcObject.iam.bindings.forEach((binding) => {
      if (!binding.role) {
        const errorMessage = [
          `The function "${functionName}" has no role specified for an IAM binding.`,
          ' Each binding requires a role. For details on supported roles, see the documentation',
          ' at: https://cloud.google.com/iam/docs/understanding-roles',
        ].join('');
        throw new Error(errorMessage);
      }
      if (!Array.isArray(binding.members) || !binding.members.length) {
        const errorMessage = [
          `The function "${functionName}" has no members specified for an IAM binding.`,
          ' Each binding requires at least one member to be assigned. See the IAM documentation',
          ' for details on configuring members: https://cloud.google.com/iam/docs/overview',
        ].join('');
        throw new Error(errorMessage);
      }
    });
  }
};

const getFunctionTemplate = (funcObject, projectName, region, sourceArchiveUrl) => {
  //eslint-disable-line
  return {
    type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
    name: funcObject.name,
    properties: {
      parent: `projects/${projectName}/locations/${region}`,
      availableMemoryMb: 256,
      runtime: 'nodejs10',
      timeout: '60s',
      entryPoint: funcObject.handler,
      function: funcObject.name,
      sourceArchiveUrl,
    },
    accessControl: {
      gcpIamPolicy: {
        bindings: [],
      },
    },
  };
};
