'use strict';

const BbPromise = require('bluebird');
const _ = require('lodash');

module.exports = {
  cleanupDeploymentBucket() {
    return BbPromise.bind(this).then(this.getObjectsToRemove).then(this.removeObjects);
  },

  getObjectsToRemove() {
    const params = {
      bucket: this.serverless.service.provider.bucket.name,
    };

    return this.provider.request('storage', 'objects', 'list', params).then((response) => {
      if (!response.items.length) return BbPromise.resolve([]);

      const files = response.items;

      // 4 old ones + the one which will be uploaded after the cleanup = 5
      const objectsToKeepCount = 4;

      const orderedObjects = _.orderBy(
        files,
        (file) => {
          const timestamp = file.name.match(/(serverless)\/(.+)\/(.+)\/(\d+)-(.+)\/(.+\.zip)/)[4];
          return timestamp;
        },
        ['asc']
      );

      const objectsToKeep = _.takeRight(orderedObjects, objectsToKeepCount);
      const objectsToRemove = _.pullAllWith(files, objectsToKeep, _.isEqual);

      if (objectsToRemove.length) {
        return BbPromise.resolve(objectsToRemove);
      }

      return BbPromise.resolve([]);
    });
  },

  removeObjects(objectsToRemove) {
    if (!objectsToRemove.length) return BbPromise.resolve();

    this.serverless.cli.log('Removing old artifacts...');

    const removePromises = objectsToRemove.map((object) => {
      const params = {
        bucket: object.bucket,
        object: object.name,
      };
      return this.provider.request('storage', 'objects', 'delete', params);
    });

    return BbPromise.all(removePromises);
  },
};
