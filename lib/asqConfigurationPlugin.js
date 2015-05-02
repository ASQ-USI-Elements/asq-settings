var ASQPlugin = require('asq-plugin');
var ObjectId = require('mongoose').Types.ObjectId;
var Promise = require('bluebird');
var coroutine = Promise.coroutine;
var cheerio = require('cheerio');
var assert = require('assert');
var _ = require('lodash');


module.exports = ASQPlugin.extend({
  tagName : 'asq-configuration',

  hooks:{
    "create_slideshow_configuration" : "createSlideshowConf",
  },

  // normal function also works here
  createSlideshowConf: coroutine(function *createSlideshowConfGen(option){
    var presentationConf = this.parseConf(option.html);
    var slideshow_id = option.slideshow_id;

    // var slideshow = yield this.asq.db.model("Slideshow").findById(slideshow_id).exec();
    var slideshow = option.slideshow;
    var defaultConf = slideshow.configuration;
    _.mixin(presentationConf, defaultConf);

    slideshow.configuration = presentationConf;
    slideshow.markModified('configuration');
    return slideshow.save().then(function(){
      console.log('');
      return option;
    });
  }),
   

  parseConf: function(html) {
    var $ = cheerio.load(html, {decodeEntities: false});
    return $(this.tagName).attr();
  }

});