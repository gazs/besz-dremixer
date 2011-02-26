var Phrase, Speech, padZero, sec2smpte, smpte2sec;
var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
  for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
  function ctor() { this.constructor = child; }
  ctor.prototype = parent.prototype;
  child.prototype = new ctor;
  child.__super__ = parent.prototype;
  return child;
}, __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
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
Phrase = (function() {
  function Phrase() {
    Phrase.__super__.constructor.apply(this, arguments);
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
  Phrase.prototype.lengthMs = function() {
    return (smpte2sec(this.get('end'), 25) - smpte2sec(this.get('start'), 25)) * 1000;
  };
  Phrase.prototype.play = function() {
    vid.currentTime = this.startTime();
    vid.play();
    return window.setTimeout(function() {
      return vid.pause();
    }, this.lengthMs());
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
$(document).ready(function() {
  var TagBox, TranscriptionBox, Vid, VideoBox, Workspace;
  Vid = (function() {
    function Vid() {
      Vid.__super__.constructor.apply(this, arguments);
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
            text: phrase
          }));
        }
        return _results;
      })();
      return this.set({
        speech: new Speech(phrases)
      });
    };
    Vid.prototype.getLastPhrase = function() {
      return this.get('speech').chain().select(function(phrase) {
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
      VideoBox.__super__.constructor.apply(this, arguments);
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
      return this.render();
    };
    VideoBox.prototype.render = function() {
      var v;
      $(this.el).html(this.template(this.model.toJSON()));
      v = $('video', this.el).get(0);
      v.addEventListener('timeupdate', __bind(function() {
        return $('#currenttime').html(sec2smpte(v.currentTime, this.model.get("fps")) + '/' + sec2smpte(v.duration, this.model.get("fps")));
      }, this), true);
      return this;
    };
    VideoBox.prototype.rewind = function() {
      return v.currentTime = 0;
    };
    VideoBox.prototype.playpause = function() {
      if (v.paused) {
        return v.play();
      } else {
        return v.pause();
      }
    };
    VideoBox.prototype.back2s = function() {
      return v.currentTime -= 4;
    };
    return VideoBox;
  })();
  TranscriptionBox = (function() {
    function TranscriptionBox() {
      TranscriptionBox.__super__.constructor.apply(this, arguments);
    }
    __extends(TranscriptionBox, Backbone.View);
    TranscriptionBox.prototype.initialize = function() {
      return this.render();
    };
    TranscriptionBox.prototype.events = function() {
      return {
        'click button': 'saveTranscription'
      };
    };
    TranscriptionBox.prototype.render = function() {
      return $('textarea', this.el).html(this.model.get('transcription'));
    };
    TranscriptionBox.prototype.saveTranscription = function() {
      return this.model.saveTranscription($('textarea', this.el).html());
    };
    return TranscriptionBox;
  })();
  TagBox = (function() {
    function TagBox() {
      TagBox.__super__.constructor.apply(this, arguments);
    }
    __extends(TagBox, Backbone.View);
    TagBox.prototype.initialize = function() {
      return this.render();
    };
    TagBox.prototype.render = function() {
      return this.model.getNextPhrase();
    };
    return TagBox;
  })();
  window.RefinePhrase = (function() {
    function RefinePhrase() {
      RefinePhrase.__super__.constructor.apply(this, arguments);
    }
    __extends(RefinePhrase, Backbone.View);
    RefinePhrase.prototype.template = _.template($('#refinetemplate').html());
    RefinePhrase.prototype.events = {
      'click button': 'play',
      'keyup input': 'save'
    };
    RefinePhrase.prototype.initialize = function() {};
    RefinePhrase.prototype.render = function() {
      return $(this.el).html(this.template(this.model.toJSON()));
    };
    RefinePhrase.prototype.save = function() {
      return console.log('save');
    };
    RefinePhrase.prototype.play = function() {
      return console.log('play');
    };
    return RefinePhrase;
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
    url: 'koszonto.ogv',
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
  new Workspace();
  return Backbone.history.start();
});