fs = require 'fs'

## Global variables
conf = {}
oldConf = {}
patch = "0"

###
    Read configuration file
        * Use default configuration if file doesn't exist
        * Return error if configuration file is not a correct json
###
readFile = (callback) =>
    if fs.existsSync '/etc/cozy/controller.json'
        fs.readFile '/etc/cozy/controller.json', 'utf8', (err, data) =>
            try
                data = JSON.parse(data)
                data.old = {}
            catch 
                callback "Error : Configuration files isn't a correct json"
            if fs.existsSync '/etc/cozy/.controller-backup.json'
                fs.readFile '/etc/cozy/.controller-backup.json', 'utf8', (err, oldData) =>
                    try
                        data.old = JSON.parse(oldData)
                        callback null, data
                    catch 
                        callback null, data
            else
                callback null, data
    else
        callback null, {}
    
###
    Initialize configuration
        * Use configuration store in configuration file or default configuration
        * conf : Current configuration
        * oldConf : Old configuration, usefull to move source code between different configurations for example
        * patch : usefull between old and new controller
###
module.exports.init = (callback) =>
    readFile (err, data) =>
        if err?
            callback err
        else
            if data.old.dir_log isnt data.dir_log
                oldConf.dir_log = data.old.dir_log 
            else 
                oldConf.dir_log = false
            if data.old.dir_source isnt data.dir_source
                oldConf.dir_source = data.old.dir_source 
            else 
                oldConf.dir_source = false
            if data.old.file_stack isnt data.file_stack
                oldConf.file_stack = data.old.file_stack 
            else 
                oldConf.file_stack = false
            conf = 
                npm_registry :      data.npm_registry || false
                npm_strict_ssl :    data.npm_strict_ssl || false
                dir_log :           data.dir_log || '/var/log/cozy'
                dir_source :        data.dir_source || '/usr/local/cozy/apps'
                file_token :        data.file_token || '/etc/cozy/stack.token'
            conf.file_stack = data.dir_source + '/stack.json'
            if data.env?
                conf.env =
                    global:         data.env.global || false
                    data_system:    data.env.data_system || false
                    home:           data.env.home || false
                    proxy:          data.env.proxy || false
            callback()

###
    Return configuration for <arg>
###
module.exports.get = (arg) =>
    return conf[arg]

###
    Return old configuration for <arg>
###
module.exports.getOld = (arg) =>
    return oldConf[arg]

###
    Remove Old configuration
        * Rewrite file configuration without old configuration
        * Usefull after changes (move code soource for example)
###
module.exports.backupConfig= () =>  
    displayConf =
        npm_registry : conf.npm_registry
        npm_strict_ssl : conf.npm_strict_ssl
        dir_log : conf.dir_log
        dir_source : conf.dir_source

    fs.open "/etc/cozy/controller.json", 'w', (err, fd) =>
        fs.write fd, JSON.stringify(displayConf), 0, displayConf.length, 0, () =>
    fs.open "/etc/cozy/.controller-backup.json", 'w', (err, fd) =>
        fs.write fd, JSON.stringify(displayConf), 0, displayConf.length, 0, () =>
