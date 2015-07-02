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
    "parse_html" : "parseHtml",
    'update_slideshow_settings' : 'updateSlideshowSettings'
  },

  // TODO: let mongoDB store functions in settings
  parseHtml: coroutine(function *parseHtmlGen(option){
    var slideshow_id = option.slideshow_id;

    var slideshow = yield this.asq.db.model("Slideshow").findById(slideshow_id).exec();
    var presentationConf = yield slideshow.getSettings();

    var settings = this.parseSettings(option.html);
    yield this.mixinSettings(presentationConf, settings);
    
    yield slideshow.save();
    return option;
  }),

  mixinSettings: coroutine(function* mixinSettingsGen(des, src) {
    for ( var i=0; i<des.length; i++ ) {
      var key = des[i].key;
      if ( src.hasOwnProperty(key) ) {
        des[i].value = src[key];
        des[i].markModified('value');
        yield des[i].save();
      } 
    }
  }),
   
 
  parseSettings: function(html) {
    var $ = cheerio.load(html, {decodeEntities: false});

    //when there's no configuration element
    if(! $(this.tagName).length) return {};

    var attr = $(this.tagName).attr();

    //TODO: be general
    // The reason is following: the attributes in html file are not in camelCase
    // while in DB the attributes are in camelCase;
    attr['maxNumSubmissions'] = attr['maxnumsubmissions'];
    delete attr['maxnumsubmissions'];

    return attr ;
  },

  updatePresentationSettingsDB: coroutine(function *updatePresentationSettingsDBGen(slideshow_id, settings){
    var slideshow = yield this.asq.db.model("Slideshow").findById(slideshow_id).exec();
    if ( !slideshow ) throw 'Cannot find slideshow.';

    var currentSettings = yield slideshow.getSettings();
    yield this.mixinSettings(currentSettings, settings);
  }),

  updatePresentationSettingsDust: coroutine(function *updatePresentationSettingsDustGen(settings, html){
    var oldSettings = this.parseSettings(html);

    var keys = Object.getOwnPropertyNames(settings);
    for ( var i in keys ) {
      var key = keys[i];
      oldSettings[key] = settings[key];
    }
    return this.writeSettingsAsAttributes(html, oldSettings);
  }),

  updateSlideshowSettings: coroutine(function *updateSlideshowSettings(option){
    console.log('updateSlideshowSettings');

    yield this.updatePresentationSettingsDB(option.slideshow_id, option.settings);
    
    var modifiedHtml = yield this.updatePresentationSettingsDust(option.settings, option.html);

    return {
      slideshow_id: option.slideshow_id,
      html: modifiedHtml,
      settings: option.settings
    }
  }),

  writeSettingsAsAttributes: function(html, settings) {
    var $ = cheerio.load(html, {decodeEntities: false});
    var l_settings = this.lowerCaseAttributes(settings);
    $(this.tagName).attr(l_settings);
    return Promise.resolve($.root().html());
  },

  lowerCaseAttributes: function(attrs){
    var newAttrs = {};
    for ( var key in attrs ) {
      newAttrs[key.toLowerCase()] = attrs[key];
    }
    return newAttrs;
  }

});