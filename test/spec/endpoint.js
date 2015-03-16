'use strict';

require('../mockwebrtc')();

var assert = require('assert');
var EventEmitter = require('events').EventEmitter;
var Q = require('q');
var util = require('./util');

var Endpoint = require('../../lib/endpoint');
var SIPJSUserAgent = require('../../lib/signaling/sipjsuseragent');

var accountSid = process.env['ACCOUNT_SID'];
var authToken = process.env['AUTH_TOKEN'];
var getCapabilityToken =
  require('../token').getCapabilityToken.bind(null, accountSid, authToken);

describe('Endpoint (SIPJSUserAgent)', function() {
  var aliceName = randomName();
  var aliceToken = getCapabilityToken(aliceName);
  var alice = null;

  describe('constructor', function() {
    var receivedEvent = false;

    it('emits "listen"', function(done) {
      alice = new Endpoint(aliceToken, { debug: false });
      alice.once('listen', function() {
        receivedEvent = true;
        done();
      });
      alice.once('listenFailed', function(error) {
        done(error);
      });
    });

    it('sets .address', function() {
      assert.equal(aliceName, alice.address);
    });

    describe('#unlisten', function() {
      var receivedEvent = false;

      it('updates .listening', function(done) {
        alice.unlisten().then(function() {
          assert(!alice.listening);
        }).then(null, done);
        alice.once('unlisten', function() {
          receivedEvent = true;
          done();
        });
      });

      it('emits "unlisten"', function() {
        assert(receivedEvent);
      });

      it('does not update .address', function() {
        assert.equal(aliceName, alice.address);
      });

      describe('#listen (with new Token)', function() {
        var aliceName = null;
        var aliceToken = null;
        var receiveEvent = false;

        it('updates .listening', function(done) {
          aliceName = randomName();
          aliceToken = getCapabilityToken(aliceName);
          alice.listen(aliceToken).then(function() {
            assert(alice.listening);
          }).then(done, done);
          alice.once('listen', function() {
            receivedEvent = true;
          });
        });

        it('emits "listen"', function() {
          assert(receivedEvent);
        });

        it('updates .address', function() {
          assert.equal(aliceName, alice.address);
        });
      });
    });
  });

  var uaName = null;
  var uaToken = null;
  var ua = null;

  describe('Receive incoming call', function() {
    var ict = null;
    var invite = null;

    it('emits "invite"', function(done) {
      uaName = randomName();
      uaToken = getCapabilityToken(uaName);
      ua = new SIPJSUserAgent(uaToken, { debug: false });
      ua.register().then(function() {
        ict = ua.invite(alice.address);
      }, function(error) {
        done(error);
      });
      alice.once('invite', function(_invite) {
        invite = _invite;
        done();
      });
    });

    describe('Invite#accept', function() {
      var conversation = null;

      it('updates .conversations', function(done) {
        invite.accept().then(function(_conversation) {
          conversation = _conversation;
          assert(alice.conversations.has(conversation));
        }).then(done, done);
      });

      describe('#leave', function() {
        it('updates .conversations', function(done) {
          alice.leave(conversation).then(function() {
            assert(!alice.conversations.has(conversation));
          }).then(done, done);
        });
      });
    });
  });

  describe('#invite', function() {
    var conversation = null;

    it('updates .conversations', function(done) {
      alice.invite(uaName).then(function(_conversation) {
        conversation = _conversation;
        assert(alice.conversations.has(conversation));
      }).then(done, done);
      ua.once('invite', function(ist) {
        ist.accept();
      });
    });

    describe('#leave', function() {
      it('updates .conversations', function(done) {
        alice.leave(conversation).then(function() {
          assert(!alice.conversations.has(conversation));
        }).then(done, done);
      });
    });
  });
});

function randomName() {
  return Math.random().toString(36).slice(2);
}