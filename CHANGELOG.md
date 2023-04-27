# Changelog

## 1.0.8
##### Bug Fix
  - Initilize a fresh git repository on created project

## 1.0.7
##### Bug Fix
  - Check if redis is already enabled then do not prompt to add redis.


## 1.0.4
##### Bug Fix
  - Remove mongo/postgres events if these options are not selected.


## 1.0.3
##### Bug Fix
  - Compose options set for windows.


## 1.0.2
##### Bug Fix
  - Compose options initialized for windows.


## 1.0.0
##### Bug Fix
  - Improved logging messages.


## 0.1.49
##### Bug Fix
  - Removed extra log of `Error in "docker compose down": spawn docker compose ENOENT` error.
  - Updated CLI for docker compose. Check if docker-compose is available then use this CLI else use docker compose (latest) CLI.


## 0.1.48
##### Bug Fix
  - Updated the docker-compose template name.


## 0.1.47
##### Bug Fix
  - Fixed deprecated dockerhub v1 api and used v2 api URL in `godspeed versions`.


## 0.1.46
##### Bug Fix
  - Added `docker pull` in `godspeed update`.
  - Added elasticgraph sample config.


## 0.1.45
##### Bug Fix
  - Replaced `docker-compose`(deprecated) with `docker compose`.