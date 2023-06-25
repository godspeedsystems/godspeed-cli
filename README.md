# Godspeed CLI

CLI to create and manage [Godspeed](https://github.com/godspeedsystems/gs-node-service) projects.

# About

Godspeed CLI is the primary way to interact with your Godspeed project from the command line. It provides a bunch of useful functionalities during the project development lifecycle.

## How to install

When you have followed [getting started](https://docs.godspeed.systems/docs/microservices/setup/getting-started) guide of godspeed, then godspeed CLI is already installed.

Otherwise

```bash
npm install -g @godspeedsystems/godspeed
```

or

```bash
yarn global add @godspeedsystems/godspeed
```

## Supported Commands & Arguments

  | Command               |     Options       | Description                                                                 |
  |-----------------------|-------------------|-----------------------------------------------------------------------------|
  | _outside dev container_                                                                                                 |
  | create <projectName>  | --from-template, --from-example| Create a godspeed project from scratch.                                     |
  | update                |                   | Update an existing godspeed project.                                        |
  | _inside dev container_                                                                                                  |
  | dev                   |                   | Start the dev server.                                                       |
  | clean                 |                   | Clean the `build` folder.                                                     |
  | build                 |                   | Build the project.                                                          |
  | gen-crud-api          |                   | Auto generate [events](https://docs.godspeed.systems/docs/microservices/events) and [workflows](https://docs.godspeed.systems/docs/microservices/workflows) based on prisma schema in `datasources`.          |


## Exit codes and their meanings

| Exit Code | Description                                        |
| --------- | -------------------------------------------------- |
| `0`       | Success                                            |
| `1`       | Errors from docker                                 |
| `2`       | Configuration/options problem or an internal error |


## CLI Environment Variables

| Environment Variable                | Description                                                           |
| ----------------------------------- | -------------------------------------------------------------------   |
| `DEBUG_MODE`                        | when `true` it will print all the debug logs including from `docker`. |