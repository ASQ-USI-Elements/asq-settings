"use strict";

var chai = require('chai');
var sinon = require("sinon");
var should = chai.should();
var expect = chai.expect;
var cheerio = require('cheerio');
var Promise = require('bluebird');
var coroutine = Promise.coroutine;
var modulePath = "../../lib/asqConfigurationPlugin";
var fs = require("fs");
var _ = require('lodash').runInContext();

var isEmptyObjectButNotArray = function(obj) {
  return _.isObject(obj) && !_.isArray(obj) && _.isEmpty(obj);
}

describe("asqConfigurationPlugin.js", function(){
  
  before(function(){
    var then =  this.then = function(cb){
      return cb();
    };

    var create = this.create = sinon.stub().returns({
      then: then
    });

    this.tagName = "asq-configuration";

    this.asq = {
      registerHook: function(){},
      db: {
        model: function(){
          return {
            create: create
          }
        }
      }
    }

    //load html fixtures
    this.simpleHtml = fs.readFileSync(require.resolve('./fixtures/simple.html'), 'utf-8');
    this.emptyHtml = fs.readFileSync(require.resolve('./fixtures/emptyHtml.html'), 'utf-8');
    this.manyHtml = fs.readFileSync(require.resolve('./fixtures/manyHtml.html'), 'utf-8');
    this.attributesHtml = fs.readFileSync(require.resolve('./fixtures/attributes.html'), 'utf-8');
    // this.questionsHtml = fs.readFileSync(require.resolve('./fixtures/questions.html'), 'utf-8');
    
    this.asqConfigurationPlugin = require(modulePath);
  });

  describe("parseSettings", function(){

    beforeEach(function(){
      this.asqConf = new this.asqConfigurationPlugin(this.asq);
    });


    it("should return an given object", function(){
      var result = this.asqConf.parseSettings(this.simpleHtml);
      expect(JSON.stringify(result)).to.equal('{"slideflow":"follow","assessment":"self","maxNumSubmissions":"999"}');
    
    });

    it("should deal with only one tag", function(){
      var result = this.asqConf.parseSettings(this.manyHtml);
      expect(JSON.stringify(result)).to.equal('{"slideflow":"follow","assessment":"self","maxNumSubmissions":"999"}')
    });

    it("should return empty object when there is no asq-configuration", function(){
     var result = this.asqConf.parseSettings(this.emptyHtml);

     expect(isEmptyObjectButNotArray(result)).to.equal(true);
    });
  });

  describe("parseHtml", function(){

    before(function(){
      sinon.stub(this.asqConfigurationPlugin.prototype, "parseSettings").returns({});
      
      this.option = {
        slideshow: {
          getSettings: coroutine(function*(){return {}}),
          save: function() {
            return {
              then: function(fn) {
                return fn()
              }
            }
          }
        },
        html: null
      }
    });

    beforeEach(function(){
      this.asqConf = new this.asqConfigurationPlugin(this.asq);
      this.asqConfigurationPlugin.prototype.parseSettings.reset();
      
      
    });

    after(function(){
      this.asqConfigurationPlugin.prototype.parseSettings.restore();
    });


    it("should call parseSettings() once", function(){
      this.asqConf.parseHtml(this.option);
      this.asqConf.parseSettings.calledOnce.should.equal(true);

    });
  });

  describe.skip("updateSlideshowSettings", function(){

  });

 
});
