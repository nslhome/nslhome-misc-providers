var core = require('nslhome-core');
var express = require("express");
var app = express();
var child_process = require("child_process");
var net = require("net");

var PROVIDER_TYPE = "defender-provider";

var provider = core.provider(PROVIDER_TYPE);
var logger = core.logger(PROVIDER_TYPE);

var ffmpeg_command = "ffmpeg";
var ffmpeg_args = "-i - -an -f image2pipe -q:v 1 -";

var _config = null;

var start_framegrabber = function(channel) {

    //                 00 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49 50 51 52 53 54 55 56 57 58 59 60 61 62 63 64 65 66 67 68 69 70 71 72 73 74 75
    // outgoing packet                                                             u  s  e  r  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 p  a  s  s  w  o  r  d  9  10 11 12 13 14 15 16 17 18 19 20    ch
    var command_hex = "00 00 00 48 00 00 00 00 28 00 04 00 05 00 00 00 29 00 38 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00";

    var buff = new Buffer(command_hex.replace(/ /g,''), 'hex');

    buff.write(_config.username, 20, _config.username.length);
    buff.write(_config.password, 52, _config.password.length);
    buff.writeUInt8(channel.ch - 1, 73);

    var frameCt = 0;

    logger.verbose("ch" + channel.ch + " Connecting to camera");
    var s = new net.Socket();
    s.setTimeout(5000);
    s.connect(_config.port, _config.host);
    s.write(buff);
    s.on('data', function(d) {
        if (d[8] == 0x63) {
            saveFrame(d.slice(28));
        }
        else {
            saveFrame(d);
        }
    });

    var saveFrame = function(buffer) {
        if (frameCt == 0) {
            logger.verbose("ch" + channel.ch + " started getting raw frames")
        }
        frameCt ++;
        if (channel.ffmpeg != null) {
            channel.ffmpeg.stdin.write(buffer);
        }
    }

    s.on('end', function() {
        if (channel.ffmpeg != null)
            channel.ffmpeg.stdin.end();
        process.exit(1);
    });

    s.on('error', function(err) {
        logger.error("ch" + channel.ch + " error: " + err);
        process.exit(1);
    });

    s.on('close', function() {
        logger.verbose("ch" + channel.ch + " closed");
        process.exit(1);
    });

    s.on('timeout', function() {
        logger.error("ch" + channel.ch + " timeout");
        process.exit(1);
    });
}


var start_ffmpeg = function(channel) {
    channel.ffmpeg = child_process.spawn(ffmpeg_command, ffmpeg_args.split(' '), {});
    channel.latestJpg = null;

    channel.ffmpeg.stdout.on('data', function(data) {
        if (channel.latestJpg == null)
            logger.verbose("ch" + channel.ch + " started getting jpgs");
        channel.latestJpg = data;
    });

    channel.ffmpeg.stderr.on('data', function(data) {
        //log("ch" + channel.ch + " ffmpeg stderr");
        //log(data.toString());
    });

    channel.ffmpeg.on('close', function(code) {
        logger.verbose("ch" + channel.ch + " ffmpeg closed with code " + code);
        process.exit(1);
    });

    channel.ffmpeg.on('exit', function(code) {
        logger.verbose("ch" + channel.ch + " ffmpeg exited with code " + code);
        process.exit(1);
    });

    channel.ffmpeg.on('error', function(err) {
        logger.error("ch" + channel.ch + " ffmpeg err", err);
        process.exit(1);
    });
};

var providerStarted = function(err, config) {
    if (err) {
        logger.error(err);
        process.exit(1);
    }

    _config = config;

    for (var i in config.channels) {
        config.channels[i].id = config.name + ":camera:" + config.channels[i].ch;

        start_ffmpeg(config.channels[i]);
        start_framegrabber(config.channels[i]);

        var device = {
            id: config.channels[i].id,
            name: config.channels[i].name,
            type: "camera",
            jpgUrl: "/" + provider.name + "/ch/" + i + "/image.jpg"
        };

        send({name: 'device', body: device});
    }

    app.get('/' + provider.name + '/ch/:ch/image.jpg', function(req, res) {
        var ch = req.params.ch;
        if (!config.channels[ch]) {
            res.send("invalid channel");
        }
        else if (config.channels[ch].latestJpg == null) {
            res.send("no data");
        }
        else {
            res.set('Content-Type', 'image/jpeg');
            res.send(config.channels[ch].latestJpg);
        }
    });

    log("proxy listening on port " + config.httpProxyPort);
    app.listen(config.httpProxyPort);
};


module.exports = exports = start = function(configName) {
    provider.initialize(configName, providerStarted);
};

if (require.main === module) {
    start(process.argv[2]);
}
