"use strict";

var chai = require('chai');
var sinon = require("sinon");
var should = chai.should();
var expect = chai.expect;
var cheerio = require('cheerio');
var Promise = require('bluebird');
var modulePath = "../../lib/asqConfigurationPlugin";
var fs = require("fs");

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

  describe("parseConf", function(){

    beforeEach(function(){
      this.asqConf = new this.asqConfigurationPlugin(this.asq);
    });


    it("should return an given object", function(){
      var result = this.asqConf.parseConf(this.simpleHtml);
      expect(JSON.stringify(result)).to.equal('{"slideflow":"follow","assessment":"self","maxNumSubmissions":"999"}');
    
    });

    it("should deal with only one tag", function(){
      var result = this.asqConf.parseConf(this.manyHtml);
      expect(JSON.stringify(result)).to.equal('{"slideflow":"follow","assessment":"self","maxNumSubmissions":"999"}')
    });

    it("should return null when there is no asq-configuration", function(){
     var result = this.asqConf.parseConf(this.emptyHtml);
     //TODO add <asq-configuration> if there is no one
     expect(null===result).to.equal(true);
    });
  });

  describe("createSlideshowConf", function(){

    before(function(){
     sinon.stub(this.asqConfigurationPlugin.prototype, "parseConf").returns({});
    });

    beforeEach(function(){
      this.asqConf = new this.asqConfigurationPlugin(this.asq);
      this.asqConfigurationPlugin.prototype.parseConf.reset();
      
    });

    after(function(){
     this.asqConfigurationPlugin.prototype.parseConf.restore();
    });


    it("should call parseConf() once", function(){
      this.asqConf.createSlideshowConf(this.option);
      this.asqConf.parseConf.calledOnce.should.equal(true);
    });

    
  });

 
});
