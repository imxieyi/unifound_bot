'use strict';

const request = require('request-promise');
const DOMParser = require('xmldom').DOMParser;
const util = require('util');
const pug = require('pug');
const webshot = require('webshot');
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, prettyPrint } = format;
const config = require('./config');

const logger = createLogger({
    level: 'info',
    format: combine(
        timestamp(),
        prettyPrint()
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: config.log_file })
    ]
});

const pms_base = 'http://pms.sustc.edu.cn';
const pms_service_url = '/Service.asmx';
const pms_print_station_query_url = '/Service.asmx/GetDevices';
const pms_session_request_body = '<?xml version=\"1.0\" encoding=\"utf-8\"?><soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:soapenc=\"http://schemas.xmlsoap.org/soap/encoding/\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" ><soap:Body><InitSession xmlns=\"http://tempuri.org/\"><bstrPCName></bstrPCName></InitSession></soap:Body></soap:Envelope>';

var pms_session = '';

var pms_all_stations;

var update_timestamp;
var parser = new DOMParser();
var genHTML = pug.compileFile('template.pug');

var public_login = async function() {
    var options = {
        method: 'POST',
        uri: pms_base + pms_service_url,
        body: pms_session_request_body,
        headers: {
            'SOAPAction': '\"http://tempuri.org/InitSession\"',
            'Content-Type': 'text/xml; charset=UTF-8'
        }
    };
    var succeed = false;
    await request(options).then(function (body) {
        if (body) {
            var doc = parser.parseFromString(body);
            var nodes = doc.getElementsByTagName('InitSessionResult');
            var sessionid = nodes[0].textContent;
            if (sessionid.startsWith('ok,')) {
                pms_session = sessionid.replace(/^ok,/, '');
                logger.info('Got session id ' + pms_session);
                succeed = true;
            } else {
                logger.error('No session id, got ' + sessionid);
            }
        }
    }).catch(function (err) {
        logger.error('Public login error: ' + err.statusCode);
    });
    return succeed;
};

var get_all_stations = async function () {
    var options = {
        method: 'POST',
        uri: pms_base + pms_print_station_query_url,
        body: util.format('{"bstrSessionID":"%s"}', pms_session),
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    };
    var result = false;
    await request(options).then(function (body) {
        if (body) {
            if (!body.toString().includes('SessionOut')) {
                if (body.toString().includes('"ErrorMessage":""')) {
                    // Refresh successful
                    var json = JSON.parse(body.toString());
                    if (json.Result) {
                        pms_all_stations = json.Result;
                        // Remove unnecessary parts
                        for (var i in pms_all_stations) {
                            var station = pms_all_stations[i];
                            while (station.szProperty.includes('<')) {
                                station.szProperty = station.szProperty.replace(/<(.*?)>/, '');
                            }
                            while (station.szStatus.includes('<')) {
                                station.szStatus = station.szStatus.replace(/<(.*?)>/, '');
                            }
                            while (station.szStatInfo.includes('<')) {
                                station.szStatInfo = station.szStatInfo.replace(/<(.*?)>/, '');
                            }
                        }
                        result = true;
                        update_timestamp = new Date();
                    }
                }
            } else {
                result = false;
            }
        }
    }).catch(function (err) {
        logger.error('Check session error:' + typeof err.statusCode !== 'undefined' && err.statusCode ? err.statusCode : err);
    });
    return result;
}

var render_stations = function (stations) {
    var html = genHTML({
        stations: stations,
        timestamp: update_timestamp.toString()
    });
    return webshot(html, { 
        siteType: 'html',
        windowSize: {
            width: 750,
            height: 30 * (stations.length + 2)
        }
    });
}

var stream_all_stations = async function () {
    if (typeof update_timestamp == 'undefined' || new Date().getTime() - update_timestamp.getTime() > 60000) {
        var refreshed = false;
        if (pms_session !== '') {
            // Check public session status
            refreshed = await get_all_stations();
        }
        if (!refreshed) {
            if (await public_login()) {
                refreshed = await get_all_stations();
            }
        }
    }
    return render_stations(pms_all_stations);
}

var stream_query_stations = async function (query) {
    if (typeof update_timestamp == 'undefined' || new Date().getTime() - update_timestamp.getTime() > 60000) {
        var refreshed = false;
        if (pms_session !== '') {
            // Check public session status
            refreshed = await get_all_stations();
        }
        if (!refreshed) {
            if (await public_login()) {
                refreshed = await get_all_stations();
            }
        }
    }
    var query_stations = [];
    for (var i in pms_all_stations) {
        var station = pms_all_stations[i];
        if (station.szName.includes(query)) {
            query_stations.push(station);
        }
    }
    return render_stations(query_stations);
}

var main = async function () {
    var fs = require('fs');
    var stream = await stream_all_stations();
    var file = fs.createWriteStream('test.png', {encoding: 'binary'});
    stream.on('data', function (data) {
        file.write(data.toString('binary'), 'binary');
    });
}

if (require.main === module) {
    main();
}

module.exports = {
    stream_all_stations: stream_all_stations,
    stream_query_stations: stream_query_stations
};
