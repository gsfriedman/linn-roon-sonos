var RoonApi             = require("node-roon-api"),
    RoonApiTransport    = require("node-roon-api-transport"),
    Sonos               = require("sonos").Sonos;    

var roonZones = null;
var roonTransport = null;

var roonTargetZones =   [ 'Living Room' ];
var sonosIpAddresses =  [ '192.168.10.254' ];

class Unit {
    constructor(roonZoneName, sonosIpAddress) {
        this.roonZoneName = roonZoneName;
        this.roonZone = null;
        this.sonosIpAddress = sonosIpAddress;
        this.sonos = null;
    }
}

const units = [];

// create the Units collection with seed values
for (let i = 0; i < roonTargetZones.length; i++) {
    units.push(new Unit(roonTargetZones[i], sonosIpAddresses[i]));
}

// populate Sonos values in the Units collection
for (let i = 0; i < units.length; i++) {
    units[i].sonos = new Sonos(units[i].sonosIpAddress, 1400);
}

var roon = new RoonApi({
    extension_id:        'com.linn-roon-sonos.test',
    display_name:        "linn-roon-sonos",
    display_version:     "0.1.0",
    publisher:           'none',
    email:               'none@none.com',
    website:             'https://github.com/gsfriedman/roon-extension-test',

    core_paired: function(core) {
        roonTransport = core.services.RoonApiTransport;
        roonTransport.subscribe_zones(function(cmd, data) {
                                      console.log(core.core_id,
                                                  core.display_name,
                                                  core.display_version,
                                                  "-",
                                                  cmd,
                                                  JSON.stringify(data, null, '  '));

                                        UpdateRoonUnits(data.zones);
                                  });
    },

    core_unpaired: function(core) {
                   console.log(core.core_id,
                           core.display_name,
                           core.display_version,
                           "-",
                           "LOST");
               }
});

roon.init_services({required_services: [RoonApiTransport]});
roon.start_discovery();

function UpdateRoonUnits(zones) {
    if (zones != undefined) {
        roonZones = zones;
        roonZones.forEach(element => {
            for (let i = 0; i < units.length; i++) {
                if (element.display_name == units[i].roonZoneName) {
                    units[i].roonZone = element;
                    break;
                }
            }
        });
    }
}

//pollLoop();

function pollLoop() {

    for (let i = 0; i < units.length; i++) {
        //let sonosPlayState = units[i].sonos.getCurrentState();
        //console.log(sonosPlayState);

        units[i].sonos.getCurrentState()
            .then(currentState => { handleSonosState(i, currentState) });
    }

    setTimeout(pollLoop, 5000);
}

function handleSonosState(unitIndex, currentState) {
    console.log(currentState);
    if (currentState == 'playing') {
        let roonZone = units[unitIndex].roonZone;
        if (roonZone != null) {
            roonTransport.control(roonZone, 'pause');
        }   
    }
}

pollLoop();
