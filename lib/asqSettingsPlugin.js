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

  // TODO: let mongoDB store functions in settings
  parsePresentationSettings: coroutine(function *parsePresentationSettingsGen(option){
    var slideshow_id = option.slideshow_id;

    var slideshow = yield this.asq.db.model("Slideshow").findById(slideshow_id).exec();
    var presentationSettings = yield slideshow.getSettings();

    option.html = this.createIfSettingsNotExist(option.html);

    var settings = this.parseSettings(option.html);
    yield this.mixinSettings(presentationSettings, settings);
    
    yield slideshow.save();

    option.html = this.writeSettingsAsAttributes(option.html, presentationSettings);
    console.log(option.html );
    return option;
  }),

  // TODO: avoid this hardcode
  // There should be a way to access the default settings.
  getDefaultSettingByKey: function(key) {
    var settings = {
      maxNumSubmissions: {
        key: 'maxNumSubmissions',
        value: 0,
        kind: 'number',
      },
      slideflow: {
        key: 'slideflow',
        value: 'follow',
        kind: 'select',
        params: {
          options: ['self', 'follow', 'ghost']
        }, 
      },
      assessment: {
        key: 'assessment',
        value: 'self',
        kind: 'select',
        params: {
          options: ['peer', 'auto', 'self']
        }, 
      },
      example: {
        key: 'example',
        value: 2,
        kind: 'range',
        params: {
          min: 1,
          max: 5,
          step: 1
        }
      },
      flag: {
        key: 'flag',
        value: false,
        kind: 'boolean',
      }
    };

    if ( settings.hasOwnProperty(key) ) {
      return settings[key].value
    } else {
      throw 'Unknown setting: ' + key;
    }
  },

  mixinSettings: coroutine(function* mixinSettingsGen(des, src) {
    for ( var i=0; i<des.length; i++ ) {
      var key = des[i].key;
      if ( src.hasOwnProperty(key) ) {
        des[i].value = src[key];
        des[i].markModified('value');
        try{
          yield des[i].save();
        }catch(e){
          console.log('Exception(pre): ', e, key);
          des[i].value = this.getDefaultSettingByKey(key);
          des[i].markModified('value');
          yield des[i].save();
        }
      } 
    }
  }),

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

    yield this.updatePresentationSettingsDB(option.slideshow_id, option.settings);
    
    var modifiedHtml = yield this.updatePresentationSettingsDust(option.settings, option.html);

    return {
      slideshow_id: option.slideshow_id,
      html: modifiedHtml,
      settings: option.settings
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