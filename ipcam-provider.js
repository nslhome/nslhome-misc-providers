var core = require('nslhome-core');
var express = require("express");
var app = express();
var http = require('http');
var fs = require('fs');
var url = require('url');

var PROVIDER_TYPE = "ipcam-provider";

var provider = core.provider(PROVIDER_TYPE);
var logger = core.logger(PROVIDER_TYPE);

var _config = null;
var timer = null;
var latestJpg = null;

var getImage = function(camurl, username, password, callback) {
    var args = url.parse(camurl);

    var options = {
        hostname: args.hostname,
        path: args.path,
        auth: username + ":" + password
    };

    var i = 0;

    var request = http.request(options, function(response) {
        response.setEncoding('binary');

        var data = '';

        //another chunk of data has been recieved, so append it to `str`
        response.on('data', function (chunk) {
            data += chunk;
        });

        //the whole response has been recieved, so we just print it out here
        response.on('end', function () {
            callback(null, data);
        });
    });

    request.on('error', function(e) {
        console.log(e);
    });

    request.end();
};

var refreshImage = function() {
    getImage(_config.jpgUrl, _config.username, _config.password, function(err, bits) {
        if (err) {
            return logger.error(err);
        }
        latestJpg = bits;
    });
};

var providerStarted = function(err, config) {
    if (err) {
        logger.error(err);
        process.exit(1);
    }

    _config = config;
    timer = setInterval(refreshImage, 1000);

    var device = {
        id: provider.name,
        name: provider.name,
        type: "camera",
        jpgUrl: "/" + provider.name + "/image.jpg"
    };

    provider.send({name: 'device', body: device});

    app.get('/' + provider.name + '/image.jpg', function(req, res) {
        res.set('Content-Type', 'image/jpeg');
        res.end(latestJpg, 'binary');

    });

    logger.verbose("proxy listening on port " + config.httpProxyPort);
    app.listen(config.httpProxyPort);
};


module.exports = exports = start = function(configName) {
    provider.initialize(configName, providerStarted);
};

if (require.main === module) {
    start(process.argv[2]);
}
