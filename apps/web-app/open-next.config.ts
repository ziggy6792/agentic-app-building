/* eslint-disable import/no-anonymous-default-export */
export default {
  default: {
    // This is the default server, similar to the server-function in open-next v2
    override: {
      wrapper: 'aws-lambda-streaming', // This is necessary to enable lambda streaming
    },
  },
  buildCommand: 'pnpm next:build',
};
