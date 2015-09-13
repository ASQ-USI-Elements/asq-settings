var ASQPlugin = require('asq-plugin');
var ObjectId = require('mongoose').Types.ObjectId;
var Promise = require('bluebird');
var coroutine = Promise.coroutine;
var cheerio = require('cheerio');
var assert = require('assert');
var _ = require('lodash').runInContext();



module.exports = ASQPlugin.extend({
  tagName : 'asq-settings',


  hooks:{
    "parse_presentation_settings" : "parsePresentationSettings",
    'update_slideshow_settings' : 'updateSlideshowSettings'
  },


  parsePresentationSettings: coroutine(function *parsePresentationSettingsGen(option){
    var slideshow_id = option.slideshow_id;

    var slideshow = yield this.asq.db.model("Slideshow").findById(slideshow_id).exec();
    var presentationSettings = slideshow.settings;
    

    option.html = this.createIfSettingsNotExist(option.html);

    var settings = this.parseSettings(option.html);

    this.mixinSettings(presentationSettings, settings);
    

    yield slideshow.updateSettings(presentationSettings);

    option.html = this.writeSettingsAsAttributes(option.html, presentationSettings);
    return option;
  }),

  mixinSettings: function(des, src) {
    for ( var i=0; i<des.length; i++ ) {
      var key = des[i].key;
      if ( src.hasOwnProperty(key) ) {
        des[i].value = src[key];
      } 
    }
  },



  createIfSettingsNotExist: function(html) {
    var $ = cheerio.load(html, {decodeEntities: false});
    if(! $(this.tagName).length) {
      var element = $('<asq-settings></asq-settings>');
      $('body').children().first().after(element);
    }
    return $.root().html();
  },
   
 
  parseSettings: function(html) {
    var $ = cheerio.load(html, {decodeEntities: false});

    var attr = $(this.tagName).attr();
    //TODO: be general
    // The reason is following: the attributes in html file are not in camelCase
    // while in DB the attributes are in camelCase;
    if ( ! _.isUndefined(attr['maxnumsubmissions']) ) {
      attr['maxNumSubmissions'] = attr['maxnumsubmissions'];
      delete attr['maxnumsubmissions'];
    }
    

    return attr ;
  },

  mixinSettingsForUpdating: coroutine(function* mixinSettingsForUpdatingGen(des, src) {
    for ( var i=0; i<des.length; i++ ) {
      var key = des[i].key;
      if ( src.hasOwnProperty(key) ) {
        des[i].value = src[key];
      } 
    }
    return true
  }),

  updatePresentationSettingsDB: coroutine(function *updatePresentationSettingsDBGen(slideshow_id, settings){
    var slideshow = yield this.asq.db.model("Slideshow").findById(slideshow_id).exec();
    var currentSettings = slideshow.settings;
    this.mixinSettings(currentSettings, settings);

    var flag = yield slideshow.updateSettings(currentSettings);
    return flag
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
    var slideshow = yield this.asq.db.model("Slideshow").findById(option.slideshow_id).exec();
    if ( !slideshow ) throw 'Cannot find slideshow.';
    var oldSettings = slideshow.settings;

    var flag = false;
    flag = yield this.updatePresentationSettingsDB(option.slideshow_id, option.settings);
    
    var modifiedHtml = option.html;
    if ( flag ) {
      modifiedHtml = yield this.updatePresentationSettingsDust(option.settings, option.html);
    } else {
      // if updating is failed, rollback to old settings
      yield this.updatePresentationSettingsDB(option.slideshow_id, oldSettings);
    }
    return {
      slideshow_id: option.slideshow_id,
      html: modifiedHtml,
      settings: option.settings,
      status: flag
    }
  }),

  writeSettingsAsAttributes: function(html, settings) {
    if ( _.isArray(settings) ) {
      var tmp = {};
      settings.forEach(function(setting, index){
        tmp[setting.key] = setting.value
      });
      settings = tmp;
    }
    var $ = cheerio.load(html, {decodeEntities: false});
    var l_settings = this.lowerCaseAttributes(settings);
    $(this.tagName).attr(l_settings);
    return $.root().html();
  },

  lowerCaseAttributes: function(attrs){
    var newAttrs = {};
    for ( var key in attrs ) {
      newAttrs[key.toLowerCase()] = attrs[key];
    }
    return newAttrs;
  }

});