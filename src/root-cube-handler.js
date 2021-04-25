// ==UserScript==
// @name         EyeWire Root Cube Changer
// @namespace    http://tampermonkey.net/
// @version      0.1.2
// @description  Modifies the response of EW api calls, altering the tree based on a custom root node
// @author       st0ck53y
// @match        https://*.eyewire.org/*
// @exclude      https://*.eyewire.org/1.0/*
// @downloadURL  https://raw.githubusercontent.com/st0ck53y/ew-custom-root-cube/master/src/root-cube-handler.js
// ==/UserScript==

/*globals $, account, tomni */
(function(XHR) {
    "use strict";

    let DEBUG = true;

    let customRootManual = 4635731;

    /**
     * State: script init
     *   - load script settings from localStorage : any config, currently none in mind
     *   - pull all customRoot's from localStorage
     *     - validate lastAccessed < now - 30 days : configurable?
     *       - if fail, remove entries in local and session Storage (+ notify removal?)
     *   - Remove any sessionStorage data without associated localStorage entry
     *
     * State: load cell
     *   - Check localStorage for customRoot
     *     - verify cube not stashed
     *     - verify cube belongs to cell (cube may have been stashed and then un-stashed in another cell)
     *     - ensure rootPath present in sessionStorage
     *     - notify cell is using customRoot
     *     - update lastAccessed on localStorage
     *
     * State: set customRoot
     *   - check cube is not stashed
     *   - set cube in localStorage
     *   - build rootPath
     *   - notify cell is using customRoot
     *
     * State: ¯\_(ツ)_/¯ any others i cant think of without caffeine in my brain
     *
     * Possible settings:
     *  - Cleanup period (delete custom root if cell not loaded for x days)
     *  - Load cell with customRoot disabled
     *
     */

    // pulled from KK(https://github.com/ChrisRaven)'s scripts, added session storage
    let K = {
        gid: function (id) {
            return document.getElementById(id);
        },

        qS: function (sel) {
            return document.querySelector(sel);
        },

        qSa: function (sel) {
            return document.querySelectorAll(sel);
        },

        addCSSFile: function (path) {
            $("head").append('<link href="' + path + '" rel="stylesheet" type="text/css" />');
        },

        // Source: https://stackoverflow.com/a/6805461
        injectJS: function (text, sURL) {
            let tgt,
                scriptNode = document.createElement('script');

            scriptNode.type = "text/javascript";
            if (text) {
                scriptNode.textContent = text;
            }
            if (sURL) {
                scriptNode.src = sURL;
            }

            tgt = document.getElementsByTagName('head')[0] || document.body || document.documentElement;
            tgt.appendChild(scriptNode);
        },

        // localStorage
        ls: {
            get: function (key) {
                return JSON.parse(localStorage.getItem(account.account.uid + '-ewrch-' + key));
            },
            set: function (key, val) {
                localStorage.setItem(account.account.uid + '-ewrch-' + key, JSON.stringify(val));
            },
            remove: function (key) {
                localStorage.removeItem(account.account.uid + '-ewrch-' + key);
            }
        },

        // sessionStorage
        ss: {
            get: function (key) {
                return JSON.parse(sessionStorage.getItem(account.account.uid + '-ewrch-' + key));
            },
            set: function (key, val) {
                sessionStorage.setItem(account.account.uid + '-ewrch-' + key, JSON.stringify(val));
            },
            remove: function (key) {
                sessionStorage.removeItem(account.account.uid + '-ewrch-' + key);
            }
        }
    };

    class LLNode {
        constructor(cubeId) {
            this.cubeId = parseInt(cubeId);
            this.next = null;
        }
    }
    class LinkedList {
        constructor() {
            this.head = null;
            this.tail = null; //using tail for faster/looplesser inserts
            this.arr = []; //using for faster "is in list" check
        }

        add(cubeId) {
            let cube = new LLNode(cubeId);
            if (this.head === null) {
                this.head = cube;
            } else {
                this.tail.next = cube;
            }
            this.tail = cube;
            this.updateArr();
        }

        addAtHead(cubeId) {
            let cube = new LLNode(cubeId);
            if (this.head === null) {
                this.head = cube;
            } else {
                cube.next = this.head;
            }
            this.head = cube;
            this.updateArr();
        }

        updateArr() {
            this.arr = [];
            let cur = this.head;
            while (cur !== null) {
                this.arr.push(cur.cubeId);
                cur = cur.next;
            }
        }

        contains(cubeId) {
            return this.arr.includes(cubeId);
        }

        getNodeByCubeId(cubeId) {
            let cur = this.head;
            while (cur !== null) {
                if (cur.cubeId === cubeId) {
                    return cur;
                }
                cur = cur.next;
            }
            return null;
        }

        getJoiningCube(cubes) {
            if (!Array.isArray(cubes)) {
                return null;
            }
            let joiner = null;
            let cur = this.head;
            while (cur !== null) {
                if (cubes.includes(cur.cubeId)) {
                    joiner = cur.cubeId;
                }
                cur = cur.next;
            }
            return (joiner == null ? null : joiner);
        }

        getNodeChild(cubeId) {
            return this.getNodeByCubeId(cubeId).next.cubeId;
        }

        getHeadCube() {
            return this.head.cubeId;
        }

        getSplitList(cubeId) {
            //list before and after cubeId
            let pre = [];
            let post = [];
            let hasJoined = false;
            let cur = this.head;
            while (cur !== null) {
                if (cur.cubeId === cubeId) {
                    hasJoined = true;
                    cur = cur.next;
                    continue;
                }
                if (!hasJoined) {
                    pre.push(cur.cubeId);
                } else {
                    post.push(cur.cubeId);
                }
                cur = cur.next;
            }
            return {pre: pre, post: post};
        }

        getFullList() {
            return this.arr;
        }

        cubeIsHead(cubeId) {
            // is original root
            return this.head.cubeId === cubeId;
        }

        cubeIsTail(cubeId) {
            // is custom root
            return this.tail.cubeId === cubeId;
        }

        static fromString(str) {
            let list = new LinkedList();
            str.split(",").forEach(function(cubeId){
                list.add(cubeId);
            })
            return list;
        }
        toString() {
            let list = [];
            let cur = this.head;
            while (cur !== null) {
                list.push(cur.cubeId);
                cur = cur.next;
            }
            return list.join(",")
        }
    }

    //TODO remove when UI exists
    if (customRootManual !== null) {
        setCustomRoot(null, customRootManual);
    }

    function setCustomRoot(cellId, cubeId) {
        //TODO check cube not currently stashed
        //TODO check cube belongs to cell
        //TODO sanity check cubeId isn't already root
        console.log("setting custom root");
        let customRoot = {
            cellId: cellId,
            cubeId: cubeId,
            originalRootId: null, //TODO
            lastAccessed: Date.now(),
            disabled: false
        }
        K.ls.set(cellId, customRoot);
        console.log(JSON.stringify(K.ls.get(cellId)));
        let rootPath = buildRootPath(cubeId);
        K.ss.set(cellId, rootPath.toString());
        console.log(K.ss.get(cellId));
    }

    function buildRootPath(cubeId) {
        let rootPath = new LinkedList();
        let curCube = getTaskDetails(cubeId);
        console.log(curCube);
        while (curCube.parent !== null) {
            rootPath.addAtHead(curCube.id);
            curCube = getTaskDetails(curCube.parent);
            //TODO add progress notif? larger lineage could take a while to generate
        }
        rootPath.addAtHead(curCube.id);
        return rootPath;
    }

    function reformatHierarchy(originalTreeData, cubeId) {
        //FIXME - this doesnt work when the optional "depth" param is used
        // https://eyewire.org/apidoc#/get-task_hierarchy
        console.log("cubeId: ");
        console.log(cubeId);
        let newAncestors = reformatAncestors(originalTreeData.ancestors, cubeId);
        console.log(newAncestors);
        let newDescendents = reformatDescendents(originalTreeData.descendants, cubeId); //descendants is used in response? descendents used in docs. ;~;
        console.log(newDescendents);
        return {ancestors: newAncestors, descendants: newDescendents};
    }

    function reformatAncestors(ancestors, cubeId) {
        // is cubeId or any ancestors in the oldRoot->newRoot list?
        //   yes :- remove in-list ancestors, add rest of list
        //   no :- not possible, oldRoot should be. it should _always_ have a cube in the list. _always_
        console.log("reformatting ancestors: ");
        console.log(ancestors)
        let lineage = LinkedList.fromString(K.ss.get(null)); //TODO multiple cells \o/
        if (lineage !== null) {
            if (ancestors.length === 0) {
                return lineage.getFullList();
            } else if (lineage.contains(cubeId)) {
                return lineage.getSplitList(cubeId).post;
            }
            let joiningCube = lineage.getJoiningCube(ancestors);
            let splitList = lineage.getSplitList(joiningCube);
            return ancestors.filter(cube => !splitList.pre.includes(cube)).concat(splitList.post);
        } else {
            //TODO check if custom root is set - if yes: alert? break something?
        }
        return ancestors;
    }

    function reformatDescendents(descendents, cubeId) {
        // is cubeId in the oldRoot->newRoot list?
        //   yes :- get full list, remove real-descendents from next-in-list node
        //   no :- return unmodified
        console.log("reformatting descendents: ");
        console.log(descendents)
        console.log(cubeId);
        let lineage = LinkedList.fromString(K.ss.get(null)); //TODO multiple cells \o/
        if (lineage !== null && lineage.contains(cubeId)) {
            if (lineage.cubeIsTail(cubeId)) {
                // tail == custom root - return full cell cube list
                console.log("cube is tail");
                return getDescendents(lineage.getHeadCube()).filter(cube => cube !== cubeId);
            } else {
                console.log("cube isnt tail");
                let ignoreAfter = lineage.getNodeChild(cubeId);
                let ignoreDescendents = getDescendents(ignoreAfter);
                ignoreDescendents.push(ignoreAfter);
                return getDescendents(lineage.getHeadCube()).filter(cube => !ignoreDescendents.includes(cube));
            }
        } else {
            console.log("cube isnt in list");
            return descendents;
        }
    }

    function reformatAggregate(aggregate, cubeId) {
        // is cubeId in oldRoot->newRoot list?
        //   yes :- swap parent and child-in-root-list, return other children untouched
        //   no :- return unmodified
        let lineage = LinkedList.fromString(K.ss.get(null)); //TODO multiple cells \o/
        if (lineage !== null && lineage.contains(cubeId)) {
            if (lineage.cubeIsHead(cubeId)) {
                let newParent = lineage.getNodeChild(cubeId);
                aggregate.task_family.parent = newParent;
                aggregate.task_family.children = aggregate.task_family.children.filter(cube => newParent !== cube);
            } else if (lineage.cubeIsTail(cubeId)) {
                aggregate.task_family.children.push(aggregate.task_family.parent);
                aggregate.task_family.parent = null;
            } else {
                let swap = aggregate.task_family.parent;
                let newParent = lineage.getNodeChild(cubeId);
                aggregate.task_family.parent = newParent;
                aggregate.task_family.children = aggregate.task_family.children.filter(cube => newParent !== cube);
                aggregate.task_family.children.push(swap);
            }
        }
        return aggregate;
    }








    let interceptedRequests = [
        {"type":"hierarchy","regex":/\/1\.0\/task\/\d+\/hierarchy/},
        {"type":"ancestors","regex":/\/1\.0\/task\/\d+\/ancestors/},
        {"type":"descendents","regex":/\/1\.0\/task\/\d+\/descendants/},
        {"type":"aggregate","regex":/\/1\.0\/task\/\d+\/aggregate/}
    ]
    //TODO make sure this gets altered if any non-task endpoints are added :/
    let interceptionRoot = /\/1\.0\/task\/(\d+)/;

    function handleResponse(url, data) {
        if (DEBUG) { console.log("handling intercepted response: {"+url+"}, {"+data+"}"); }
        let origTreeData = JSON.parse(data);
        let newData = JSON.parse(data);
        let interceptedRoutes = interceptedRequests.filter(d=>{return d.regex.test(url)});
        console.log("Intercepted routes: ");
        console.log(interceptedRoutes);
        if (interceptedRoutes.length === 0 || undefined === interceptedRoutes[0]) return;
        console.log("Getting cubeId from url: " + url.match(interceptionRoot));
        let cubeId = parseInt(url.match(interceptionRoot)[1]);
        switch (interceptedRoutes[0].type) {
            case "hierarchy":
                console.log("intercepted hierarchy call - reformatting");
                newData = reformatHierarchy(origTreeData, cubeId);
                break;
            case "ancestors":
                console.log("intercepted ancestors call - reformatting");
                newData = reformatAncestors(origTreeData, cubeId);
                break;
            case "descendents":
                console.log("intercepted descendents call - reformatting");
                newData = reformatDescendents(origTreeData, cubeId);
                break;
            case "aggregate":
                console.log("intercepted aggregate call - reformatting");
                newData = reformatAggregate(origTreeData, cubeId);
                break;
            default:
                console.log("Unknown url has been mistakenly intercepted! {" + url + "}");
                return;
        }
        return JSON.stringify(newData);
    }

    function getTaskDetails(cubeId) {
        return noInterceptGetData("/1.0/task/"+cubeId);
    }

    function getHierarchy(cubeId) {
        return noInterceptGetData("/1.0/task/"+cubeId+"/hierarchy");
    }

    function getAncestors(cubeId) {
        return noInterceptGetData("/1.0/task/"+cubeId+"/ancestors");
    }

    function getDescendents(cubeId) {
        return noInterceptGetData("/1.0/task/"+cubeId+"/descendants");
    }

    function getAggregate(cubeId) {
        return noInterceptGetData("/1.0/task/"+cubeId+"/aggregate");
    }

    function noInterceptGetData(url) {
        //TODO add minor delay / rate-limit on these requests. dont want to hammer ewapi when spam clicking around a cell with a custom root
        // i expect a 50ms-between-everything might be enough? prolly mainly used in zfish tbh, dont know their workflow.
        // either that or a fallback-reset cycle. dont really want it going over, say, 250ms per req, if you could end up with 5+ per intercept depending on root placement :/
        let xhr = new XHR();
        xhr.noIntercept = true;
        xhr.open("GET", url, false);
        xhr.send()
        return JSON.parse(xhr.responseText);
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




    //TODO
    function initialiseScript() {
        // pull and inject any css / js scrippies
        // setup/read script settings and/or permissions stuff - should be scout+?
        // automagic storage cleanup
    }

    let intv = setInterval(function () {
        if (typeof account === 'undefined' || !account.account.uid) {
            return;
        }
        clearInterval(intv);
        initialiseScript();
    }, 50);
})(XMLHttpRequest);