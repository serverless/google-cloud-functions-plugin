'use strict';

const fs = require('fs');
const path = require('path');

const BbPromise = require('bluebird');

module.exports = {
  updateDeployment() {
    return BbPromise.bind(this).then(this.getDeployment).then(this.update);
  },

  getDeployment() {
    const params = {
      project: this.serverless.service.provider.project,
    };

    let name = `sls-${this.serverless.service.service}-${this.options.stage}`;
    if (this.partial) {
      name += '-partial';
    }

    return this.provider
      .request('deploymentmanager', 'deployments', 'list', params)
      .then((response) => response.deployments.find((dep) => dep.name === name));
  },

  update(deployment) {
    this.serverless.cli.log('Updating deployment...');

    const filePath = path.join(
      this.serverless.config.servicePath,
      '.serverless',
      'configuration-template-update.yml'
    );

    let deploymentName = `sls-${this.serverless.service.service}-${this.options.stage}`;
    if (this.partial) {
      deploymentName += '-partial';
    }

    const params = {
      project: this.serverless.service.provider.project,
      deployment: deploymentName,
      deletePolicy: this.serverless.service.provider.deletePolicy || 'ABANDON',
      resource: {
        name: deploymentName,
        fingerprint: deployment.fingerprint,
        target: {
          config: {
            content: fs.readFileSync(filePath).toString(),
          },
        },
      },
    };

    return this.provider
      .request('deploymentmanager', 'deployments', 'update', params)
      .then(() => this.monitorDeployment(deploymentName, 'update', 5000));
  },
};
