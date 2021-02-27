// ==UserScript==
// @name         EyeWire Root Cube Changer
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Modifies the response of EW api calls, altering the tree based on a custom root node
// @author       st0ck53y
// @match        https://*.eyewire.org/*
// @exclude      https://*.eyewire.org/1.0/*
// @downloadURL  https://raw.githubusercontent.com/st0ck53y/ew-custom-root-cube/master/src/root-cube-handler.js
// ==/UserScript==

/*globals $ */
(function(XHR) {
    "use strict";

    let DEBUG = true;

    let interceptedRequests = [
        {"type":"hierarchy","regex":/\/1\.0\/task\/\d+\/hierarchy/},
        {"type":"ancestors","regex":/\/1\.0\/task\/\d+\/ancestors/},
        {"type":"descendents","regex":/\/1\.0\/task\/\d+\/descendents/},
        {"type":"aggregate","regex":/\/1\.0\/task\/\d+\/aggregate/}
    ]
    //TODO make sure this gets expanded if any non-task endpoints are added :/
    // i love regex so i wont do anything with it now
    let interceptionRoot = /\/1\.0\/task\/(\d+)/;

    function handleResponse(url, data) {
        if (DEBUG) { console.log("handling intercepted response: {"+url+"}, {"+data+"}"); }
        let origTreeData = data;
        let interceptedRoutes = interceptedRequests.filter(d=>{return d.regex.test(url)});
        if (interceptedRoutes.length === 0 || undefined === interceptedRoutes[0]) return;
        let cubeId = url.match(interceptionRoot)[2];
        switch (interceptedRoutes[0]) {
            case "hierarchy":

                break;
            case "ancestors":

                break;
            case "descendents":

                break;
            case "aggregate":

                break;
            default:
                console.log("Unknown url has been mistakenly intercepted! {" + url + "}");
                return;
        }
        return noInterceptGetData(url);
    }

    function getHierarchy(cubeId) {
        return noInterceptGetData("/1.0/task/"+cubeId+"/hierarchy");
    }

    function getAncestors(cubeId) {
        return noInterceptGetData("/1.0/task/"+cubeId+"/ancestors");
    }

    function getDescendents(cubeId) {
        return noInterceptGetData("/1.0/task/"+cubeId+"/descendents");
    }

    function getAggregate(cubeId) {
        return noInterceptGetData("/1.0/task/"+cubeId+"/aggregate");
    }

    function noInterceptGetData(url) {
        let xhr = new XHR();
        xhr.noIntercept = true;
        xhr.open("GET", url, false);
        xhr.send()
        return xhr.responseText;
    }

    function checkInterception(url) {
        return interceptedRequests.map(d=>{return d.regex}).some(function(match) { return match.test(url); })
    }

    // interception logics below - src: https://stackoverflow.com/a/10796951
    let open = XHR.prototype.open;
    let send = XHR.prototype.send;

    XHR.prototype.open = function(method, url, async, user, pass) {
        this._url = url;
        open.call(this, method, url, async, user, pass);
    };

    XHR.prototype.send = function(data) {
        let self = this;
        let oldOnReadyStateChange;
        let url = this._url;
        let shouldIntercept = checkInterception(url);
        function onReadyStateChange() {
            if(self.readyState === 4) {
                if (DEBUG) { console.log("intercepted! {"+url+"}"); }
                let response = handleResponse(url, self.responseText);
                Object.defineProperty(self, 'response',     {writable: true});
                Object.defineProperty(self, 'responseText', {writable: true});
                self.response = self.responseText = response;
            }
            if(oldOnReadyStateChange) {
                oldOnReadyStateChange();
            }
        }
        if(!this.noIntercept && shouldIntercept) {
            if(this.addEventListener) {
                this.addEventListener("readystatechange", onReadyStateChange, false);
            } else {
                oldOnReadyStateChange = this.onreadystatechange;
                this.onreadystatechange = onReadyStateChange;
            }
        }
        send.call(this, data);
    }
})(XMLHttpRequest);