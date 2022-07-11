## Table of Contents
1. [Godspeed](#godspeed)
2. [Version History](#version-history)

# Godspeed
Godspeed CLI is the primary way to interact with your Godspeed project from the command line. It provides a bunch of useful functionalities during the project development lifecycle.

Refer to our [online documentation](https://docs.mindgrep.com/docs/microservices/introduction-cli) on CLI.

## Version History
##### 0.0.29 
- Initial version

##### 0.0.30 
 ###### Feature
- Allow multiple projects to run simultaneously on a single machine. CLI asks port information for mongodb, postgres, kafka, elasticsearch, etc. and allow to run multiple containers for the same simultaneously. 

##### 0.0.31 
 ###### Feature
- `godspeed update` is added to update any existing project settings. 
  For example, if you hadn't selected mongodb during project creation then you can do so using `godspeed update`.

##### 0.0.32
 ###### Bug Fix
- `godspeed create -n` is updated to create a new project with no examples.

##### 0.0.33
 ###### Bug Fix
- `godspeed create -n` is updated when a new project is created with no db.
