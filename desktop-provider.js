var core = require('nslhome-core');
var fs = require("fs");
var net = require('net');

var PROVIDER_TYPE = "desktop-provider";

var provider = core.provider(PROVIDER_TYPE);
var logger = core.logger(PROVIDER_TYPE);

var client = null;

var providerStarted = function(err, config) {
    if (err) {
        logger.error(err);
        process.exit(1);
    }

    net.createServer(function(socket) {
        client = socket;
        logger.verbose("client joined from " + socket.remoteAddress);

        socket.on("data", function(data) {
            //log(data);

            var message = JSON.parse(data);
            logger.verbose("data", message);

            switch (message.name) {
                case "idle":
                    var device = {
                        id: provider.name + ":activity",
                        triggerState: !message.isIdle
                    };

                    provider.send({name: 'device', body: device});
                    break;

                case "devices":
                    for (var i in message.devices) {
                        var d = message.devices[i];
                        d.id = provider.name + ":" + d.id;
                        provider.send({name: 'device', body: d});
                    }
                    break;

                case "playlist":
                    var device = {
                        id: provider.name + ":playlist:" + message.playlist,
                        powerState: message.isPlaying
                    };

                    provider.send({name: 'device', body: device});
                    break;

                case "event":
                    var event = {
                        id: provider.name + ":event:" + message.event,
                        name: message.event
                    };
                    logger.verbose(event.name + " triggered");

                    provider.send({name: 'event', body: event});
                    break;
            }

            socket.write(JSON.stringify({ name: 'result', success: true }) + "\n");
        });

        socket.on("error", function(err) {
            logger.error(err);
            socket.destroy();
            client = null;
        });

        socket.on("end", function() {
            logger.verbose("client disconnected");
            client = null;
        });

    }).listen(config.listenPort);

    logger.verbose("Listening");
};

provider.on('setDevicePower', function(id, isOn) {
    if (client) {
        switch (id.split(':')[1]) {
            case "playlist":
                if (isOn) {
                    client.write(JSON.stringify({ name: 'start', playlist: id.split(':')[2] }) + "\n");
                }
                else {
                    client.write(JSON.stringify({ name: 'stop', playlist: id.split(':')[2] }) + "\n");
                }
                break;
        }
    }
});


module.exports = exports = start = function(configName) {
    provider.initialize(configName, providerStarted);
};

if (require.main === module) {
    start(process.argv[2]);
}
