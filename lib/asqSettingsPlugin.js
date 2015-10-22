var ASQPlugin = require('asq-plugin');
var ObjectId = require('bson-objectid');
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
    var presentationSettings = slideshow.listSettings();
    

    option.html = this.createIfSettingsNotExist(option.html);

    var settings = this.parseSettings(option.html);

    this.mixinSettings(presentationSettings, settings);
    

    var success = false;
    while ( ! success ) {
      try {
        yield slideshow.updateSettings(presentationSettings);
        success = true;
      } catch(e) {
        if ( e.errorType !== 'InvalidSettingError' ) {
          throw e;
        }
        console.log('Failed to update settings.', e.message);
        var defaultSettings = this.asq.api.settings.defaultSettings['presentationObject'];
        for ( var i in presentationSettings ) {
          if ( presentationSettings[i].key === e.key ) {
            presentationSettings[i] = defaultSettings[e.key];
          }
        }
      }
    }

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

  dashed2Camel: function(attr) {
    var l_attr = _.clone(attr);
    Object.keys(l_attr).forEach(function(key, index){
      if ( key.contains('-') ) {
        var value = l_attr[key];
        delete l_attr[key];
        var camelCased = key.replace(/-([a-z])/g, function (g) { 
          return g[1].toUpperCase(); 
        });
        l_attr[camelCased] = value;
      }
    });
    return l_attr;
  },

  camel2dashed: function(attr) {
    var l_attr = _.clone(attr);
    Object.keys(l_attr).forEach(function(key, index){
      var value = l_attr[key];
      delete l_attr[key];
      var dashed = key.replace(/([A-Z])/g, function($1){
        return "-"+$1.toLowerCase()
      });
      l_attr[dashed] = value;
    });
    return l_attr
  },

  createIfSettingsNotExist: function(html) {
    var $ = cheerio.load(html, {
      decodeEntities: false,
      lowerCaseAttributeNames:false,
      lowerCaseTags:false,
      recognizeSelfClosing: true
    });
    if(! $(this.tagName).length) {
      var element = $('<asq-settings></asq-settings>');
      $('body').children().first().after(element);
    }
    return $.root().html();
  },
   
 
  parseSettings: function(html) {
    var $ = cheerio.load(html, {
      decodeEntities: false,
      lowerCaseAttributeNames:false,
      lowerCaseTags:false,
      recognizeSelfClosing: true
    });
    var attr = $(this.tagName).attr();  

    var defaultSettings = this.asq.api.settings.defaultSettings['presentationObject'];
    Object.keys(attr).forEach(function(key, index){
      if ( ! defaultSettings.hasOwnProperty(key) ) return;
      if ( (defaultSettings[key].kind) !== 'boolean' ) return;

      if ( _.isNull(attr[key]) || _.isUndefined(attr[key]) ) {
        attr[key] = true;
      } 

      if ( _.isString(attr[key]) ) {
        if ( attr[key].toUpperCase() === "TRUE" ) {
          attr[key] = true;
        } else if ( attr[key].toUpperCase() === "FALSE" ) {
          attr[key] = false;
        } else if ( attr[key].length === 0 ) {
          attr[key] = true;
        }
        // otherwise, do nothing
      }
    });

    return this.dashed2Camel(attr);
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
    yield slideshow.updateSettings(currentSettings);
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
       
    var modifiedHtml = option.html;
    try {
      yield this.updatePresentationSettingsDB(option.slideshow_id, option.settings);

      modifiedHtml = yield this.updatePresentationSettingsDust(option.settings, option.html);

      return {
        slideshow_id: option.slideshow_id,
        html: modifiedHtml,
        settings: option.settings,
        status: 'success'
      }
    } catch(e) {
      console.log(e);
      return {
        slideshow_id: option.slideshow_id,
        html: modifiedHtml,
        settings: option.settings,
        status: 'failed'
      }
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
    var $ = cheerio.load(html, {
      decodeEntities: false,
      lowerCaseAttributeNames:false,
      lowerCaseTags:false,
      recognizeSelfClosing: true
    });
    var l_settings = this.camel2dashed(settings);
    $(this.tagName).attr(l_settings);

    Object.keys(l_settings).forEach(function(key, index){
      if ( _.isBoolean(l_settings[key]) && l_settings[key] === false ) {
        $(this.tagName).removeAttr(key);
      }
    }, this);
    return $.root().html();
  }

});