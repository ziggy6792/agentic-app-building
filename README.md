# Typescript Monorepo starter

By Simon Verhoeven

React Email runing on http://localhost:3001

## Getting started

- `yarn install`
- `yarn build` build packages
- `yarn dev` run locally for development
- `yarn deploy` deploy with SST

## Using this example

Run the following command:

```sh
npx create-turbo@latest
```

## What's inside?

This Turborepo includes the following packages/apps:

### Apps

- `lambda-api`: a [Nest.js](https://nestjs.com/) hello world app
- `sst-app`: [sst](https://sst.dev/) Deployment code deploys stack to AWS
- `cdk-app`: [cdk](https://github.com/aws/aws-cdk) Deployment code (alternative) deploys stack to AWS
- `vite-app`: [Vite.js](https://vitejs.dev/guide/) Frontend App runs on `http://localhost:5173/`
- `next-app`: [Next.js](https://nextjs.org/) Frontend App runs on `http://localhost:3000/`

### Packages

- `common`: Common code shared between packages
- `eslint-config-custom`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `tsconfig`: `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utils

- `local-lambda-server` runs `lambda-api` app on localhost:4000

### Tools

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

```
yarn build
```

### Deploy

To deploy use the following command

```
yarn deploy
```

### Develop

To develop all apps and packages, run the following command:

```
yarn dev
```

### Remote Caching

Turborepo can use a technique known as [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup), then enter the following commands:

```
cd my-turborepo
npx turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

```
npx turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks)
- [Caching](https://turbo.build/repo/docs/core-concepts/caching)
- [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [Filtering](https://turbo.build/repo/docs/core-concepts/monorepos/filtering)
- [Configuration Options](https://turbo.build/repo/docs/reference/configuration)
- [CLI Usage](https://turbo.build/repo/docs/reference/command-line-reference)
