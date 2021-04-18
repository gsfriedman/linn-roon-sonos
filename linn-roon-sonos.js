const   RoonApi             = require("node-roon-api"),
        RoonApiTransport    = require("node-roon-api-transport"),
        Sonos               = require("sonos").Sonos,
        UPnPRemote          = require("node-upnp-remote");

var roonZones = null;
var roonTransport = null;

// roonTargetZones and sonosIpAddresses are parallel arrays that define a unit
// when we detect that a sonos zone is playing, the corresponding roon zone
// will be paused. This only helps in the case where the Sonos device is a
// Port or Amp playing to a streamer. It does not help when the Sonos device
// is the actual Roon audio target because, in that case, playing Roon to
// that device cause it to appear that the Sonos device is playing which will
// immediately pause Roon (which is not what you want in this case)
var roonTargetZones     = [ 'Main Room' ];
var sonosIpAddresses    = [ '192.168.10.254' ];
var linnIpAddresses     = [ '192.168.10.167' ];

class Unit {
    constructor(roonZoneName, sonosIpAddress, linnIpAddress) {
        this.roonZoneName = roonZoneName;
        this.roonZone = null;
        this.sonosIpAddress = sonosIpAddress;
        this.sonos = null;
        this.linnIpAddress = linnIpAddress;
        this.linnUPnPRemote = null;
    }
}

const units = [];

// create the Units collection with seed values
for (let i = 0; i < roonTargetZones.length; i++) {
    units.push(new Unit(roonTargetZones[i], sonosIpAddresses[i], linnIpAddresses[i]));
}

// populate Sonos devices and Linn UpNP controllers  in the Units collection
for (let i = 0; i < units.length; i++) {
    units[i].sonos = new Sonos(units[i].sonosIpAddress, 1400);

    units[i].linnUPnPRemote = new UPnPRemote({
        url: 'http://' + units[i].linnIpAddresses + ':44042/some.xml'
    })
}

var roon = new RoonApi({
    extension_id:        'linn-roon-sonos.test',
    display_name:        "linn-roon-sonos",
    display_version:     "0.1.0",
    publisher:           'gsfriedman',
    email:               'none@none.com',
    website:             'https://github.com/gsfriedman/linn-roon-sonos',

    core_paired: function(core) {
        roonTransport = core.services.RoonApiTransport;
        roonTransport.subscribe_zones(function(cmd, data) {
                                      console.log(core.core_id,
                                                  core.display_name,
                                                  core.display_version,
                                                  "-",
                                                  cmd,
                                                  JSON.stringify(data, null, '  '));

                                        if (data != null && data != undefined) {
                                            UpdateRoonUnits(data.zones);
                                            
                                        }
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

function pollLoop() {

    for (let i = 0; i < units.length; i++) {
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
