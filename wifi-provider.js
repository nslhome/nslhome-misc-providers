var core = require('nslhome-core');
var dgram = require("dgram");
var server = dgram.createSocket("udp4");

var PROVIDER_TYPE = "wifi-provider";

var provider = core.provider(PROVIDER_TYPE);
var logger = core.logger(PROVIDER_TYPE);

var devices = {};

var providerStarted = function(err, config) {
    if (err) {
        logger.error(err);
        process.exit(1);
    }

    // init devices
    for (var i in config.devices) {
        var d = config.devices[i];
        devices[d.mac] = {
            'baseStation': null,
            'lastSeen': null,
            'body': {
                'id': provider.name + ":" + d.mac,
                'name': d.name,
                'type': "binarysensor",
                'sensortype': "virtual"
            }
        };
        provider.send({name: 'device', body: devices[d.mac].body});
    }

    server.on("message", function (msg, rinfo) {
        msg = msg.toString();  // convert Buffer to String
        //console.log(msg);

        var syslog_regex = /<133>(.*?) (\d\d:\d\d:\d\d) (\S*?) 80211: (.*?) with station (..:..:..:..:..:..)/i;
        var match = syslog_regex.exec(msg);
        if (match != null) {
            //var date = match[1];
            //var time = match[2];
            var baseStation = match[3];
            var action = match[4];
            var macAddress = match[5];

            var d = devices[macAddress];
            if (d != null) {
                d.lastSeen = new Date();
                switch (action) {
                    case 'Associated':
                        d.baseStation = baseStation;
                        break;

                    case 'Disassociated':
                        if (d.baseStation == baseStation)
                            d.baseStation = null;
                        break;
                }

                logger.verbose('setWifiState', d);

                var update = {
                    id: d.body.id,
                    triggerState: (d.baseStation != null)
                };
                provider.send({name: 'device', body: update});
            }
        }
    });

    //create an event listener to tell us that the has successfully opened the syslog port and is listening for messages
    server.on("listening", function () {
        var address = server.address();
        logger.verbose("server listening " + address.address + ":" + address.port);
    });

    //bind the server to port 514 (syslog)
    server.bind(514);
};


module.exports = exports = start = function(configName) {
    provider.initialize(configName, providerStarted);
};

if (require.main === module) {
    start(process.argv[2]);
}
