Miscellaneous Providers
=========

Collection of various providers for nslhome.

## Installation

`git clone https://github.com/nslhome/nslhome-misc-providers.git`

MongoDB and RabbitMQ configuration should be provided via the environment variables `NSLHOME_MONGO_URL` and `NSLHOME_RABBIT_URL`.

You can optionally use the file `.nslhome.config` to store your configuration.
```
{
    "NSLHOME_MONGO_URL": "mongodb://HOST/DATABASE",
    "NSLHOME_RABBIT_URL": "amqp://USERNAME:PASSWORD@HOST"
}
```

## Desktop Provider

Works together with nslhome-windows-tray

 Config
```
{
    "provider" : "desktop-provider",
    "name" : "CONFIG_NAME",
    "config" : {
        "httpProxyPort" : 9072,
        "listenPort" : 7001
    }
}
```

Run as a standalone application

`node desktop-provider <CONFIG_NAME>`

Include as a module

`require('nslhome-misc-providers')['desktop-provider'](CONFIG_NAME)`

## Wifi Presence Provider

Acts as a syslog server for an Airport Extereme.  Configure the airport to send syslog message to the IP address where this provider is running.

 Config
```
{
    "provider" : "wifi-provider",
    "name" : "CONFIG_NAME",
    "config" : {
        "devices" : [
            {
                "name" : "John Smith's Phone",
                "mac" : "ff:ff:ff:ff:ff:ff"
            },
            {
                "name" : "Jane Doe's Phone",
                "mac" : "ee:ee:ee:ee:ee:ee"
            }
        ]
    }
}
```

Run as a standalone application

`node wifi-provider <CONFIG_NAME>`

Include as a module

`require('nslhome-misc-providers')['wifi-provider'](CONFIG_NAME)`

## IP Camera Provider

Provides images from an IP network camera.  Tested with the D-Link DCS-5020L

Config
```
{
    "provider" : "ipcam-provider",
    "name" : "CONFIG_NAME",
    "config" : {
        "httpProxyPort" : 9074,
        "username" : "CAMERA_USERNAME",
        "password" : "CAMERA_PASSWORD",
        "jpgUrl" : "URL_TO_STILL_JPEG"
    }
}
```

Run as a standalone application

`node ipcam-provider <CONFIG_NAME>`

Include as a module

`require('nslhome-misc-providers')['ipcam-provider'](CONFIG_NAME)`

## Defender DVR Provider

Provides images from up to 4 channels of a defender DVR unit using the mobile protocol.

Config
```
{
    "provider" : "defender-provider",
    "name" : "CONFIG_NAME",
    "config" : {
        "httpProxyPort" : 9073,
        "host" : "DVR_HOSTNAME",
        "port" : 18004,
        "username" : "DVR_MOBILE_USERNAME",
        "password" : "DVR_MOBILE_PASSWORD",
        "channels" : [
            {"ch" : 1, "name" : "Driveway"},
            {"ch" : 2, "name" : "Hallway"},
            {"ch" : 3, "name" : "Backdoor"},
            {"ch" : 4, "name" : "Roof"}
        ]
    }
}
```

Run as a standalone application

`node defender-provider <CONFIG_NAME>`

Include as a module

`require('nslhome-misc-providers')['defender-provider'](CONFIG_NAME)`

## Release History

1.0.0
* Initial Release
