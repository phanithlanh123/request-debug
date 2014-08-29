var lib     = require('./lib'),
    mocha   = require('mocha'),
    request = require('request'),
    should  = require('should');

describe('request-debug', function() {
    before(function() {
        lib.enableDebugging(request);
        lib.startServers();

        // NOTE: Cannot call request-debug on an object returned from
        // request.defaults, because it doesn't have the Request property
        // anymore
        request = request.defaults({
            headers : {
                host : 'localhost'
            },
            rejectUnauthorized : false
        });
    });

    beforeEach(function() {
        lib.clearRequests();
    });

    it('should capture a normal request', function(done) {
        request(lib.urls.http + '/bottom', function(err, res, body) {
            should.not.exist(err);
            lib.fixVariableHeaders();
            lib.requests.should.eql([
                {
                    request : {
                        uri : lib.urls.http + '/bottom',
                        method : 'GET',
                        headers : {
                            host : 'localhost'
                        }
                    }
                }, {
                    response : {
                        headers : {
                            connection       : 'keep-alive',
                            'content-length' : '10',
                            'content-type'   : 'text/html; charset=utf-8',
                            date             : '<date>',
                            etag             : 'W/"<etag>"',
                            'x-powered-by'   : 'Express'
                        },
                        statusCode : 200,
                        body       : 'Request OK'
                    }
                }
            ]);
            done();
        });
    });

    it('should capture a request with no callback', function(done) {
        var r = request(lib.urls.http + '/bottom');
        r.on('complete', function(res) {
            lib.fixVariableHeaders();
            lib.requests.should.eql([
                {
                    request : {
                        uri : lib.urls.http + '/bottom',
                        method : 'GET',
                        headers : {
                            host : 'localhost'
                        }
                    }
                }, {
                    response : {
                        headers : {
                            connection       : 'keep-alive',
                            'content-length' : '10',
                            'content-type'   : 'text/html; charset=utf-8',
                            date             : '<date>',
                            etag             : 'W/"<etag>"',
                            'x-powered-by'   : 'Express'
                        },
                        statusCode : 200
                    }
                }
            ]);
            done();
        });
    });

    it('should capture a redirect', function(done) {
        request(lib.urls.http + '/middle', function(err, res, body) {
            should.not.exist(err);
            lib.fixVariableHeaders();
            lib.requests.should.eql([
                {
                    request : {
                        uri     : lib.urls.http + '/middle',
                        method  : 'GET',
                        headers : {
                            host : 'localhost'
                        }
                    }
                }, {
                    redirect : {
                        headers : {
                            connection       : 'keep-alive',
                            'content-length' : '41',
                            'content-type'   : 'text/plain; charset=utf-8',
                            date             : '<date>',
                            location         : '/bottom',
                            vary             : 'Accept',
                            'x-powered-by'   : 'Express',
                        },
                        statusCode : 302,
                        uri        : lib.urls.http + '/bottom'
                    }
                }, {
                    request : {
                        uri     : lib.urls.http + '/bottom',
                        method  : 'GET',
                        headers : {
                            host : 'localhost:' + lib.ports.http
                        }
                    }
                }, {
                    response : {
                        headers : {
                            connection       : 'keep-alive',
                            'content-length' : '10',
                            'content-type'   : 'text/html; charset=utf-8',
                            date             : '<date>',
                            etag             : 'W/"<etag>"',
                            'x-powered-by'   : 'Express'
                        },
                        statusCode : 200,
                        body       : 'Request OK'
                    }
                }
            ]);
            done();
        });
    });

    it('should capture a cross-protocol redirect', function(done) {
        request(lib.urls.https + '/middle/http', function(err, res, body) {
            should.not.exist(err);
            lib.fixVariableHeaders();
            lib.requests.should.eql([
                {
                    request : {
                        uri     : lib.urls.https + '/middle/http',
                        method  : 'GET',
                        headers : {
                            host : 'localhost'
                        }
                    }
                }, {
                    redirect : {
                        headers : {
                            connection       : 'keep-alive',
                            'content-length' : '62',
                            'content-type'   : 'text/plain; charset=utf-8',
                            date             : '<date>',
                            location         : lib.urls.http + '/bottom',
                            vary             : 'Accept',
                            'x-powered-by'   : 'Express',
                        },
                        statusCode : 302,
                        uri        : lib.urls.http + '/bottom'
                    }
                }, {
                    request : {
                        uri     : lib.urls.http + '/bottom',
                        method  : 'GET',
                        headers : {
                            host : 'localhost:' + lib.ports.http
                        }
                    }
                }, {
                    response : {
                        headers : {
                            connection       : 'keep-alive',
                            'content-length' : '10',
                            'content-type'   : 'text/html; charset=utf-8',
                            date             : '<date>',
                            etag             : 'W/"<etag>"',
                            'x-powered-by'   : 'Express'
                        },
                        statusCode : 200,
                        body       : 'Request OK'
                    }
                }
            ]);
            done();
        });
    });

    it('should capture an auth challenge', function(done) {
        request(lib.urls.http + '/auth/bottom', {
            auth : {
                user : 'admin',
                pass : 'mypass',
                sendImmediately : false
            }
        }, function(err, res, body) {
            should.not.exist(err);
            lib.fixVariableHeaders();
            lib.requests.should.eql([
                {
                    request : {
                        uri     : lib.urls.http + '/auth/bottom',
                        method  : 'GET',
                        headers : {
                            host : 'localhost'
                        }
                    }
                }, {
                    auth : {
                        headers : {
                            connection          : 'keep-alive',
                            date                : '<date>',
                            'transfer-encoding' : 'chunked',
                            'www-authenticate'  : 'Digest realm="Users" <+nonce,qop>',
                            'x-powered-by'      : 'Express',
                        },
                        statusCode : 401,
                        uri        : lib.urls.http + '/auth/bottom'
                    }
                }, {
                    request : {
                        uri     : lib.urls.http + '/auth/bottom',
                        method  : 'GET',
                        headers : {
                            authorization : 'Digest username="admin" <+realm,nonce,uri,qop,response,nc,cnonce>',
                            host          : 'localhost'
                        }
                    }
                }, {
                    response : {
                        headers : {
                            connection       : 'keep-alive',
                            'content-length' : '10',
                            'content-type'   : 'text/html; charset=utf-8',
                            date             : '<date>',
                            etag             : 'W/"<etag>"',
                            'x-powered-by'   : 'Express'
                        },
                        statusCode : 200,
                        body       : 'Request OK'
                    }
                }
            ]);
            done();
        });
    });

    it('should capture a complicated redirect', function(done) {
        request(lib.urls.https + '/auth/top/http', {
            auth : {
                user : 'admin',
                pass : 'mypass',
                sendImmediately : false
            }
        }, function(err, res, body) {
            should.not.exist(err);
            lib.fixVariableHeaders();
            lib.requests.should.eql([
                {
                    request : {
                        uri     : lib.urls.https + '/auth/top/http',
                        method  : 'GET',
                        headers : {
                            host : 'localhost'
                        }
                    }
                }, {
                    auth : {
                        headers : {
                            connection          : 'keep-alive',
                            date                : '<date>',
                            'transfer-encoding' : 'chunked',
                            'www-authenticate'  : 'Digest realm="Users" <+nonce,qop>',
                            'x-powered-by'      : 'Express',
                        },
                        statusCode : 401,
                        uri        : lib.urls.https + '/auth/top/http'
                    }
                }, {
                    request : {
                        uri     : lib.urls.https + '/auth/top/http',
                        method  : 'GET',
                        headers : {
                            authorization : 'Digest username="admin" <+realm,nonce,uri,qop,response,nc,cnonce>',
                            host          : 'localhost'
                        }
                    }
                }, {
                    redirect : {
                        headers : {
                            connection       : 'keep-alive',
                            'content-length' : '62',
                            'content-type'   : 'text/plain; charset=utf-8',
                            date             : '<date>',
                            location         : lib.urls.http + '/middle',
                            vary             : 'Accept',
                            'x-powered-by'   : 'Express',
                        },
                        statusCode : 302,
                        uri        : lib.urls.http + '/middle'
                    }
                }, {
                    request : {
                        uri     : lib.urls.http + '/middle',
                        method  : 'GET',
                        headers : {
                            authorization : 'Digest username="admin" <+realm,nonce,uri,qop,response,nc,cnonce>',
                            host          : 'localhost:' + lib.ports.http
                        }
                    }
                }, {
                    redirect : {
                        headers : {
                            connection       : 'keep-alive',
                            'content-length' : '41',
                            'content-type'   : 'text/plain; charset=utf-8',
                            date             : '<date>',
                            location         : '/bottom',
                            vary             : 'Accept',
                            'x-powered-by'   : 'Express',
                        },
                        statusCode : 302,
                        uri        : lib.urls.http + '/bottom'
                    }
                }, {
                    request : {
                        uri     : lib.urls.http + '/bottom',
                        method  : 'GET',
                        headers : {
                            authorization : 'Digest username="admin" <+realm,nonce,uri,qop,response,nc,cnonce>',
                            host          : 'localhost:' + lib.ports.http
                        }
                    }
                }, {
                    response : {
                        headers : {
                            connection       : 'keep-alive',
                            'content-length' : '10',
                            'content-type'   : 'text/html; charset=utf-8',
                            date             : '<date>',
                            etag             : 'W/"<etag>"',
                            'x-powered-by'   : 'Express'
                        },
                        statusCode : 200,
                        body       : 'Request OK'
                    }
                }
            ]);
            done();
        });
    });
});
