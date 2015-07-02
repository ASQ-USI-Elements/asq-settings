var ASQPlugin = require('asq-plugin');
var ObjectId = require('mongoose').Types.ObjectId;
var Promise = require('bluebird');
var coroutine = Promise.coroutine;
var cheerio = require('cheerio');
var assert = require('assert');
var _ = require('lodash').runInContext();


module.exports = ASQPlugin.extend({
  tagName : 'asq-configuration',


  //TODO : parse.html

  hooks:{
    "parse_html" : "parseHtml",
    'update_slideshow_settings' : 'updateSlideshowSettings'
  },


  parseHtml: coroutine(function *parseHtmlGen(option){

    var slideshow_id = option.slideshow_id;

    // var slideshow = yield this.asq.db.model("Slideshow").findById(slideshow_id).exec();
    var slideshow = option.slideshow;
    var presentationConf = yield slideshow.getSettings();

    // the _.mixin in lodash behaves strangely
    
    var settings = this.parseSettings(option.html);
    yield this.mixin(presentationConf, settings);
    
    // slideshow.settings = presentationConf;
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

  //TODO: delete console.log
  updateSlideshowSettings: coroutine(function *updateSlideshowSettings(option){
    console.log('updateSlideshowSettings');
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

    return Promise.resolve({
      slideshow_id: option.slideshow_id,
      html: $.root().html(),
      slideshow: option.slideshow,
      conf: option.conf
      
    });
  }),

  lowerCaseAttributes: coroutine(function *lowerCaseAttributes(attrs){
    var newAttrs = {};
    for ( var key in attrs ) {
      newAttrs[key.toLowerCase()] = attrs[key];
    }
    return newAttrs
  })

});