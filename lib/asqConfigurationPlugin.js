var ASQPlugin = require('asq-plugin');
var ObjectId = require('mongoose').Types.ObjectId;
var Promise = require('bluebird');
var coroutine = Promise.coroutine;
var cheerio = require('cheerio');
var assert = require('assert');
var _ = require('lodash');


//http://www.w3.org/html/wg/drafts/html/master/infrastructure.html#boolean-attributes
function getBooleanValOfBooleanAttr(attrName, attrValue){
  if(attrValue === '' || attrValue === attrName){
    return true;
  }
  return false;
}

module.exports = ASQPlugin.extend({
  tagName : 'asq-configuration',

  hooks:{
    "create_slideshow_conf" : "createSlideshowConf",
  },

  createSlideshowConf: function(option){

    console.log('createSlideshowConf');
    var lconf = this.parseConf(option.html);
    var slides_id = option.slides_id;

    var self = this;
    this.asq.db.model("Slideshow").findById(slides_id, function(err, slideshow) {
      console.log('hoho', slideshow.configuration);
      var gconf = slideshow.configuration;
      var conf = self.mixConf(lconf, gconf);

      console.log('createSlideshowConf', slides_id, lconf, gconf, conf);

      slideshow.configuration = lconf;
      slideshow.markModified('configuration');
      slideshow.save();
    });
    
    //return Promise that resolves with the (maybe modified) html
    // return this.asq.db.model("Slideshow").update({_id: slides_id},
    //   {$set: {configuration: conf}})
    // .then(function(){
    //   return Promise.resolve(conf);
    // });
    // 
    return Promise.resolve(true);
  },

  mixConf: function( lconf, gconf ) {
    for ( var g in gconf ) {
      if ( !lconf.hasOwnProperty(g) ) {
        lconf[g] = gconf[g];
      }
    }
    return lconf;
  },

  parseConf: function(html) {
    var $ = cheerio.load(html, {decodeEntities: false});
    var el = $(this.tagName);
    return $(el).attr();
  }


});