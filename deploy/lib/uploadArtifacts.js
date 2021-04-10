'use strict';

const fs = require('fs');

module.exports = {
  uploadArtifacts() {
    this.serverless.cli.log('Uploading artifacts...');

    const params = {
      bucket: this.serverless.service.provider.bucket.name,
      resource: {
        name: this.serverless.service.package.artifactFilePath,
        contentType: 'application/octet-stream',
      },
      media: {
        mimeType: 'application/octet-stream',
        body: fs.createReadStream(this.serverless.service.package.artifact),
      },
    };

    return this.provider.request('storage', 'objects', 'insert', params).then(() => {
      this.serverless.cli.log('Artifacts successfully uploaded...');
    });
  },
};
