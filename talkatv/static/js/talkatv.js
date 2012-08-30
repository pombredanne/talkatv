/**
 * @licstart
 * talkatv - Open source comment service
 * Copyright (C) 2012  talkatv contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you
 * may not use this file except in compliance with the License. You may
 * obtain a copy of the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * @licend
 */

var desqus = new Object();

(function (dq){
    /**
     * getCLient - Helper for `new XMLHttpRequest();`
     *
     * Returns a fresh XMLHttpRequest object
     */
    dq.getClient = function () {
         return new XMLHttpRequest();
    };


    if ( ! window.desqus_home && ! window.talkatv_home ) {
        console.error('talkatv_home is not set');
    }

    /**
     * Holds the desqus application URL, this should be defined in a script tag
     * on the page before this script is included.
     */
    dq.home = window.talkatv_home || window.desqus_home;
    dq.ordered = window.talkatv_ordered || false;

    /**
     * render - Injects the comment form/login-register links and comments into
     * the DOM
     */
    dq.render = function () {
        dq.container = document.getElementById('talkatv-comments') || document.getElementById('desqus-comments-container');

        dq.container.innerHTML = '';

        dq.formContainer = dq.makeElement('div', {
            class: 'talkatv-form'});
        dq.container.appendChild(dq.formContainer);

        dq.commentContainer = dq.makeElement(
                dq.ordered ? 'ol' : 'ul', {
            class: 'comment-list',
            reversed: true});

        dq.container.appendChild(dq.commentContainer);

        dq.request('/check-login', function (res, status) {
            data = res;
            dq.log(['check-login', data]);
            if (! 'OK' == data.status) {
                dq.renderRegister();
            } else {
                dq.renderForm();
            }
        });
        dq.getComments();
    };

    /**
     * renderRegister - Render login/registration text
     *
     * Called when the check-login reports that the user is logged out. Displays
     * links to desqus login and register forms.
     */
    dq.renderRegister =  function () {
        dq.formContainer.innerHTML = '<p>You need to <a href="'
            + dq.home + '/login?next=' + encodeURIComponent(dq.getCurrentURL()) + '">login</a> or <a href="' + dq.home
            + '/register">register</a> to post a comment.</p>';
    };

    /**
     * getCurrentURL - Get currnt URL without URL fragment/'hash'
     */
    dq.getCurrentURL = function () {
        return window.location.protocol + '//' + window.location.host
            + window.location.pathname;
    };

    /**
     * getComments - Get comments from desqus
     *
     * GETs /api/comments/?item_url={url}&item_title={title} and calls
     * renderComments to inject the comments into the DOM
     */
    dq.getComments = function () {
        dq.request('/comments', function (res, status) {
            dq.jsonData = res;
            dq.log(res);
            dq.renderComments(dq.jsonData.comments);
        }, {
            item_url: dq.getCurrentURL(),
            item_title: document.title});
    };

    /**
     * convertDateTime - Create a date object from a python iso format
     * datetime string.
     */
    dq.convertDateTimeRegExp = /\.[^.]*$/;
    dq.convertDateTime = function(python_datetime) {
        return new Date(
                python_datetime.replace(dq.convertDateTimeRegExp, 'Z'))
    }

    /**
     * makeElement - Create a new DOM element
     *
     * Arguments
     *  - type: Elment 'type', or 'tag', e.g. script/p/div
     *  - o: Elment options, generally attributes, available attributes:
     *     - class: element className
     *     - id: element id
     *     - text: element textContent
     *     - html: element innerHTML
     *     - name: element name
     *  - children: an Array() of DOM elements or a single DOM element that should
     *    be appended to the new element
     *
     *  Returns a DOM element
     */
    dq.makeElement = function (type, o, children) {
        em = document.createElement(type);

        if (o) {
            if (o.class)
                em.className = o.class;
            if (o.id)
                em.setAttribute('id', o.id);
            if (o.text)
                em.textContent = o.text;
            if (o.html)
                em.innerHTML = o.html;
            if (o.placeholder)
                em.setAttribute('placeholder', o.placeholder);
            if (o.name)
                em.setAttribute('name', o.name);
            if (o.title)
                em.setAttribute('title', o.title);

            if (o.reversed)
                em.setAttribute('reversed', o.reversed)
        }

        dq.browserSupportsReversedList = function () {
             return 'reversed' in document.createElement('ol');
        }

        if (children && ! children.length)
            em.appendChild(children);
        else
            for (i in children)
                em.appendChild(children[i]);

        return em;
    };

    /**
     * renderComments - Render comments from an array
     *
     * Arguments:
     *  - comments: an array of comment objects returned by desqus
     */
    dq.renderComments = function (comments) {
        dq.commentContainer.innerHTML = '';
        dq.log(comments);
        for (comment in comments) {
            var comment = comments[comment];
            var container = dq.makeElement('li');

            container.appendChild(
                    dq.makeElement('p', {
                        text: comment.text,
                        class: 'comment-text'}));
            container.appendChild(
                    dq.makeElement('span', {
                        text: dq.convertDateTime(comment.created).toString(),
                        title: comment.created,
                        class: 'comment-created'}));
            container.appendChild(
                    dq.makeElement('span', {
                        text: comment.username,
                        class: 'comment-username'}));
            dq.commentContainer.appendChild(container);
        }
        dq.reversedListsPolyfill();
    };

    /**
     * onCommentSubmit - Event handler for comment form submit
     *
     * Disables the input fields and sends a POST request with the comment and
     * item id to desqus.
     */
    dq.onCommentSubmit = function (e) {
        e.preventDefault();
        dq.submitButton.disabled = true;
        dq.commentField.disabled = true;

        callback = function (res, status) {
            dq.log(res);
            dq.log(status);
            dq.submitButton.disabled = false;
            dq.commentField.disabled = false;
            dq.commentField.value = '';
            dq.getComments();
        };

        body = JSON.stringify({
            comment: dq.commentField.value,
            item: dq.jsonData.item.id});

        headers = {'Content-Type': 'application/json'};

        dq.request('/comments',
                callback,
                body,
                'POST',
                headers);
    };

    /**
     * renderForm - Render the comment form
     *
     * Depends on dq.formContainer being set to the appropriate DOM element.
     */
    dq.renderForm = function () {
        dq.form = dq.makeElement('form', {
            id: 'talkatv-comment-form'});

        dq.form.appendChild(
            dq.makeElement('div', {
                id: 'comment-field-wrapper'},
                dq.commentField = dq.makeElement('textarea', {
                    name: 'comment',
                    id: 'comment',
                    placeholder: 'Write a comment...'})));

        dq.form.appendChild(
            dq.submitButton = dq.makeElement('button', {
                text: 'Post comment'}));

        dq.form.onsubmit = dq.onCommentSubmit;

        dq.formContainer.appendChild(dq.form);
    };

    /**
     * request - Helper function for CORS XMLHttpRequest requests
     *
     * Arguments:
     *  - uri: The uri the request should be sent to, dq.home and '/api' will
     *    automatically be prepended
     *  - callback: XMLHttpRequest.DONE request callback, should accept 
     *    (response, status) where response may be either raw data or an object
     *    parsed from a JSON response
     *  - params: GET parameters used for get requests
     *  - method: POST/GET
     *  - headers: Headers used in a POST request
     *
     *  TODO
     *  Refractor params, method, headers into single "options" object arg.
     */
    dq.request = function (uri, callback, params, method, headers) {
        client = dq.getClient();
        //$.getJSON(dq.home + '/api' + uri, callback);
        var queryString = '';

        if (! method || method == 'GET') {
            method = 'GET';
            for (param in params) {
                queryString += '&' + param + '=' + encodeURIComponent(params[param]);
            }
        } else if (method == 'POST') {
            for (header in headers) {
            }
        }
        dq.log(method + ' ' + uri);

        uri = dq.home + '/api' + uri;
        if (queryString.length) {
            uri += '?' + queryString;
        }

        client.open(method, uri, true);
        client.withCredentials = true;

        client.onreadystatechange = function () {
            switch (this.readyState) {
                case this.DONE:
                    data = null;

                    try {
                        data = JSON.parse(this.response)
                    } catch (e) {
                        dq.log(e);
                    }

                    callback(data || this.response, this.status);
                    delete client;
                    break;
                default:
                    dq.log(['readyState: ', this.readyState]);
            }
        };

        if (method == 'POST') {
            client.send(params);
        } else {
            client.send();
        }
    };

    /**
     * log - Shortcut/wrapper for console.log
     *
     * Implemented according to <http://stackoverflow.com/a/2654006/202522>
     */
    if (window.console && typeof console.log === "function"){
        // use apply to preserve context and invocations with multiple arguments
        dq.log = function () { console.log.apply(console, arguments); };
    } else {
        dq.log = function() { return; }
    }

    /**
     * reversedListsPolyfill - Support refveresed lists in non-supported 
     * browsers
     *
     * License of inner login of this function is unknown. The origin
     * seems to be <https://gist.github.com/1671548>
     */
    dq.reversedListsPolyfill = function () {
        //a polyfill for the ordered-list reversed attribute
        // http://www.whatwg.org/specs/web-apps/current-work/multipage/grouping-content.html#the-ol-element
        // http://www.whatwg.org/specs/web-apps/current-work/multipage/grouping-content.html#dom-li-value

        //uses these awesomeness:
        // Array.prototype.forEach
        // Element.prototype.children
        //if you want support for older browsers *cough*IE8-*cough*, then use the other
        // file provided
        (function () {
        "use strict";

            if ( 'reversed' in document.createElement('ol') ) {
                return;
            }

            [].forEach.call( document.getElementsByTagName('ol'), function ( list ) {
                if ( list.getAttribute( 'reversed' ) !== null ) {
                    reverseList( list );
                }
            });

            function reverseList ( list ) {
                var children = list.children, count = list.getAttribute('start');

                //check to see if a start attribute is provided
                if ( count !== null ) {
                    count = Number( count );

                    if ( isNaN(count) ) {
                        count = null;
                    }
                }

                //no, this isn't duplication - start will be set to null
                // in the previous if statement if an invalid start attribute
                // is provided
                if ( count === null ) {
                    count = children.length;
                }

                [].forEach.call( children, function ( child ) {
                    child.value = count--;
                });
            }
        }());
    };
})(desqus);

/**
 * Start her up!
 */
desqus.render();
