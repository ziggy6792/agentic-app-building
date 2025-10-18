/* eslint-disable @typescript-eslint/triple-slash-reference */

/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app(input) {
    return {
      name: 'zc-app',
      home: 'aws' as const,
      providers: {
        aws: {
          version: '6.66.2',
          region: 'ap-southeast-1',
        },
      },
    };
  },
  async run() {
    const webApp = new sst.aws.Nextjs('WebApp', {
      buildCommand: 'echo buildeded by turbo',
      path: '../web-app',
      server: {
        timeout: '60 seconds',
      },
    });

    return {
      [`SST_RESOURCE_WebApp`]: webApp.url,
    };
  },
});
