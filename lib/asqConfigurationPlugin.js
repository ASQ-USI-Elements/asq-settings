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
      return option;
    });
  }),
   
  // The reason is following: the attribute in html file is without camelCase, while 
  // in DB the attributes are in camelCase;
  parseConf: function(html) {
    var $ = cheerio.load(html, {decodeEntities: false});
    var attr = $(this.tagName).attr();
    attr['maxNumSubmissions'] = attr['maxnumsubmissions'];
    delete attr['maxnumsubmissions'];
    return attr ;
  },

  updateSlideshowConf: coroutine(function *updateSlideshowConf(option){
    console.log('\nupdateSlideshowConf HKK\n');
    var $ = cheerio.load(option.html, {decodeEntities: false});
    var attr = $(this.tagName).attr();

    var currentConf = attr;
    var newConf = option.conf;

    _.mixin(newConf, currentConf);

    var slideshow = option.slideshow;
    slideshow.configuration = newConf;
    slideshow.markModified('configuration');
    yield slideshow.save();

    newConf = yield this.lowerCaseAttributes(newConf);
    $(this.tagName).attr(newConf);

    return Promise.resolve($.root().html());

  }),

  lowerCaseAttributes: coroutine(function *lowerCaseAttributes(attrs){
    var newAttrs = {};
    for ( var key in attrs ) {
      newAttrs[key.toLowerCase()] = attrs[key];
    }
    return newAttrs
  })

});