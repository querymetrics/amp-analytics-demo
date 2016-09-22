/*
beacon.js

Quick and dirty beacon server
*/

"use strict";

const http = require('http');
const net = require('net');
const url = require('url');


const PORT = 9999;
const DEBUG = false; 
const INFLUX_CONFIG = {
    'HOST': 'localhost',
    'PORT': 8086,
    'DATABASE': 'dbname',
    'USER': 'user',
    'PWD': 'password'
}


function handleRequest(request, response) {
    var metric, metrics, nav_st, value, i;

    // close the response as soon as possible
    response.statusCode = 204;
    response.end();

    var queryData = url.parse(request.url, true).query;

    if (DEBUG) {
        console.log(queryData);
    }

    var data = {};
    nav_st = parseInt(queryData["nt_nav_st"], 10);
    if (!isNaN(nav_st) && nav_st > 0) {
        // metrics offset from "nt_nav_st"
        metrics = [
            "nt_red_st",
            "nt_red_end",
            "nt_fet_st",
            "nt_dns_st",
            "nt_dns_end",
            "nt_con_st",
            "nt_ssl_st",
            "nt_con_end",
            "nt_req_st",
            "nt_res_st",
            "nt_unload_st",
            "nt_unload_end",
            "nt_domloading",
            "nt_res_end",
            "nt_domint",
            "nt_domcontloaded_st",
            "nt_domcontloaded_end",
            "nt_domcomp",
            "nt_load_st",
            "nt_load_end",
        ];

        for (i = 0; i < metrics.length; i++) {
            metric = metrics[i];
            value = parseInt(queryData[metric], 10);
            if (value === 0) {
                data[metric] = 0;
            }
            else if (!isNaN(value)) {
                data[metric] = value - nav_st;
            }
        }

        // as is metrics
        metrics = ["t_page", "t_resp", "t_done"];
        for (i = 0; i < metrics.length; i++) {
            metric = metrics[i];
            value = parseInt(queryData[metric], 10);
            if (value === 0) {
                data[metric] = 0;
            }
            else if (!isNaN(value)) {
                data[metric] = value;
            }
        }
    }

    var postData = [];
    for (metric in data) {
      if (data.hasOwnProperty(metric)) {
        postData[postData.length] = metric + ",site-qm.com value=" + data[metric];
      }
    }
    postData = postData.join("\n");

    var options = {
      hostname: INFLUX_CONFIG['HOST'],
      port: INFLUX_CONFIG['PORT'],
      path: '/write?db=' + INFLUX_CONFIG['DATABASE'] + '&u=' + INFLUX_CONFIG['USER'] + '&p=' + INFLUX_CONFIG['PWD'],
      method: 'POST',
      headers: {
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    var req = http.request(options, (res) => {
        res.setEncoding('utf8');
        if (DEBUG) {
            console.log(`STATUS: ${res.statusCode}`);
            console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
            res.on('data', (chunk) => {
                console.log(`BODY: ${chunk}`);
            });
            res.on('end', () => {
                console.log('No more data in response.');
            });
        }
    });

    req.on('error', (e) => {
      console.log(`problem with request: ${e.message}`);
    });

    // write data to request body
    req.write(postData);
    req.end();
}

var server = http.createServer(handleRequest);

server.listen(PORT, function() {
    console.log("Server listening on: http://localhost:%s", PORT);
});
