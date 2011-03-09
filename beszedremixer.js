var padZero, sec2smpte, smpte2sec, tim;
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; }, __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
  for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
  function ctor() { this.constructor = child; }
  ctor.prototype = parent.prototype;
  child.prototype = new ctor;
  child.__super__ = parent.prototype;
  return child;
};
padZero = function(n) {
  if (n < 10) {
    return '0' + n;
  } else {
    return n.toString();
  }
};
smpte2sec = function(hh_mm_ss_ff, fps) {
  var ff, hh, mm, ss, x, _ref;
  _ref = (function() {
    var _i, _len, _ref, _results;
    _ref = hh_mm_ss_ff.split(":");
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      x = _ref[_i];
      _results.push(parseInt(x, 10));
    }
    return _results;
  })(), hh = _ref[0], mm = _ref[1], ss = _ref[2], ff = _ref[3];
  return hh * 3600 + mm * 60 + ss + ff / fps;
};
sec2smpte = function(time, fps) {
  return [padZero(Math.floor(time / 3600) % 24), padZero(Math.floor(time / 60) % 60), padZero(Math.floor(time % 60)), padZero(Math.floor(((time % 1) * fps).toFixed(3)))].join(":");
};
tim = function(t) {
  return sec2smpte(t, 25);
};
$(document).ready(function() {
  var Phrase, RefinePhrase, RefinerView, Speech, TaggerButton, TranscriptionBox, Vid, VideoBox, Workspace;
  Phrase = (function() {
    function Phrase() {
      this.play = __bind(this.play, this);;
      this.lengthMs = __bind(this.lengthMs, this);;
      this.length = __bind(this.length, this);;
      this.startTime = __bind(this.startTime, this);;
      this.validate = __bind(this.validate, this);;      Phrase.__super__.constructor.apply(this, arguments);
    }
    __extends(Phrase, Backbone.Model);
    Phrase.prototype.validate = function(attrs) {
      if (attrs.text === '') {
        return 'nem lehet üres';
      }
    };
    Phrase.prototype.startTime = function() {
      return smpte2sec(this.get('start'), 25);
    };
    Phrase.prototype.length = function() {
      return smpte2sec(this.get('end'), 25) - smpte2sec(this.get('start'), 25);
    };
    Phrase.prototype.lengthMs = function() {
      return this.length() * 1000;
    };
    Phrase.prototype.play = function() {
      var v;
      v = this.get('video');
      v.currentTime = this.startTime();
      return $(v).one('seeked', __bind(function() {
        console.log("started at: " + v.currentTime + " (" + (sec2smpte(v.currentTime, 25)) + ")");
        v.play();
        return window.setTimeout(__bind(function() {
          var diff, shouldbe;
          v.pause();
          shouldbe = this.startTime() + this.lengthMs() / 1000;
          diff = Math.abs(v.currentTime - shouldbe);
          return console.log("paused at: " + v.currentTime + " (" + (sec2smpte(v.currentTime, 25)) + "); timeout set:" + (this.lengthMs()) + "; should be at: " + shouldbe + "; diff: " + diff + " (" + (sec2smpte(diff, 25)) + ")");
        }, this), this.lengthMs());
      }, this));
    };
    return Phrase;
  })();
  Speech = (function() {
    function Speech() {
      Speech.__super__.constructor.apply(this, arguments);
    }
    __extends(Speech, Backbone.Collection);
    Speech.prototype.model = Phrase;
    return Speech;
  })();
  Vid = (function() {
    function Vid() {
      this.getNextPhrase = __bind(this.getNextPhrase, this);;
      this.getLastPhrase = __bind(this.getLastPhrase, this);;
      this.saveTranscription = __bind(this.saveTranscription, this);;
      this.initialize = __bind(this.initialize, this);;      Vid.__super__.constructor.apply(this, arguments);
    }
    __extends(Vid, Backbone.Model);
    Vid.prototype.initialize = function() {};
    Vid.prototype.saveTranscription = function(t) {
      var arr, phrase, phrases;
      arr = t.replace(/^\s+|\s+$/, '').replace(/[\?!\.-;,]/g, ' ').replace(/\s+/g, ' ').toLowerCase().split(' ');
      phrases = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = arr.length; _i < _len; _i++) {
          phrase = arr[_i];
          _results.push(new Phrase({
            text: phrase,
            video: this.player.v
          }));
        }
        return _results;
      }).call(this);
      return this.set({
        speech: new Speech(phrases)
      });
    };
    Vid.prototype.getLastPhrase = function() {
      var last;
      return last = this.get('speech').chain().select(function(phrase) {
        return typeof phrase.get('start') === 'string';
      }).last().value();
    };
    Vid.prototype.getNextPhrase = function() {
      return this.get('speech').detect(function(phrase) {
        return typeof phrase.get('start') === 'undefined';
      });
    };
    return Vid;
  })();
  VideoBox = (function() {
    function VideoBox() {
      this.back2s = __bind(this.back2s, this);;
      this.playpause = __bind(this.playpause, this);;
      this.rewind = __bind(this.rewind, this);;
      this.render = __bind(this.render, this);;
      this.initialize = __bind(this.initialize, this);;      VideoBox.__super__.constructor.apply(this, arguments);
    }
    __extends(VideoBox, Backbone.View);
    VideoBox.prototype.tagName = 'video';
    VideoBox.prototype.template = _.template($('#vidtemplate').html());
    VideoBox.prototype.events = {
      'click #rewind': 'rewind',
      'click #playpause': 'playpause',
      'click #back2s': 'back2s'
    };
    VideoBox.prototype.initialize = function() {
      this.model.player = this;
      return this.render();
    };
    VideoBox.prototype.render = function() {
      $(this.el).html(this.template(this.model.toJSON()));
      this.v = $(this.tagName, this.el).get(0);
      this.v.addEventListener('timeupdate', __bind(function() {
        return $('#currenttime').html(sec2smpte(this.v.currentTime, this.model.get("fps")) + '/' + sec2smpte(this.v.duration, this.model.get("fps")));
      }, this), true);
      return this;
    };
    VideoBox.prototype.rewind = function() {
      return this.v.currentTime = 0;
    };
    VideoBox.prototype.playpause = function() {
      if (this.v.paused) {
        return this.v.play();
      } else {
        return this.v.pause();
      }
    };
    VideoBox.prototype.back2s = function() {
      return this.v.currentTime -= 4;
    };
    return VideoBox;
  })();
  TranscriptionBox = (function() {
    function TranscriptionBox() {
      this.saveTranscription = __bind(this.saveTranscription, this);;
      this.render = __bind(this.render, this);;
      this.initialize = __bind(this.initialize, this);;      TranscriptionBox.__super__.constructor.apply(this, arguments);
    }
    __extends(TranscriptionBox, Backbone.View);
    TranscriptionBox.prototype.initialize = function() {
      return this.render();
    };
    TranscriptionBox.prototype.events = {
      'click button': 'saveTranscription'
    };
    TranscriptionBox.prototype.render = function() {
      return $('textarea', this.el).html(this.model.get('transcription'));
    };
    TranscriptionBox.prototype.saveTranscription = function() {
      return this.model.saveTranscription($('textarea', this.el).html());
    };
    return TranscriptionBox;
  })();
  RefinePhrase = (function() {
    function RefinePhrase() {
      this.play = __bind(this.play, this);;
      this.save = __bind(this.save, this);;
      this.render = __bind(this.render, this);;
      this.initialize = __bind(this.initialize, this);;      RefinePhrase.__super__.constructor.apply(this, arguments);
    }
    __extends(RefinePhrase, Backbone.View);
    RefinePhrase.prototype.template = _.template($('#refinetemplate').html());
    RefinePhrase.prototype.events = {
      'click button': 'play',
      'change input': 'save'
    };
    RefinePhrase.prototype.initialize = function() {
      this.model.bind('change', this.render);
      return this.render;
    };
    RefinePhrase.prototype.render = function() {
      $(this.el).html(this.template(this.model.toJSON()));
      return this;
    };
    RefinePhrase.prototype.save = function() {
      return this.model.set({
        start: $('input', this.el).get(0).value,
        end: $('input', this.el).get(1).value
      });
    };
    RefinePhrase.prototype.play = function() {
      return this.model.play();
    };
    return RefinePhrase;
  })();
  TaggerButton = (function() {
    function TaggerButton() {
      this.render = __bind(this.render, this);;
      this.initialize = __bind(this.initialize, this);;      TaggerButton.__super__.constructor.apply(this, arguments);
    }
    __extends(TaggerButton, Backbone.View);
    TaggerButton.prototype.initialize = function() {
      this.model.bind('all', this.render);
      return this.video = this.model.player.v;
    };
    TaggerButton.prototype.events = {
      'click': 'next'
    };
    TaggerButton.prototype.next = function() {
      var currentTime;
      if (!(this.video.paused || this.video.ended)) {
        currentTime = this.video.currentTime;
        try {
          this.model.getLastPhrase().set({
            end: sec2smpte(currentTime, this.model.get('fps'))
          });
        } catch (_e) {}
        this.model.getNextPhrase().set({
          start: sec2smpte(currentTime, this.model.get('fps'))
        });
        return this.render();
      } else {
        this.video.currentTime = 0;
        return this.video.play();
      }
    };
    TaggerButton.prototype.el = $('#taggerbutton');
    TaggerButton.prototype.render = function() {
      return this.el.html(this.model.getNextPhrase().get('text'));
    };
    return TaggerButton;
  })();
  RefinerView = (function() {
    function RefinerView() {
      this.render = __bind(this.render, this);;
      this.addOne = __bind(this.addOne, this);;
      this.initialize = __bind(this.initialize, this);;      RefinerView.__super__.constructor.apply(this, arguments);
    }
    __extends(RefinerView, Backbone.View);
    RefinerView.prototype.initialize = function() {
      return this.model.bind('change:speech', this.render);
    };
    RefinerView.prototype.addOne = function(phrase) {
      var view;
      view = new RefinePhrase({
        model: phrase
      });
      view.render();
      return this.el.append(view.render().el);
    };
    RefinerView.prototype.render = function() {
      this.el.html("");
      return this.model.get('speech').each(this.addOne);
    };
    return RefinerView;
  })();
  Workspace = (function() {
    function Workspace() {
      Workspace.__super__.constructor.apply(this, arguments);
    }
    __extends(Workspace, Backbone.Controller);
    Workspace.prototype.routes = {
      '': 'turnToPage',
      ':page': 'turnToPage'
    };
    Workspace.prototype.turnToPage = function(p) {
      if (p) {
        $('.sheet').hide();
        $('#' + p).show();
        $("a[href^='#']").removeClass('active');
        return $("a[href='#" + p + "']").addClass('active');
      } else {
        return window.location.hash = 'transcribe';
      }
    };
    return Workspace;
  })();
  window.v = new Vid({
    url: 'koszonto.mp3',
    transcription: 'Tisztelt Honfitársaim, magyarok a világ minden pontján!',
    fps: 25
  });
  window.player = new VideoBox({
    el: $('#vid'),
    model: v
  });
  window.transcriptionbox = new TranscriptionBox({
    el: $('#transcribe'),
    model: v
  });
  window.refinerview = new RefinerView({
    el: $('#refine'),
    model: v
  });
  window.taggerbutton = new TaggerButton({
    model: v
  });
  new Workspace();
  return Backbone.history.start();
});