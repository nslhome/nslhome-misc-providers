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

## Release History

1.0.0
* Initial Release
