## Table of Contents
1. [Godspeed](#godspeed-cli)
2. [Version History](#version-history)

# Godspeed CLI
CLI to create any microservice using Godspeed framework. It creates the project structure for the microservice. Follwing section describes the commands and options available in CLI.

### Godspeed
Once Godspeed CLI is installed, the `godspeed` command can be called from command line. When called without arguments, it displays its help and command usage.

```
$ godspeed
                      _                                   _ 
   __ _    ___     __| |  ___   _ __     ___    ___    __| |
  / _` |  / _ \   / _` | / __| | '_ \   / _ \  / _ \  / _` |
 | (_| | | (_) | | (_| | \__ \ | |_) | |  __/ |  __/ | (_| |
  \__, |  \___/   \__,_| |___/ | .__/   \___|  \___|  \__,_|
  |___/                        |_|                          
Usage: godspeed [options] [command]

Options:
  -v, --version                   output the version number
  -h, --help                      display help for command

Commands:
  create [options] <projectName>
  versions                        List all the available versions of gs_service
  prepare                         prepare the containers, before launch or after cleaning the containers
  version <version>
  help [command]                  display help for command
```

### Options

#### --version (-v)
The --version option outputs information about your current godspeed version.

```
$ godspeed -v
                      _                                   _ 
   __ _    ___     __| |  ___   _ __     ___    ___    __| |
  / _` |  / _ \   / _` | / __| | '_ \   / _ \  / _ \  / _` |
 | (_| | | (_) | | (_| | \__ \ | |_) | |  __/ |  __/ | (_| |
  \__, |  \___/   \__,_| |___/ | .__/   \___|  \___|  \__,_|
  |___/                        |_|                          
0.0.26
```

#### --help (-h)
The --help option displays help and command usage.

```
$ godspeed
                      _                                   _ 
   __ _    ___     __| |  ___   _ __     ___    ___    __| |
  / _` |  / _ \   / _` | / __| | '_ \   / _ \  / _ \  / _` |
 | (_| | | (_) | | (_| | \__ \ | |_) | |  __/ |  __/ | (_| |
  \__, |  \___/   \__,_| |___/ | .__/   \___|  \___|  \__,_|
  |___/                        |_|                          
Usage: godspeed [options] [command]

Options:
  -v, --version                   output the version number
  -h, --help                      display help for command

Commands:
  create [options] <projectName>
  versions                        List all the available versions of gs_service
  prepare                         prepare the containers, before launch or after cleaning the containers
  version <version>
  help [command]                  display help for command
```

### Commands

#### create
The create command creates project structure for any microservice. When called without arguments, it creates project structure with examples.
```
$ godspeed create my_service
                      _                                   _ 
   __ _    ___     __| |  ___   _ __     ___    ___    __| |
  / _` |  / _ \   / _` | / __| | '_ \   / _ \  / _ \  / _` |
 | (_| | | (_) | | (_| | \__ \ | |_) | |  __/ |  __/ | (_| |
  \__, |  \___/   \__,_| |___/ | .__/   \___|  \___|  \__,_|
  |___/                        |_|                          
projectDir:  /home/gurjot/cli-test/my_service projectTemplateDir undefined
project created
Do you need mongodb? [y/n] [default: n] n
Do you need postgresdb? [y/n] [default: n] y
Please enter name of the postgres database [default: test] 
Do you need kafka? [y/n] [default: n] n
Do you need elastisearch? [y/n] [default: n] n
Please enter host port on which you want to run your service [default: 3000] 3100
Fetching release version information...
Please select release version of gs_service from the available list:
latest
1.0.0
1.0.1
1.0.10
1.0.11
1.0.12
1.0.13
1.0.2
1.0.3
1.0.4
1.0.5
1.0.6
1.0.7
1.0.8
1.0.9
base
dev
v1.0.13
Enter your version [default: latest] 1.0.13
Selected version 1.0.13
. . . . . . . . 
```

##### Options
```
$ godspeed help create
                      _                                   _ 
   __ _    ___     __| |  ___   _ __     ___    ___    __| |
  / _` |  / _ \   / _` | / __| | '_ \   / _ \  / _ \  / _` |
 | (_| | | (_) | | (_| | \__ \ | |_) | |  __/ |  __/ | (_| |
  \__, |  \___/   \__,_| |___/ | .__/   \___|  \___|  \__,_|
  |___/                        |_|                          
Usage: godspeed create [options] <projectName>

Options:
  -n, --noexamples                      create blank project without examples
  -d, --directory <projectTemplateDir>  local project template dir
  -h, --help                            display help for command
```

#### versions
The versions command lists all the versions available of gs_service.
```
$ godspeed versions
                      _                                   _ 
   __ _    ___     __| |  ___   _ __     ___    ___    __| |
  / _` |  / _ \   / _` | / __| | '_ \   / _ \  / _ \  / _` |
 | (_| | | (_) | | (_| | \__ \ | |_) | |  __/ |  __/ | (_| |
  \__, |  \___/   \__,_| |___/ | .__/   \___|  \___|  \__,_|
  |___/                        |_|                          
latest
1.0.0
1.0.1
1.0.10
1.0.11
1.0.12
1.0.13
1.0.2
1.0.3
1.0.4
1.0.5
1.0.6
1.0.7
1.0.8
1.0.9
base
dev
v1.0.13
```

#### version
The version command helps to change the version of gs_service for any microservice. Execute the command from inside the project root directory.
```
$ godspeed version 1.0.13
                      _                                   _ 
   __ _    ___     __| |  ___   _ __     ___    ___    __| |
  / _` |  / _ \   / _` | / __| | '_ \   / _ \  / _ \  / _` |
 | (_| | | (_) | | (_| | \__ \ | |_) | |  __/ |  __/ | (_| |
  \__, |  \___/   \__,_| |___/ | .__/   \___|  \___|  \__,_|
  |___/                        |_|                          
Generating prisma modules
Starting test1_devcontainer_postgres_1 ... 
Starting test1_devcontainer_postgres_1 ... done
Creating test1_devcontainer_node_run   ... 
Creating test1_devcontainer_node_run   ... done
Environment variables loaded from .env
. . . . . . . . . .
```

#### prepare
The prepare command prepares the containers, before launch or after cleaning the containers. Execute the command from inside the project root directory.
```
$ godspeed prepare
                      _                                   _ 
   __ _    ___     __| |  ___   _ __     ___    ___    __| |
  / _` |  / _ \   / _` | / __| | '_ \   / _ \  / _ \  / _` |
 | (_| | | (_) | | (_| | \__ \ | |_) | |  __/ |  __/ | (_| |
  \__, |  \___/   \__,_| |___/ | .__/   \___|  \___|  \__,_|
  |___/                        |_|                          
Generating prisma modules
Starting test1_devcontainer_postgres_1 ... 
Starting test1_devcontainer_postgres_1 ... done
Creating test1_devcontainer_node_run   ... 
Creating test1_devcontainer_node_run   ... done
Environment variables loaded from .env
. . . . . . . . . .
```

#### help
The help command displays help and usage for any command.
```
$ godspeed help create
                      _                                   _ 
   __ _    ___     __| |  ___   _ __     ___    ___    __| |
  / _` |  / _ \   / _` | / __| | '_ \   / _ \  / _ \  / _` |
 | (_| | | (_) | | (_| | \__ \ | |_) | |  __/ |  __/ | (_| |
  \__, |  \___/   \__,_| |___/ | .__/   \___|  \___|  \__,_|
  |___/                        |_|                          
Usage: godspeed create [options] <projectName>

Options:
  -n, --noexamples                      create blank project without examples
  -d, --directory <projectTemplateDir>  local project template dir
  -h, --help                            display help for command
```

## VERSION HISTORY
##### 0.0.29 
- Initial version