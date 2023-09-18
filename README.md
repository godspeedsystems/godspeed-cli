<div align="center">
    <a href="https://github.com/godspeedsystems/">
        <img width="200" height="200" src="https://github.com/godspeedsystems/godspeed-cli/blob/main/logo.png">
    </a>
</div>
<h1 align="center">Godspeed CLI</h1>
<p align="center">
  The official Command Line Interface of Godspeed Franework
</p>
<br>

[![npm][npm]][npm-url]
[![Install Size][size]][size-url]

# Godspeed CLI

CLI to create and manage [Godspeed](https://github.com/godspeedsystems/core) projects.

# About

Godspeed CLI is the primary way to interact with your Godspeed project from the command line. It provides a bunch of useful functionalities during the project development lifecycle.

## How to install

```bash
npm install -g @godspeedsystems/godspeed
```

or

```bash
yarn global add @godspeedsystems/godspeed
```

Once installed, You will be access to `godspeed` in yor command prompt.

## Supported Commands & Arguments

  | Command               |     Options       | Description                                                                 |
  |-----------------------|-------------------|-----------------------------------------------------------------------------|
  | create <projectName>  | --from-template, --from-example| create a new godspeed project.                                 |
  | dev                   |                   | start the dev server.                                                       |
  | clean                 |                   | clean the previous build.                                                   |
  | build                 |                   | build the godspeed project.                                                 |
  | devops-plugins                 |                   | manage devops plugins for godspeed.                                                 |
  | plugins                 |                   | manage eventsource and datasource plugins for godspeed.                                                 |
  | gen-crud-api          |                   | scans your prisma datasources and generate CRUD APIs events and workflows           |


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

[npm]: https://img.shields.io/npm/v/%40godspeedsystems/godspeed
[npm-url]: https://www.npmjs.com/package/@godspeedsystems/godspeed
[size]: https://packagephobia.com/badge?p=@godspeedsystems/godspeed
[size-url]: https://packagephobia.com/result?p=@godspeedsystems/godspeed