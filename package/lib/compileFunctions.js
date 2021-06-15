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

      if (!funcTemplate.properties.serviceAccountEmail) {
        delete funcTemplate.properties.serviceAccountEmail;
      }

      if (funcObject.vpc) {
        _.assign(funcTemplate.properties, {
          vpcConnector: _.get(funcObject, 'vpc') || _.get(this, 'serverless.service.provider.vpc'),
        });
      }

      if (funcObject.egress) {
        _.assign(funcTemplate.properties, {
          vpcConnectorEgressSettings: _.get(funcObject, 'egress') || _.get(this, 'serverless.service.provider.egress'),
        });
      }

      if (funcObject.ingress) {
        _.assign(funcTemplate.properties, {
          ingressSettings: _.get(funcObject, 'ingress') || _.get(this, 'serverless.service.provider.ingress'),
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

      const eventType = Object.keys(funcObject.events[0])[0];

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

/**
 * Validate the function egress settings per
 * https://cloud.google.com/functions/docs/reference/rest/v1/projects.locations.functions#vpcconnectoregresssettings
 * @param {*} funcObject
 * @param {*} functionName
 */
const validateVpcEgressProperty = (funcObject, functionName) => {
  if (funcObject.egress && typeof funcObject.egress === 'string') {
    const validTypes = ['VPC_CONNECTOR_EGRESS_SETTINGS_UNSPECIFIED', 'PRIVATE_RANGES_ONLY', 'ALL_TRAFFIC'];
    if (!validTypes.includes(funcObject.egress)) {
      const errorMessage = [
        `The function "${functionName}" has an invalid egress setting`,
        ' Egress setting should be ALL_TRAFFIC, PRIVATE_RANGES_ONLY or VPC_CONNECTOR_EGRESS_SETTINGS_UNSPECIFIED',
        ' Please check the docs for more info.',
      ].join('');
      throw new Error(errorMessage);
    }
  }
};

/**
 * Validate the function ingress settings per
 * https://cloud.google.com/functions/docs/reference/rest/v1/projects.locations.functions#ingresssettings
 * @param {*} funcObject
 * @param {*} functionName
 */
const validateVpcIngressProperty = (funcObject, functionName) => {
  if (funcObject.ingress && typeof funcObject.ingress === 'string') {
    const validTypes = ['INGRESS_SETTINGS_UNSPECIFIED', 'ALLOW_ALL', 'ALLOW_INTERNAL_ONLY', 'ALLOW_INTERNAL_AND_GCLB'];
    if (!validTypes.includes(funcObject.ingress)) {
      const errorMessage = [
        `The function "${functionName}" has an invalid ingress setting`,
        ' Ingress setting should be ALLOW_ALL, ALLOW_INTERNAL_ONLY, ALLOW_INTERNAL_AND_GCLB or INGRESS_SETTINGS_UNSPECIFIED',
        ' Please check the docs for more info.',
      ].join('');
      throw new Error(errorMessage);
    }
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
  };
};
