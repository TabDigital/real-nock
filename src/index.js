var nock = require('nock');
var url  = require('url');
var httpProxy = require('http-proxy');

var PROXY_HOST = 'stub-nock-proxy-host';
var PROXY_COUNT = 0;

module.exports = Stub;

function Stub(opts) {
  var self = this;
  this.host = PROXY_HOST + (++PROXY_COUNT);
  this.port = opts.port;
  this.stub = nock('http://' + this.host + ':9999');
  this.default = opts.default || 'timeout';
  this.debug = !!opts.debug;
  this.running = false;
  this.server = httpProxy.createProxyServer({
    target: 'http://' + this.host + ':9999'
  });
  this.server.on('proxyRes', function(proxyRes, req, res) {
    self.log(req.method + ' ' + req.url + ' (HTTP ' + proxyRes.statusCode + ')');
  });
  this.server.on('error', function(err, req, res) {
    self.log(req.method + ' ' + req.url + ' (not stubbed)');
    handleError(req, res, self.default);
  });
}

Stub.prototype.start = function(done) {
  var self = this;
  if (this.running) {
    self.log('Already started');
    return done();
  }
  self.log('Starting');
  this.server.listen(this.port, function(err) {
    self.log(err ? ('Failed to start: ' + err) : 'Started');
    self.running = (err == null);
    done(err);
  });
};

Stub.prototype.stop = function(done) {
  var self = this;
  if (!this.running) {
    self.log('Already stopped');
    return done();
  }
  self.log('Stopping');
  this.server.close(function(err) {
    self.log(err ? ('Failed to stop: ' + err) : 'Stopped');
    self.running = (err != null);
    done(err);
  });
};

Stub.prototype.reset = function() {
  this.stub.pendingMocks().forEach(function(mock) {
    var u = url.parse(mock.replace(/^[A-Z]+ /, ''));
    nock.removeInterceptor({
      hostname: u.hostname,
      path: u.path,
      port: 9999
    });
  });
};

Stub.prototype.log = function(message) {
  if (this.debug) {
    console.log('[localhost:' + this.port + '] ' + message);
  }
};

function handleError(req, res, behaviour) {
  if (typeof(behaviour) === 'number') {
    // send a custom status code
    res.writeHead(behaviour);
    res.end();
  } else if (typeof(behaviour) === 'function') {
    // apply a custom function
    behaviour(req, res);
  } else if (behaviour === 'reset') {
    // destroy the socket to send ECONNRESET
    res.destroy();
  } else {
    // no nothing and let it timeout
  }
}
