'use strict';

const sinon = require('sinon');

const GoogleProvider = require('../../provider/googleProvider');
const GooglePackage = require('../googlePackage');
const Serverless = require('../../test/serverless');

describe('CompileFunctions', () => {
  let serverless;
  let googlePackage;
  let consoleLogStub;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.service.service = 'my-service';
    serverless.service.package = {
      artifact: 'artifact.zip',
      artifactDirectoryName: 'some-path',
    };
    serverless.service.provider = {
      compiledConfigurationTemplate: {
        resources: [],
      },
      deploymentBucketName: 'sls-my-service-dev-12345678',
      project: 'myProject',
      region: 'us-central1',
    };
    serverless.setProvider('google', new GoogleProvider(serverless));
    const options = {
      stage: 'dev',
    };
    googlePackage = new GooglePackage(serverless, options);
    consoleLogStub = sinon.stub(googlePackage.serverless.cli, 'log').returns();
    serverless.service.provider.functionIamBindings = {};
  });

  afterEach(() => {
    googlePackage.serverless.cli.log.restore();
  });

  describe('#compileFunctions()', () => {
    it('should throw an error if the function has no handler property', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: null,
        },
      };

      expect(() => googlePackage.compileFunctions()).toThrow(Error);
    });

    it('should throw an error if the function has no events property', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: null,
        },
      };

      expect(() => googlePackage.compileFunctions()).toThrow(Error);
    });

    it('should throw an error if the function has 0 events', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [],
        },
      };

      expect(() => googlePackage.compileFunctions()).toThrow(Error);
    });

    it('should throw an error if the function has more than 1 event', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [{ http: 'event1' }, { http: 'event2' }],
        },
      };

      expect(() => googlePackage.compileFunctions()).toThrow(Error);
    });

    it('should throw an error if the functions event is not supported', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [{ invalidEvent: 'event1' }],
        },
      };

      expect(() => googlePackage.compileFunctions()).toThrow(Error);
    });

    it('should set the memory size based on the functions configuration', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          memorySize: 1024,
          runtime: 'nodejs10',
          events: [{ http: 'foo' }],
        },
      };

      const compiledResources = [
        {
          type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
          name: 'my-service-dev-func1',
          properties: {
            parent: 'projects/myProject/locations/us-central1',
            runtime: 'nodejs10',
            function: 'my-service-dev-func1',
            entryPoint: 'func1',
            availableMemoryMb: 1024,
            timeout: '60s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            httpsTrigger: {
              url: 'foo',
            },
            labels: {},
          },
          accessControl: {
            gcpIamPolicy: {
              bindings: [],
            },
          },
        },
      ];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(
          googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources
        ).toEqual(compiledResources);
        expect(googlePackage.serverless.service.provider.functionIamBindings).toEqual({});
      });
    });

    it('should set the memory size based on the provider configuration', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [{ http: 'foo' }],
        },
      };
      googlePackage.serverless.service.provider.memorySize = 1024;

      const compiledResources = [
        {
          type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
          name: 'my-service-dev-func1',
          properties: {
            parent: 'projects/myProject/locations/us-central1',
            runtime: 'nodejs10',
            function: 'my-service-dev-func1',
            entryPoint: 'func1',
            availableMemoryMb: 1024,
            timeout: '60s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            httpsTrigger: {
              url: 'foo',
            },
            labels: {},
          },
          accessControl: {
            gcpIamPolicy: {
              bindings: [],
            },
          },
        },
      ];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(
          googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources
        ).toEqual(compiledResources);
        expect(googlePackage.serverless.service.provider.functionIamBindings).toEqual({});
      });
    });

    it('should set the timout based on the functions configuration', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          timeout: '120s',
          events: [{ http: 'foo' }],
        },
      };

      const compiledResources = [
        {
          type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
          name: 'my-service-dev-func1',
          properties: {
            parent: 'projects/myProject/locations/us-central1',
            runtime: 'nodejs10',
            function: 'my-service-dev-func1',
            entryPoint: 'func1',
            availableMemoryMb: 256,
            timeout: '120s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            httpsTrigger: {
              url: 'foo',
            },
            labels: {},
          },
          accessControl: {
            gcpIamPolicy: {
              bindings: [],
            },
          },
        },
      ];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(
          googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources
        ).toEqual(compiledResources);
        expect(googlePackage.serverless.service.provider.functionIamBindings).toEqual({});
      });
    });

    it('should set the timeout based on the provider configuration', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [{ http: 'foo' }],
        },
      };
      googlePackage.serverless.service.provider.timeout = '120s';

      const compiledResources = [
        {
          type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
          name: 'my-service-dev-func1',
          properties: {
            parent: 'projects/myProject/locations/us-central1',
            runtime: 'nodejs10',
            function: 'my-service-dev-func1',
            entryPoint: 'func1',
            availableMemoryMb: 256,
            timeout: '120s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            httpsTrigger: {
              url: 'foo',
            },
            labels: {},
          },
          accessControl: {
            gcpIamPolicy: {
              bindings: [],
            },
          },
        },
      ];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(
          googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources
        ).toEqual(compiledResources);
        expect(googlePackage.serverless.service.provider.functionIamBindings).toEqual({});
      });
    });

    it('should set the labels based on the functions configuration', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          labels: {
            test: 'label',
          },
          events: [{ http: 'foo' }],
        },
      };

      const compiledResources = [
        {
          type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
          name: 'my-service-dev-func1',
          properties: {
            parent: 'projects/myProject/locations/us-central1',
            runtime: 'nodejs10',
            function: 'my-service-dev-func1',
            entryPoint: 'func1',
            availableMemoryMb: 256,
            timeout: '60s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            httpsTrigger: {
              url: 'foo',
            },
            labels: {
              test: 'label',
            },
          },
          accessControl: {
            gcpIamPolicy: {
              bindings: [],
            },
          },
        },
      ];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(
          googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources
        ).toEqual(compiledResources);
        expect(googlePackage.serverless.service.provider.functionIamBindings).toEqual({});
      });
    });

    it('should set the labels based on the provider configuration', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [{ http: 'foo' }],
        },
      };
      googlePackage.serverless.service.provider.labels = {
        test: 'label',
      };

      const compiledResources = [
        {
          type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
          name: 'my-service-dev-func1',
          properties: {
            parent: 'projects/myProject/locations/us-central1',
            runtime: 'nodejs10',
            function: 'my-service-dev-func1',
            entryPoint: 'func1',
            availableMemoryMb: 256,
            timeout: '60s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            httpsTrigger: {
              url: 'foo',
            },
            labels: {
              test: 'label',
            },
          },
          accessControl: {
            gcpIamPolicy: {
              bindings: [],
            },
          },
        },
      ];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(
          googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources
        ).toEqual(compiledResources);
        expect(googlePackage.serverless.service.provider.functionIamBindings).toEqual({});
      });
    });

    it('should set the labels based on the merged provider and function configuration', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [{ http: 'foo' }],
          labels: {
            test: 'functionLabel',
          },
        },
      };
      googlePackage.serverless.service.provider.labels = {
        test: 'providerLabel',
        secondTest: 'tested',
      };

      const compiledResources = [
        {
          type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
          name: 'my-service-dev-func1',
          properties: {
            parent: 'projects/myProject/locations/us-central1',
            runtime: 'nodejs10',
            function: 'my-service-dev-func1',
            entryPoint: 'func1',
            availableMemoryMb: 256,
            timeout: '60s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            httpsTrigger: {
              url: 'foo',
            },
            labels: {
              test: 'functionLabel',
              secondTest: 'tested',
            },
          },
          accessControl: {
            gcpIamPolicy: {
              bindings: [],
            },
          },
        },
      ];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(
          googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources
        ).toEqual(compiledResources);
        expect(googlePackage.serverless.service.provider.functionIamBindings).toEqual({});
      });
    });

    it('should set the environment variables based on the function configuration', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          environment: {
            TEST_VAR: 'test',
          },
          events: [{ http: 'foo' }],
        },
      };

      const compiledResources = [
        {
          type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
          name: 'my-service-dev-func1',
          properties: {
            parent: 'projects/myProject/locations/us-central1',
            runtime: 'nodejs10',
            function: 'my-service-dev-func1',
            entryPoint: 'func1',
            availableMemoryMb: 256,
            environmentVariables: {
              TEST_VAR: 'test',
            },
            timeout: '60s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            httpsTrigger: {
              url: 'foo',
            },
            labels: {},
          },
          accessControl: {
            gcpIamPolicy: {
              bindings: [],
            },
          },
        },
      ];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(
          googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources
        ).toEqual(compiledResources);
        expect(googlePackage.serverless.service.provider.functionIamBindings).toEqual({});
      });
    });

    it('should set the environment variables based on the provider configuration', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [{ http: 'foo' }],
        },
      };
      googlePackage.serverless.service.provider.environment = {
        TEST_VAR: 'test',
      };

      const compiledResources = [
        {
          type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
          name: 'my-service-dev-func1',
          properties: {
            parent: 'projects/myProject/locations/us-central1',
            runtime: 'nodejs10',
            function: 'my-service-dev-func1',
            entryPoint: 'func1',
            availableMemoryMb: 256,
            environmentVariables: {
              TEST_VAR: 'test',
            },
            timeout: '60s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            httpsTrigger: {
              url: 'foo',
            },
            labels: {},
          },
          accessControl: {
            gcpIamPolicy: {
              bindings: [],
            },
          },
        },
      ];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(
          googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources
        ).toEqual(compiledResources);
        expect(googlePackage.serverless.service.provider.functionIamBindings).toEqual({});
      });
    });

    it('should merge the environment variables on the provider configuration and function definition', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          environment: {
            TEST_VAR: 'test_var',
            TEST_VALUE: 'foobar',
          },
          events: [{ http: 'foo' }],
        },
      };
      googlePackage.serverless.service.provider.environment = {
        TEST_VAR: 'test',
        TEST_FOO: 'foo',
      };

      const compiledResources = [
        {
          type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
          name: 'my-service-dev-func1',
          properties: {
            parent: 'projects/myProject/locations/us-central1',
            runtime: 'nodejs10',
            function: 'my-service-dev-func1',
            entryPoint: 'func1',
            availableMemoryMb: 256,
            environmentVariables: {
              TEST_VAR: 'test_var',
              TEST_VALUE: 'foobar',
              TEST_FOO: 'foo',
            },
            timeout: '60s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            httpsTrigger: {
              url: 'foo',
            },
            labels: {},
          },
          accessControl: {
            gcpIamPolicy: {
              bindings: [],
            },
          },
        },
      ];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(
          googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources
        ).toEqual(compiledResources);
        expect(googlePackage.serverless.service.provider.environment).toEqual({
          TEST_VAR: 'test',
          TEST_FOO: 'foo',
        });
        expect(googlePackage.serverless.service.provider.functionIamBindings).toEqual({});
      });
    });

    it('should compile "http" events properly', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [{ http: 'foo' }],
        },
      };

      const compiledResources = [
        {
          type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
          name: 'my-service-dev-func1',
          properties: {
            parent: 'projects/myProject/locations/us-central1',
            runtime: 'nodejs10',
            function: 'my-service-dev-func1',
            entryPoint: 'func1',
            availableMemoryMb: 256,
            timeout: '60s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            httpsTrigger: {
              url: 'foo',
            },
            labels: {},
          },
          accessControl: {
            gcpIamPolicy: {
              bindings: [],
            },
          },
        },
      ];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(
          googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources
        ).toEqual(compiledResources);
        expect(googlePackage.serverless.service.provider.functionIamBindings).toEqual({});
      });
    });

    it('should compile "event" events properly', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [
            {
              event: {
                eventType: 'foo',
                path: 'some-path',
                resource: 'some-resource',
              },
            },
          ],
        },
        func2: {
          handler: 'func2',
          events: [
            {
              event: {
                eventType: 'foo',
                resource: 'some-resource',
              },
            },
          ],
        },
      };

      const compiledResources = [
        {
          type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
          name: 'my-service-dev-func1',
          properties: {
            parent: 'projects/myProject/locations/us-central1',
            runtime: 'nodejs10',
            function: 'my-service-dev-func1',
            entryPoint: 'func1',
            availableMemoryMb: 256,
            timeout: '60s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            eventTrigger: {
              eventType: 'foo',
              path: 'some-path',
              resource: 'some-resource',
            },
            labels: {},
          },
          accessControl: {
            gcpIamPolicy: {
              bindings: [],
            },
          },
        },
        {
          type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
          name: 'my-service-dev-func2',
          properties: {
            parent: 'projects/myProject/locations/us-central1',
            runtime: 'nodejs10',
            function: 'my-service-dev-func2',
            entryPoint: 'func2',
            availableMemoryMb: 256,
            timeout: '60s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            eventTrigger: {
              eventType: 'foo',
              resource: 'some-resource',
            },
            labels: {},
          },
          accessControl: {
            gcpIamPolicy: {
              bindings: [],
            },
          },
        },
      ];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.called).toEqual(true);
        expect(
          googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources
        ).toEqual(compiledResources);
        expect(googlePackage.serverless.service.provider.functionIamBindings).toEqual({});
      });
    });

    it('should set vpc connection base on the function configuration', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          memorySize: 128,
          runtime: 'nodejs10',
          vpc: 'projects/pg-us-n-app-123456/locations/us-central1/connectors/my-vpc',
          events: [{ http: 'foo' }],
        },
      };

      const compiledResources = [
        {
          type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
          name: 'my-service-dev-func1',
          properties: {
            parent: 'projects/myProject/locations/us-central1',
            runtime: 'nodejs10',
            function: 'my-service-dev-func1',
            entryPoint: 'func1',
            availableMemoryMb: 128,
            timeout: '60s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            httpsTrigger: {
              url: 'foo',
            },
            labels: {},
            vpcConnector: 'projects/pg-us-n-app-123456/locations/us-central1/connectors/my-vpc',
          },
          accessControl: {
            gcpIamPolicy: {
              bindings: [],
            },
          },
        },
      ];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.called).toEqual(true);
        expect(
          googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources
        ).toEqual(compiledResources);
        expect(googlePackage.serverless.service.provider.functionIamBindings).toEqual({});
      });
    });

    it('should set max instances on the function configuration', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          memorySize: 128,
          runtime: 'nodejs10',
          maxInstances: 10,
          vpc: 'projects/pg-us-n-app-123456/locations/us-central1/connectors/my-vpc',
          events: [{ http: 'foo' }],
        },
      };

      const compiledResources = [
        {
          type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
          name: 'my-service-dev-func1',
          properties: {
            parent: 'projects/myProject/locations/us-central1',
            runtime: 'nodejs10',
            function: 'my-service-dev-func1',
            entryPoint: 'func1',
            availableMemoryMb: 128,
            timeout: '60s',
            maxInstances: 10,
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            httpsTrigger: {
              url: 'foo',
            },
            labels: {},
            vpcConnector: 'projects/pg-us-n-app-123456/locations/us-central1/connectors/my-vpc',
          },
          accessControl: {
            gcpIamPolicy: {
              bindings: [],
            },
          },
        },
      ];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.called).toEqual(true);
        expect(
          googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources
        ).toEqual(compiledResources);
        expect(googlePackage.serverless.service.provider.functionIamBindings).toEqual({});
      });
    });

    it('should not require max instances on each function configuration', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          memorySize: 128,
          runtime: 'nodejs10',
          vpc: 'projects/pg-us-n-app-123456/locations/us-central1/connectors/my-vpc',
          events: [{ http: 'foo' }],
        },
        func2: {
          handler: 'func2',
          memorySize: 128,
          runtime: 'nodejs10',
          maxInstances: 10,
          vpc: 'projects/pg-us-n-app-123456/locations/us-central1/connectors/my-vpc',
          events: [{ http: 'bar' }],
        },
      };

      const compiledResources = [
        {
          type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
          name: 'my-service-dev-func1',
          properties: {
            parent: 'projects/myProject/locations/us-central1',
            runtime: 'nodejs10',
            function: 'my-service-dev-func1',
            entryPoint: 'func1',
            availableMemoryMb: 128,
            timeout: '60s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            httpsTrigger: {
              url: 'foo',
            },
            labels: {},
            vpcConnector: 'projects/pg-us-n-app-123456/locations/us-central1/connectors/my-vpc',
          },
          accessControl: {
            gcpIamPolicy: {
              bindings: [],
            },
          },
        },
        {
          type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
          name: 'my-service-dev-func2',
          properties: {
            parent: 'projects/myProject/locations/us-central1',
            runtime: 'nodejs10',
            function: 'my-service-dev-func2',
            entryPoint: 'func2',
            availableMemoryMb: 128,
            timeout: '60s',
            maxInstances: 10,
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            httpsTrigger: {
              url: 'bar',
            },
            labels: {},
            vpcConnector: 'projects/pg-us-n-app-123456/locations/us-central1/connectors/my-vpc',
          },
          accessControl: {
            gcpIamPolicy: {
              bindings: [],
            },
          },
        },
      ];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.called).toEqual(true);
        expect(
          googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources
        ).toEqual(compiledResources);
        expect(googlePackage.serverless.service.provider.functionIamBindings).toEqual({});
      });
    });

    it('should throw an error if an IAM policy binding has no role', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [{ http: 'foo' }],
          iam: {
            bindings: [
              {
                members: ['foobar'],
              },
            ],
          },
        },
      };

      expect(() => googlePackage.compileFunctions()).toThrow(Error);
    });

    it('should throw an error if an IAM policy binding has no members defined', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [{ http: 'foo' }],
          iam: {
            bindings: [
              {
                role: 'foobar',
              },
            ],
          },
        },
      };

      expect(() => googlePackage.compileFunctions()).toThrow(Error);
    });

    it('should throw an error if an IAM policy binding has 0 members', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [{ http: 'foo' }],
          iam: {
            bindings: [
              {
                role: 'foobar',
                members: [],
              },
            ],
          },
        },
      };

      expect(() => googlePackage.compileFunctions()).toThrow(Error);
    });

    it('should add the cloudfunctions.invoker role for allUsers when allowUnauthenticated is set on a function for "http" event', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [{ http: 'foo' }],
          allowUnauthenticated: true,
        },
      };

      const compiledResources = [
        {
          type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
          name: 'my-service-dev-func1',
          properties: {
            parent: 'projects/myProject/locations/us-central1',
            runtime: 'nodejs10',
            function: 'my-service-dev-func1',
            entryPoint: 'func1',
            availableMemoryMb: 256,
            timeout: '60s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            httpsTrigger: {
              url: 'foo',
            },
            labels: {},
          },
          accessControl: {
            gcpIamPolicy: {
              bindings: [],
            },
          },
        },
      ];
      const functionIamBindings = {
        'projects/myProject/locations/us-central1/functions/my-service-dev-func1': [
          {
            role: 'roles/cloudfunctions.invoker',
            members: ['allUsers'],
          },
        ],
      };

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(
          googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources
        ).toEqual(compiledResources);
        expect(googlePackage.serverless.service.provider.functionIamBindings).toEqual(
          functionIamBindings
        );
      });
    });

    it('should add the cloudfunctions.invoker role for allUsers when allowUnauthenticated is set on the provider for "http" event', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [{ http: 'foo' }],
        },
      };
      googlePackage.serverless.service.provider.allowUnauthenticated = true;

      const compiledResources = [
        {
          type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
          name: 'my-service-dev-func1',
          properties: {
            parent: 'projects/myProject/locations/us-central1',
            runtime: 'nodejs10',
            function: 'my-service-dev-func1',
            entryPoint: 'func1',
            availableMemoryMb: 256,
            timeout: '60s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            httpsTrigger: {
              url: 'foo',
            },
            labels: {},
          },
          accessControl: {
            gcpIamPolicy: {
              bindings: [],
            },
          },
        },
      ];
      const functionIamBindings = {
        'projects/myProject/locations/us-central1/functions/my-service-dev-func1': [
          {
            role: 'roles/cloudfunctions.invoker',
            members: ['allUsers'],
          },
        ],
      };

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(
          googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources
        ).toEqual(compiledResources);
        expect(googlePackage.serverless.service.provider.functionIamBindings).toEqual(
          functionIamBindings
        );
      });
    });

    it('should not add the cloudfunctions.invoker role for allUsers when allowUnauthenticated is set on a function for "event" event', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [
            {
              event: {
                eventType: 'foo',
                resource: 'some-resource',
              },
            },
          ],
          allowUnauthenticated: true,
        },
      };

      const compiledResources = [
        {
          type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
          name: 'my-service-dev-func1',
          properties: {
            parent: 'projects/myProject/locations/us-central1',
            runtime: 'nodejs10',
            function: 'my-service-dev-func1',
            entryPoint: 'func1',
            availableMemoryMb: 256,
            timeout: '60s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            eventTrigger: {
              eventType: 'foo',
              resource: 'some-resource',
            },
            labels: {},
          },
          accessControl: {
            gcpIamPolicy: {
              bindings: [],
            },
          },
        },
      ];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(
          googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources
        ).toEqual(compiledResources);
        expect(googlePackage.serverless.service.provider.functionIamBindings).toEqual({});
      });
    });

    it('should not add the cloudfunctions.invoker role for allUsers when allowUnauthenticated is set on the provider for "event" event', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [
            {
              event: {
                eventType: 'foo',
                resource: 'some-resource',
              },
            },
          ],
        },
      };
      googlePackage.serverless.service.provider.allowUnauthenticated = true;

      const compiledResources = [
        {
          type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
          name: 'my-service-dev-func1',
          properties: {
            parent: 'projects/myProject/locations/us-central1',
            runtime: 'nodejs10',
            function: 'my-service-dev-func1',
            entryPoint: 'func1',
            availableMemoryMb: 256,
            timeout: '60s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            eventTrigger: {
              eventType: 'foo',
              resource: 'some-resource',
            },
            labels: {},
          },
          accessControl: {
            gcpIamPolicy: {
              bindings: [],
            },
          },
        },
      ];

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(
          googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources
        ).toEqual(compiledResources);
        expect(googlePackage.serverless.service.provider.functionIamBindings).toEqual({});
      });
    });

    it('should add the custom IAM policy bindings based on function configuration', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [{ http: 'foo' }],
          iam: {
            bindings: [
              {
                role: 'roles/foobar',
                members: ['some-user'],
              },
            ],
          },
        },
      };

      const compiledResources = [
        {
          type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
          name: 'my-service-dev-func1',
          properties: {
            parent: 'projects/myProject/locations/us-central1',
            runtime: 'nodejs10',
            function: 'my-service-dev-func1',
            entryPoint: 'func1',
            availableMemoryMb: 256,
            timeout: '60s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            httpsTrigger: {
              url: 'foo',
            },
            labels: {},
          },
          accessControl: {
            gcpIamPolicy: {
              bindings: [],
            },
          },
        },
      ];
      const functionIamBindings = {
        'projects/myProject/locations/us-central1/functions/my-service-dev-func1': [
          {
            role: 'roles/foobar',
            members: ['some-user'],
          },
        ],
      };

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(
          googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources
        ).toEqual(compiledResources);
        expect(googlePackage.serverless.service.provider.functionIamBindings).toEqual(
          functionIamBindings
        );
      });
    });

    it('should add the custom IAM policy bindings based on the provider configuration', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [{ http: 'foo' }],
        },
      };
      googlePackage.serverless.service.provider.iam = {
        bindings: [
          {
            role: 'roles/foobar',
            members: ['some-user'],
          },
        ],
      };

      const compiledResources = [
        {
          type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
          name: 'my-service-dev-func1',
          properties: {
            parent: 'projects/myProject/locations/us-central1',
            runtime: 'nodejs10',
            function: 'my-service-dev-func1',
            entryPoint: 'func1',
            availableMemoryMb: 256,
            timeout: '60s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            httpsTrigger: {
              url: 'foo',
            },
            labels: {},
          },
          accessControl: {
            gcpIamPolicy: {
              bindings: [],
            },
          },
        },
      ];
      const functionIamBindings = {
        'projects/myProject/locations/us-central1/functions/my-service-dev-func1': [
          {
            role: 'roles/foobar',
            members: ['some-user'],
          },
        ],
      };

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(
          googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources
        ).toEqual(compiledResources);
        expect(googlePackage.serverless.service.provider.functionIamBindings).toEqual(
          functionIamBindings
        );
      });
    });

    it('should add the custom IAM policy bindings based on the merged provider and function configuration', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [{ http: 'foo' }],
          iam: {
            bindings: [
              {
                role: 'role2',
                members: ['user1'],
              },
              {
                role: 'role3',
                members: ['user4', 'user2'],
              },
            ],
          },
        },
      };
      googlePackage.serverless.service.provider.iam = {
        bindings: [
          {
            role: 'role1',
            members: ['user1'],
          },
          {
            role: 'role2',
            members: ['user1', 'user2', 'user3'],
          },
        ],
      };

      const compiledResources = [
        {
          type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
          name: 'my-service-dev-func1',
          properties: {
            parent: 'projects/myProject/locations/us-central1',
            runtime: 'nodejs10',
            function: 'my-service-dev-func1',
            entryPoint: 'func1',
            availableMemoryMb: 256,
            timeout: '60s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            httpsTrigger: {
              url: 'foo',
            },
            labels: {},
          },
          accessControl: {
            gcpIamPolicy: {
              bindings: [],
            },
          },
        },
      ];
      const functionIamBindings = {
        'projects/myProject/locations/us-central1/functions/my-service-dev-func1': [
          {
            role: 'role2',
            members: ['user1', 'user2', 'user3'],
          },
          {
            role: 'role3',
            members: ['user4', 'user2'],
          },
          {
            role: 'role1',
            members: ['user1'],
          },
        ],
      };

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(
          googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources
        ).toEqual(compiledResources);
        expect(googlePackage.serverless.service.provider.functionIamBindings).toEqual(
          functionIamBindings
        );
      });
    });

    it('should merge the allowUnauthenticated binding with custom bindings', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [{ http: 'foo' }],
          allowUnauthenticated: true,
          iam: {
            bindings: [
              {
                role: 'role1',
                members: ['user1'],
              },
            ],
          },
        },
      };

      const compiledResources = [
        {
          type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
          name: 'my-service-dev-func1',
          properties: {
            parent: 'projects/myProject/locations/us-central1',
            runtime: 'nodejs10',
            function: 'my-service-dev-func1',
            entryPoint: 'func1',
            availableMemoryMb: 256,
            timeout: '60s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            httpsTrigger: {
              url: 'foo',
            },
            labels: {},
          },
          accessControl: {
            gcpIamPolicy: {
              bindings: [],
            },
          },
        },
      ];
      const functionIamBindings = {
        'projects/myProject/locations/us-central1/functions/my-service-dev-func1': [
          {
            role: 'role1',
            members: ['user1'],
          },
          {
            role: 'roles/cloudfunctions.invoker',
            members: ['allUsers'],
          },
        ],
      };

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(
          googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources
        ).toEqual(compiledResources);
        expect(googlePackage.serverless.service.provider.functionIamBindings).toEqual(
          functionIamBindings
        );
      });
    });

    it('should merge the allowUnauthenticated binding with custom bindings with same role', () => {
      googlePackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [{ http: 'foo' }],
          allowUnauthenticated: true,
          iam: {
            bindings: [
              {
                role: 'role1',
                members: ['user1'],
              },
              {
                role: 'roles/cloudfunctions.invoker',
                members: ['user1', 'user2'],
              },
            ],
          },
        },
      };

      const compiledResources = [
        {
          type: 'gcp-types/cloudfunctions-v1:projects.locations.functions',
          name: 'my-service-dev-func1',
          properties: {
            parent: 'projects/myProject/locations/us-central1',
            runtime: 'nodejs10',
            function: 'my-service-dev-func1',
            entryPoint: 'func1',
            availableMemoryMb: 256,
            timeout: '60s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            httpsTrigger: {
              url: 'foo',
            },
            labels: {},
          },
          accessControl: {
            gcpIamPolicy: {
              bindings: [],
            },
          },
        },
      ];
      const functionIamBindings = {
        'projects/myProject/locations/us-central1/functions/my-service-dev-func1': [
          {
            role: 'role1',
            members: ['user1'],
          },
          {
            role: 'roles/cloudfunctions.invoker',
            members: ['user1', 'user2', 'allUsers'],
          },
        ],
      };

      return googlePackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(
          googlePackage.serverless.service.provider.compiledConfigurationTemplate.resources
        ).toEqual(compiledResources);
        expect(googlePackage.serverless.service.provider.functionIamBindings).toEqual(
          functionIamBindings
        );
      });
    });
  });
});
