'use strict';

const sinon = require('sinon');
const BbPromise = require('bluebird');

const GoogleProvider = require('../../provider/googleProvider');
const GoogleRemove = require('../googleRemove');
const Serverless = require('../../test/serverless');

describe('EmptyDeploymentBucket', () => {
  let serverless;
  let googleRemove;
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
    googleRemove = new GoogleRemove(serverless, options);
    key = `serverless/${serverless.service.service}/${options.stage}`;
  });

  describe('#emptyDeploymentBucket()', () => {
    let getObjectsToRemoveStub;
    let removeObjectsStub;

    beforeEach(() => {
      getObjectsToRemoveStub = sinon
        .stub(googleRemove, 'getObjectsToRemove')
        .returns(BbPromise.resolve());
      removeObjectsStub = sinon.stub(googleRemove, 'removeObjects').returns(BbPromise.resolve());
    });

    afterEach(() => {
      googleRemove.getObjectsToRemove.restore();
      googleRemove.removeObjects.restore();
    });

    it('should run promise chain', () =>
      googleRemove.emptyDeploymentBucket().then(() => {
        expect(getObjectsToRemoveStub.calledOnce).toEqual(true);
        expect(removeObjectsStub.calledAfter(getObjectsToRemoveStub));
      }));
  });

  describe('#getObjectsToRemove()', () => {
    let requestStub;

    beforeEach(() => {
      requestStub = sinon.stub(googleRemove.provider, 'request');
    });

    afterEach(() => {
      googleRemove.provider.request.restore();
    });

    it('should resolve if there are no objects in the deployment bucket', () => {
      const response = {
        items: [],
      };
      requestStub.returns(BbPromise.resolve(response));

      return googleRemove.getObjectsToRemove().then((objects) => {
        expect(objects.length).toEqual(0);
        expect(objects).toEqual([]);
        expect(
          requestStub.calledWithExactly('storage', 'objects', 'list', {
            bucket: 'sls-my-service-dev-12345678',
          })
        ).toEqual(true);
      });
    });

    it('should return all the objects in the deployment bucket', () => {
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
        ],
      };
      requestStub.returns(BbPromise.resolve(response));

      return googleRemove.getObjectsToRemove().then((objects) => {
        expect(objects.length).toEqual(2);
        expect(objects).toContainEqual({
          bucket: 'sls-my-service-dev-12345678',
          name: `${key}/151224711231-2016-08-18T15:42:00/artifact.zip`,
        });
        expect(objects).toContainEqual({
          bucket: 'sls-my-service-dev-12345678',
          name: `${key}/141264711231-2016-08-18T15:43:00/artifact.zip`,
        });
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
      requestStub = sinon.stub(googleRemove.provider, 'request');
      consoleLogStub = sinon.stub(googleRemove.serverless.cli, 'log').returns();
    });

    afterEach(() => {
      googleRemove.provider.request.restore();
      googleRemove.serverless.cli.log.restore();
    });

    it('should resolve if no objects should be removed', () => {
      const objectsToRemove = [];

      return googleRemove.removeObjects(objectsToRemove).then(() => {
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
      ];

      requestStub.returns(BbPromise.resolve('removePromise'));

      return googleRemove.removeObjects(objectsToRemove).then((removePromises) => {
        expect(requestStub.called).toEqual(true);
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(removePromises).toEqual(['removePromise', 'removePromise']);
      });
    });
  });
});
