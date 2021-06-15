'use strict';

const sinon = require('sinon');

const GoogleProvider = require('../../provider/googleProvider');
const GoogleDeploy = require('../googleDeploy');
const Serverless = require('../../test/serverless');

describe('SetIamPolicy', () => {
  let serverless;
  let googleDeploy;
  let requestStub;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.service.service = 'my-service';
    serverless.service.provider = {
      project: 'my-project',
    };
    serverless.config = {
      servicePath: 'tmp',
    };
    serverless.setProvider('google', new GoogleProvider(serverless));
    const options = {
      stage: 'dev',
      region: 'us-central1',
    };
    googleDeploy = new GoogleDeploy(serverless, options);
    requestStub = sinon.stub(googleDeploy.provider, 'request');
  });

  afterEach(() => {
    googleDeploy.provider.request.restore();
  });

  describe('#setIamPolicy', () => {
    let getFunctionsStub;
    let setPoliciesStub;

    beforeEach(() => {
      getFunctionsStub = sinon.stub(googleDeploy, 'getFunctions').returns(Promise.resolve());
      setPoliciesStub = sinon.stub(googleDeploy, 'setPolicies').returns(Promise.resolve());
    });

    afterEach(() => {
      googleDeploy.getFunctions.restore();
      googleDeploy.setPolicies.restore();
    });

    it('should run the promise chain', () => {
      googleDeploy.setIamPolicy().then(() => {
        expect(getFunctionsStub.calledOnce).toEqual(true);
        expect(setPoliciesStub.calledAfter(getFunctionsStub));
      });
    });
  });

  describe('#getFunctions', () => {
    it('should return "undefined" if no functions are found', () => {
      requestStub.returns(Promise.resolve([]));

      return googleDeploy.getFunctions().then((foundFunctions) => {
        expect(foundFunctions).toEqual(undefined);
        expect(
          requestStub.calledWithExactly(
            'cloudfunctions',
            'projects',
            'locations',
            'functions',
            'list',
            {
              parent: 'projects/my-project/locations/us-central1',
            }
          )
        ).toEqual(true);
      });
    });

    it('should return all functions that are found', () => {
      const response = {
        functions: [{ name: 'cloud-function-1' }, { name: 'cloud-function-2' }],
      };
      requestStub.returns(Promise.resolve(response));

      return googleDeploy.getFunctions().then((foundFunctions) => {
        expect(foundFunctions).toEqual([
          { name: 'cloud-function-1' },
          { name: 'cloud-function-2' },
        ]);
        expect(
          requestStub.calledWithExactly(
            'cloudfunctions',
            'projects',
            'locations',
            'functions',
            'list',
            {
              parent: 'projects/my-project/locations/us-central1',
            }
          )
        ).toEqual(true);
      });
    });
  });

  describe('#setPolicies', () => {
    let consoleLogStub;

    beforeEach(() => {
      consoleLogStub = sinon.stub(googleDeploy.serverless.cli, 'log').returns();
      googleDeploy.serverless.service.provider.functionIamBindings = {};
    });

    afterEach(() => {
      googleDeploy.serverless.cli.log.restore();
    });

    it('should resolve if functionIamBindings is undefined', () => {
      const foundFunctions = [{ name: 'cloud-function-1' }, { name: 'cloud-function-2' }];
      delete googleDeploy.serverless.service.provider.functionIamBindings;

      return googleDeploy.setPolicies(foundFunctions).then(() => {
        expect(consoleLogStub.calledOnce).toEqual(false);
      });
    });

    it('should resolve if there are no IAM policies configured', () => {
      const foundFunctions = [{ name: 'cloud-function-1' }, { name: 'cloud-function-2' }];

      return googleDeploy.setPolicies(foundFunctions).then(() => {
        expect(consoleLogStub.calledOnce).toEqual(false);
      });
    });

    it('should error if there are no existing functions to apply configured IAM to', () => {
      const foundFunctions = [];
      googleDeploy.serverless.service.provider.functionIamBindings = {
        'cloud-function-1': [{ role: 'roles/cloudfunctions.invoker', members: ['allUsers'] }],
      };

      expect(() => googleDeploy.setPolicies(foundFunctions)).toThrow(Error);
      expect(consoleLogStub.calledOnce).toEqual(true);
      expect(requestStub.calledOnce).toEqual(false);
    });

    it('should error if a configured function is not found', () => {
      const foundFunctions = [{ name: 'cloud-function-2' }];
      googleDeploy.serverless.service.provider.functionIamBindings = {
        'cloud-function-1': [{ role: 'roles/cloudfunctions.invoker', members: ['allUsers'] }],
      };

      expect(() => googleDeploy.setPolicies(foundFunctions)).toThrow(Error);
      expect(consoleLogStub.calledOnce).toEqual(true);
      expect(requestStub.calledOnce).toEqual(false);
    });

    it('should set the IAM policy for the configured functions', () => {
      const foundFunctions = [{ name: 'cloud-function-1' }, { name: 'cloud-function-2' }];
      googleDeploy.serverless.service.provider.functionIamBindings = {
        'cloud-function-2': [{ role: 'roles/cloudfunctions.invoker', members: ['allUsers'] }],
      };
      requestStub.returns(Promise.resolve());

      return googleDeploy.setPolicies(foundFunctions).then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(
          requestStub.calledWithExactly(
            'cloudfunctions',
            'projects',
            'locations',
            'functions',
            'setIamPolicy',
            {
              resource: 'cloud-function-2',
              requestBody: {
                policy: {
                  bindings: [
                    {
                      role: 'roles/cloudfunctions.invoker',
                      members: ['allUsers'],
                    },
                  ],
                },
              },
            }
          )
        ).toEqual(true);
      });
    });
  });
});
