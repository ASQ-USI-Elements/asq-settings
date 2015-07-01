var ASQPlugin = require('asq-plugin');
var ObjectId = require('mongoose').Types.ObjectId;
var Promise = require('bluebird');
var coroutine = Promise.coroutine;
var cheerio = require('cheerio');
var assert = require('assert');
var _ = require('lodash').runInContext();


module.exports = ASQPlugin.extend({
  tagName : 'asq-configuration',

  hooks:{
    "create_slideshow_configuration" : "createSlideshowConf",
    'update_slideshow_configuration' : 'updateSlideshowConf'
  },


  createSlideshowConf: coroutine(function *createSlideshowConfGen(option){

    var slideshow_id = option.slideshow_id;

    // var slideshow = yield this.asq.db.model("Slideshow").findById(slideshow_id).exec();
    var slideshow = option.slideshow;
    var presentationConf = slideshow.getSettings();

    // the _.mixin in lodash behaves strangely
    
    var settings = this.parseConf(option.html);
    
    yield this.mixin(presentationConf, settings);
    
    return slideshow.save().then(function(){
      return option;
    });
  }),

  // TODO: might use setting._id directly
  mixin: coroutine(function* mixinGen(des, src) {
    for ( var i=0; i<des.length; i++ ) {
      var key = des[i].key;
      if ( src.hasOwnProperty(key) ) {
        des[i].value = src[key];
        yield des[i].save();
      } 
    }
  }),
   
 
  parseConf: function(html) {
    var $ = cheerio.load(html, {decodeEntities: false});

    //when there's no configuration element
    if(! $(this.tagName).length) return {};

    var attr = $(this.tagName).attr();

    // The reason is following: the attributes in html file are not in camelCase
    // while in DB the attributes are in camelCase;
    attr['maxNumSubmissions'] = attr['maxnumsubmissions'];
    delete attr['maxnumsubmissions'];

    return attr ;
  },

  //TODO: delete console.log
  updateSlideshowConf: coroutine(function *updateSlideshowConf(option){
    console.log('updateSlideshowConf');
    var slideshow = option.slideshow;
    // modify databse
    var newSettings = option.conf;
    var currentSettings = yield slideshow.getSettings();
    yield this.mixin(currentSettings, newSettings);
    yield slideshow.save();

    var $ = cheerio.load(option.html, {decodeEntities: false});
    var attr = $(this.tagName).attr();
    var currentConf = attr;
    
    var newConf = option.conf;
    _.mixin(newConf, currentConf);
    newConf = yield this.lowerCaseAttributes(newConf);
    $(this.tagName).attr(newConf);

    return Promise.resolve(option);
  }),

  lowerCaseAttributes: coroutine(function *lowerCaseAttributes(attrs){
    var newAttrs = {};
    for ( var key in attrs ) {
      newAttrs[key.toLowerCase()] = attrs[key];
    }
    return newAttrs
  })

});