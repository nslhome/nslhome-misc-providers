/**
 * Created by Nick Largent on 2016-02-24.
 */
var request = require('request');
var io = require('socket.io-client');
var util = require("util");
var events = require("events");

var _get = function(obj, key) {
    return key.split(".").reduce(function(o, x) {
        return (typeof o == "undefined" || o === null) ? o : o[x];
    }, obj);
};

function AdtPulseClient(username, password) {

    // private variables
    var BEARER_CODE = null;
    var SEQUENCE_NUM = 1;
    var me = this;

    // private methods
    var log = function(text) {
        me.emit('log_verbose', text);
    };

    var log_error = function(text) {
        me.emit('log_error', text);
    };

    var getHeaders = function(extraHeaders) {
        var defaultHeaders = {
            'Accept': 'application/json, text/plain, */*',
            //'Accept-Encoding': 'gzip, deflate, sdch',
            'Accept-Language': 'en-US,en;q=0.8',
            'Connection': 'keep-alive',
            //'Host': 'prd-api-us.zonoff.com',
            'Origin': 'http://www-adonis.orionapp.io',
            'Referer': 'http://www-adonis.orionapp.io/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.109 Safari/537.36'
        };

        for (var i in extraHeaders)
            defaultHeaders[i] = extraHeaders[i];

        return defaultHeaders;
    };

    var getResponseHandler = function(next) {
        return function(err, res, body) {
            if (err)
                return next(err);

            if (res.statusCode != 200) {
                log('STATUS: ' + res.statusCode);
                log('HEADERS: ' + JSON.stringify(res.headers));
                log('BODY: ' + body);
                return next("Unexpected response: " + res.statusCode);
            }

            var data = JSON.parse(body);
            next(null, data);
        }
    };

    //public properties
    this.ready = false;
    this.devices = {};

    var getToken = function(next) {

        var options = {
            url: "https://prd-api-us.zonoff.com/api/v1/account/oauth/token",
            headers: getHeaders({
                'Authorization': 'Basic YWI0YzRlMDAtZDhhNi0xMWU0LWE5NmMtMzRmYjUwOWMyMGNhOg==' // <-- CLIENT_ID (I assume this is for all of the ADP Pulse website)
            }),
            form: {
                'username': username,
                'password': password,
                'grant_type': 'password'
            }
        };

        request.post(options, getResponseHandler(next));
    };

    var getProfile = function(next) {

        var options = {
            url: "https://prd-api-us.zonoff.com/api/v1/account/user/profile",
            headers: getHeaders({
                'Authorization': 'Bearer ' + BEARER_CODE
            })
        };

        request.get(options, getResponseHandler(next));
    };



    var getAccounts = function(userId, next) {

        var options = {
            url: "https://prd-api-us.zonoff.com/api/v1/account/accounts?userId=" + userId,
            headers: getHeaders({
                'Authorization': 'Bearer ' + BEARER_CODE
            })
        };

        request.get(options, getResponseHandler(next));
    };

    var getConnections = function(accountId, next) {

        var options = {
            url: "https://prd-api-us.zonoff.com/api/v1/common/connections",
            headers: getHeaders({
                'Authorization': 'Bearer ' + BEARER_CODE
            }),
            form: {
                'accountId': accountId
            }
        };

        request.post(options, getResponseHandler(next));
    };

    this.connect = function() {
        log("Connecting to ADT Pulse...");
        getToken(function(err, token){
            if (err)
                return log_error(err);

            BEARER_CODE = token.access_token;

            getProfile(function (err, profile) {
                if (err)
                    return log_error(err);

                log("..profile loaded");
                //console.log(profile);

                getAccounts(profile.id, function (err, accounts) {
                    if (err)
                        return log_error(err);

                    log("..accounts loaded");
                    //console.log(accounts);

                    getConnections(accounts[0].id, function (err, connections) {
                        if (err)
                            return log_error(err);

                        log("..connections loaded");
                        //console.log(connections);

                        var url = "https://" + connections.location + '?authcode=' + connections.authCode + '&ack=false';
                        log("..connecting to: " + url);

                        var socket = io(url, {
                            multiplex: false,
                            timeout: 30000,
                            reconnection: false,
                            extraHeaders: {
                                'Origin': 'http://www-adonis.orionapp.io',
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.109 Safari/537.36'
                            }
                        });

                        socket.on('connect', function () {
                            log("..connected");
                            socket.emit('message', {"msg": "DeviceInfoDocGetList", "seq": SEQUENCE_NUM++});
                        });

                        socket.on('error', function (err) {
                            log_error(err);
                        });

                        socket.on('disconnect', function (msg) {
                            log("disconnected: " + msg);
                            me.emit('disconnect', 'Websocket closed');
                        });

                        socket.on('DataUpdate', function (message) {
                            var info = _get(message, 'body.0.general.v2');
                            var state = _get(message, 'body.0.device.v1');
                            if (info && state) {
                                log("DataUpdate: [" + info.deviceID + "] " + info.name + ", triggered: " + state.faulted);
                                if (me.devices[info.deviceID]) {
                                    me.devices[info.deviceID].faulted = state.faulted;
                                    me.emit('DataUpdate', info.deviceID, state.faulted);
                                }
                            }
                            else {
                                log("Unknown DataUpdate: " + JSON.stringify(message.body));
                            }
                        });

                        socket.on('message', function (message) {
                            switch (message.msg) {
                                case "DeviceInfoDocGetList":
                                    log("Device count: " + message.body.length);

                                    for (var i in message.body) {
                                        var d = message.body[i];
                                        var info = _get(d, 'general.v2');
                                        if (info) {
                                            //console.log(info.deviceID + ': ' + info.name + "  type=" + info.deviceType);
                                            info.faulted = false; // default to this since I don't know how to know the starting value
                                            me.devices[info.deviceID] = info;
                                        }
                                    }

                                    me.ready = true;
                                    me.emit('connect');
                                    break;

                                case "DeviceSetCategory":
                                    // ignore
                                    break;

                                default:
                                    log("MSG: " + JSON.stringify(message));
                                    break;
                            }

                        });

                    });
                });
            });
        });

    };

    // public methods
    this.deviceSetValue = function(id, value, next) {
        next("not implemented");
    };

    this.deviceSetState = function(id, state, next) {
        next("not implemented");
    };
}

util.inherits(AdtPulseClient, events.EventEmitter);

exports = module.exports = AdtPulseClient;
