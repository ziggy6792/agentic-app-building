# Typescript Monorepo starter

By Simon Verhoeven

## Getting started

- `pnpm install`
- `pnpm build` build packages
- `pnpm dev` run locally for development
- `pnpm deploy:dev` deploy dev with SST
- `pnpm deploy:prod` deploy prod with SST

## Using this example

Run the following command:

```sh
npx create-turbo@latest
```

## What's inside?

This Turborepo includes the following packages/apps:

### Apps

- `sst-app`: [sst](https://sst.dev/) Deployment code deploys stack to AWS
- `web-app`: [Next.js](https://nextjs.org/) Frontend App runs on `http://localhost:3000/`
  This Project is forked from https://github.com/CopilotKit/CopilotKit/tree/main/examples/mastra/starter

### Utils

- `eslint-config-custom`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `tsconfig`: `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Tools

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

```
pnpm build
```

### Deploy

To deploy use the following command

```
pnpm deploy:dev
```

### Develop

To develop all apps and packages, run the following command:

```
pnpm dev
```
