/**
 * Created by Nick Largent on 2016-03-18.
 */

var core = require('nslhome-core')
var moment = require("moment");
var AdtPulseClient = require('./lib/AdtPulseClient');

var PROVIDER_TYPE = "adtpulse-provider";

var provider = core.provider(PROVIDER_TYPE);
var logger = core.logger(PROVIDER_TYPE);
var adtLogger = core.logger("AdtPulseClient");


var express = require("express");
var app = express();

var pulse = null;
var lastCheckin = moment();

var sendDeviceDump = function(config) {
    for (var i in pulse.devices) {
        var d = pulse.devices[i];

        var device = {
            id: provider.name + ":device:" + d.deviceID,
            name: d.name.replace(/\s+/g, ' ').replace(/^Check\s+/g, '')
        };

        switch (d.deviceType) {
            case 'sensor.glassbreak':
            case 'sensor.motion':
            case 'sensor.contact':
                device.type = 'binarysensor';
                device.sensorType = d.deviceType.replace('sensor.', '');
                device.triggerState = d.faulted;
                break;

            default:
                //log("Unknown Device: " + JSON.stringify(d));
                break;
        }

        if (device.type) {
            provider.send({name: 'device', body: device});
        }
    }
};

var providerStarted = function(err, config) {
    if (err) {
        logger.error(err);
        process.exit(1);
    }

    pulse = new AdtPulseClient(config.username, config.password);
    pulse.config = config;

    /*
     setTimeout(function() {
     log("Quitting to test auto recycle");
     process.exit(2);
     }, 10000);
     */

    setInterval(function() {
        var minSinceActivity = moment().diff(lastCheckin, 'minutes');
        if (minSinceActivity > 45) {
            //process.exit(1);
            console.log("TODO: finish watchdog");
        }
    }, 1000 * 60);

    pulse.on("log_verbose", function(msg) {
        adtLogger.verbose(msg);
    });

    pulse.on("log_error", function(msg) {
        adtLogger.error(msg);
        process.exit(1);
    });

    pulse.on("connect", function() {
        logger.verbose("Connected");
        sendDeviceDump(config);
    });

    pulse.on("disconnect", function(reason) {
        logger.verbose("Disconnected - " + reason);
        process.exit(1);
    });

    pulse.on("DataUpdate", function(id, value) {
        var d = pulse.devices[id];

        lastCheckin = moment();

        logger.verbose(d.name + " changed state to " + JSON.stringify(value));

        var update = {
            id: provider.name + ":device:" + id
        };

        switch (d.deviceType) {
            case 'sensor.glassbreak':
            case 'sensor.motion':
            case 'sensor.contact':
                update.triggerState = d.faulted;
                break;

            default:
                return;
        }

        provider.send({name: 'device', body: update});
    });

    app.get('/' + provider.name, function(req, res) {
        res.json({
            "devices": pulse.devices
        });
    });

    app.get('/' + provider.name + '/devices', function(req, res) {
        res.json(pulse.devices);
    });

    logger.verbose("proxy listening on port " + config.httpProxyPort);
    app.listen(config.httpProxyPort);
    pulse.connect();
};


module.exports = exports = start = function(configName) {
    provider.initialize(configName, providerStarted);
};

if (require.main === module) {
    start(process.argv[2]);
}
