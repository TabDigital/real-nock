async = require 'async'
unirest = require 'unirest'
Stub = require '../src/index'

describe 'stubs', ->

  backend1 = new Stub(port: 9001, default: 404)
  backend2 = new Stub(port: 9002, default: 404)

  before (done) ->
    async.parallel [
      (next) -> backend1.start next
      (next) -> backend2.start next
    ], done

  after (done) ->
    async.parallel [
      (next) -> backend1.stop next
      (next) -> backend2.stop next
    ], done

  beforeEach ->
    backend1.reset()
    backend2.reset()

  it 'can set up separate stubs', (done) ->
    backend1.stub.get('/value').reply(200, 1)
    backend2.stub.get('/value').reply(200, 2)
    unirest.get('http://localhost:9001/value').end (res) ->
      res.body.should.eql 1
      unirest.get('http://localhost:9002/value').end (res) ->
        res.body.should.eql 2
        done()

  it 'can reset one stub without affecting the other', (done) ->
    backend1.stub.get('/value').reply(200, 1)
    backend2.stub.get('/value').reply(200, 2)
    backend1.reset()
    unirest.get('http://localhost:9001/value').end (res) ->
      res.status.should.eql 404
      unirest.get('http://localhost:9002/value').end (res) ->
        res.status.should.eql 200
        done()
