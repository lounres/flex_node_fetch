"use strict"

const defaultConfig = require("./config.json").FetchDefaultConfig;

const http = require("http");
const https = require("https");
const querystring = require("querystring");

module.exports.Fetcher =
class Fetcher {
    constructor(config={}) {
        this.config = Object.assign(defaultConfig, config);
        this.logJournal = [];
    }

    #log = function (data, level) {
        level = level || "info";
        this.logJournal.push(data);
        if (this.config.writeLogs) {
            console[level](data);
        }
    }

    #logRequest = function (request, data) {
        let level = "info";
        this.#log({
            "event": {"type": "HTTP-request", "name": request},
            data,
            // "time": timeSync.getTime(), // TODO: Rewrite
            // "humanTime": (new Date(timeSync.getTime()).toISOString())
        }, level);
    }

    #logResponse = function (response, data) {
        let level = "info";
        this.#log({
            "event": {"type": "HTTP-response", "name": response},
            data,
            // "time": timeSync.getTime(), // TODO: Rewrite
            // "humanTime": (new Date(timeSync.getTime()).toISOString())
        }, level);
    }

    fetch (name, {path, method="GET", headers={}, data = null}) {
        if (this.config.logs["HTTP-request"]) this.#logRequest(name, data);

        const options = {
            protocol: this.config.protocol,
            hostname: this.config.hostname,
            port: this.config.port,
            path: this.config.path + path,
            method,
            headers
        };

        let proto = http;
        switch (this.config.protocol) {
            case "http:":
                proto = http;
                break;
            case "https:":
                proto = https;
                break;
        }

        switch (method) {
            case "GET":
                options.path += "?" + querystring.stringify(data);
                break;
            case "POST": // Do not forget about "Content-Type".
                if (data !== null) {
                    data = JSON.stringify(data);
                    options.headers["Content-Length"] = Buffer.byteLength(data);
                }
                break;
        }

        return new Promise((resolve, reject) => {
            const req = proto.request(options, res => {
                    res.setEncoding("utf8")
                        .on("error", (err) => this.#log(err, "error"))
                        .on("data", (data) => {
                            if (this.config.logs["HTTP-response"]) this.#logResponse(name, data);
                            resolve(data);
                        })
                }
            ).on("error", (err) => this.#log(err, "error"))

            switch (method) {
                case "POST":
                    if (data !== null) req.write(data);
                    break;
            }

            req.end();
        });
    }
}