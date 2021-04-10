'use strict';

const sinon = require('sinon');
const BbPromise = require('bluebird');

const GoogleProvider = require('../../provider/googleProvider');
const GoogleDeploy = require('../googleDeploy');
const Serverless = require('../../test/serverless');

describe('CleanupDeploymentBucket', () => {
  let serverless;
  let googleDeploy;
  let key;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.service = {
      service: 'my-service',
      provider: {
        bucket: {
          name: 'sls-my-service-dev-12345678',
        },
      },
    };
    serverless.setProvider('google', new GoogleProvider(serverless));
    const options = {
      stage: 'dev',
      region: 'us-central1',
    };
    googleDeploy = new GoogleDeploy(serverless, options);
    key = `serverless/${serverless.service.service}/${options.stage}`;
  });

  describe('#cleanupDeploymentBucket()', () => {
    let getObjectsToRemoveStub;
    let removeObjectsStub;

    beforeEach(() => {
      getObjectsToRemoveStub = sinon
        .stub(googleDeploy, 'getObjectsToRemove')
        .returns(BbPromise.resolve());
      removeObjectsStub = sinon.stub(googleDeploy, 'removeObjects').returns(BbPromise.resolve());
    });

    afterEach(() => {
      googleDeploy.getObjectsToRemove.restore();
      googleDeploy.removeObjects.restore();
    });

    it('should run promise chain', () =>
      googleDeploy.cleanupDeploymentBucket().then(() => {
        expect(getObjectsToRemoveStub.calledOnce).toEqual(true);
        expect(removeObjectsStub.calledAfter(getObjectsToRemoveStub));
      }));
  });

  describe('#getObjectsToRemove()', () => {
    let requestStub;

    beforeEach(() => {
      requestStub = sinon.stub(googleDeploy.provider, 'request');
    });

    afterEach(() => {
      googleDeploy.provider.request.restore();
    });

    it('should return all to be removed objects (except the last 4)', () => {
      const response = {
        items: [
          {
            bucket: 'sls-my-service-dev-12345678',
            name: `${key}/151224711231-2016-08-18T15:42:00/artifact.zip`,
          },
          {
            bucket: 'sls-my-service-dev-12345678',
            name: `${key}/141264711231-2016-08-18T15:43:00/artifact.zip`,
          },
          {
            bucket: 'sls-my-service-dev-12345678',
            name: `${key}/141321321541-2016-08-18T11:23:02/artifact.zip`,
          },
          {
            bucket: 'sls-my-service-dev-12345678',
            name: `${key}/142003031341-2016-08-18T12:46:04/artifact.zip`,
          },
          {
            bucket: 'sls-my-service-dev-12345678',
            name: `${key}/113304333331-2016-08-18T13:40:06/artifact.zip`,
          },
          {
            bucket: 'sls-my-service-dev-12345678',
            name: `${key}/903940390431-2016-08-18T23:42:08/artifact.zip`,
          },
        ],
      };
      requestStub.returns(BbPromise.resolve(response));

      return googleDeploy.getObjectsToRemove().then((objects) => {
        expect(objects.length).toEqual(2);
        expect(objects).not.toContainEqual({
          bucket: 'sls-my-service-dev-12345678',
          name: `${key}/141321321541-2016-08-18T11:23:02/artifact.zip`,
        });
        expect(objects).not.toContainEqual({
          bucket: 'sls-my-service-dev-12345678',
          name: `${key}/142003031341-2016-08-18T12:46:04/artifact.zip`,
        });
        expect(objects).not.toContainEqual({
          bucket: 'sls-my-service-dev-12345678',
          name: `${key}/151224711231-2016-08-18T15:42:00/artifact.zip`,
        });
        expect(objects).not.toContainEqual({
          bucket: 'sls-my-service-dev-12345678',
          name: `${key}/903940390431-2016-08-18T23:42:08/artifact.zip`,
        });
        expect(
          requestStub.calledWithExactly('storage', 'objects', 'list', {
            bucket: 'sls-my-service-dev-12345678',
          })
        ).toEqual(true);
      });
    });

    it('should return an empty array if there are no objects which should be removed', () => {
      const response = {
        items: [
          {
            bucket: 'sls-my-service-dev-12345678',
            name: `${key}/151224711231-2016-08-18T15:42:00/artifact.zip`,
          },
          {
            bucket: 'sls-my-service-dev-12345678',
            name: `${key}/141264711231-2016-08-18T15:43:00/artifact.zip`,
          },
          {
            bucket: 'sls-my-service-dev-12345678',
            name: `${key}/141321321541-2016-08-18T11:23:02/artifact.zip`,
          },
          {
            bucket: 'sls-my-service-dev-12345678',
            name: `${key}/142003031341-2016-08-18T12:46:04/artifact.zip`,
          },
        ],
      };
      requestStub.returns(BbPromise.resolve(response));

      return googleDeploy.getObjectsToRemove().then((objects) => {
        expect(objects.length).toEqual(0);
        expect(objects).toEqual([]);
        expect(
          requestStub.calledWithExactly('storage', 'objects', 'list', {
            bucket: 'sls-my-service-dev-12345678',
          })
        ).toEqual(true);
      });
    });

    it('should return an empty array if no objects are returned', () => {
      const response = {
        items: [],
      };
      requestStub.returns(BbPromise.resolve(response));

      return googleDeploy.getObjectsToRemove().then((objects) => {
        expect(objects.length).toEqual(0);
        expect(objects).toEqual([]);
        expect(
          requestStub.calledWithExactly('storage', 'objects', 'list', {
            bucket: 'sls-my-service-dev-12345678',
          })
        ).toEqual(true);
      });
    });
  });

  describe('#removeObjects()', () => {
    let requestStub;
    let consoleLogStub;

    beforeEach(() => {
      requestStub = sinon.stub(googleDeploy.provider, 'request');
      consoleLogStub = sinon.stub(googleDeploy.serverless.cli, 'log').returns();
    });

    afterEach(() => {
      googleDeploy.provider.request.restore();
      googleDeploy.serverless.cli.log.restore();
    });

    it('should resolve if no objects should be removed', () => {
      const objectsToRemove = [];

      return googleDeploy.removeObjects(objectsToRemove).then(() => {
        expect(requestStub.calledOnce).toEqual(false);
        expect(consoleLogStub.calledOnce).toEqual(false);
      });
    });

    it('should remove all given objects', () => {
      const objectsToRemove = [
        {
          bucket: 'sls-my-service-dev-12345678',
          name: `${key}/151224711231-2016-08-18T15:42:00/artifact.zip`,
        },
        {
          bucket: 'sls-my-service-dev-12345678',
          name: `${key}/141264711231-2016-08-18T15:43:00/artifact.zip`,
        },
        {
          bucket: 'sls-my-service-dev-12345678',
          name: `${key}/141321321541-2016-08-18T11:23:02/artifact.zip`,
        },
        {
          bucket: 'sls-my-service-dev-12345678',
          name: `${key}/142003031341-2016-08-18T12:46:04/artifact.zip`,
        },
      ];

      requestStub.returns(BbPromise.resolve('removePromise'));

      return googleDeploy.removeObjects(objectsToRemove).then((removePromises) => {
        expect(requestStub.called).toEqual(true);
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(removePromises).toEqual([
          'removePromise',
          'removePromise',
          'removePromise',
          'removePromise',
        ]);
      });
    });
  });
});
