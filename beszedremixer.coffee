padZero = (n) ->
  if n < 10 then '0' + n else n.toString()

smpte2sec = (hh_mm_ss_ff, fps ) ->
  [hh, mm, ss, ff] = (parseInt(x, 10) for x in hh_mm_ss_ff.split(":"))
  hh * 3600 + mm*60 + ss + ff/fps


sec2smpte = (time, fps) ->
  [
       padZero(Math.floor(time / 3600) % 24),
       padZero(Math.floor(time / 60) % 60),
       padZero(Math.floor(time % 60)),
       padZero(Math.floor(((time%1)*fps).toFixed(3)))
  ].join(":")





$(document).ready ->
  class Phrase extends Backbone.Model
    # start, end, text
    validate: (attrs)=>
      if attrs.text is ''
        return 'nem lehet üres'
    startTime: =>
      smpte2sec(@get('start'), 25)
    lengthMs: =>
      ( smpte2sec(@get('end'), 25) - smpte2sec(@get('start'),25) ) * 1000
    play: =>
      v = @get('video')
      v.currentTime = @startTime()
      v.play()
      window.setTimeout () ->
        v.pause()
      , @lengthMs()

  class Speech extends Backbone.Collection
    model: Phrase
  class Vid extends Backbone.Model
    
    # videó
    # metadata
    #   url
    #   title
    # text (darabolatlan)
    # speech
    initialize: =>
    saveTranscription: (t) =>
      arr = t.replace(/^\s+|\s+$/, '').replace(/[\?!\.-;,]/g, ' ').replace(/\s+/g, ' ').toLowerCase().split(' ')
      phrases = (new Phrase({text: phrase, video: @player.v}) for phrase in arr)
      @set
        speech: new Speech(phrases)
    getLastPhrase: =>
      @get('speech').chain().select (phrase)->
        typeof phrase.get('start') is 'string'
      .last().value()
    getNextPhrase: =>
      @get('speech').detect (phrase)->
        typeof phrase.get('start') is 'undefined'


  class VideoBox extends Backbone.View
    tagName: 'video'
    template: _.template($('#vidtemplate').html())
    events:
      'click #rewind': 'rewind'
      'click #playpause': 'playpause'
      'click #back2s': 'back2s'
    initialize: =>
      @model.player = @
      @render()
    render: =>
      $(@el).html(@template(@model.toJSON()))
      @v = $('video', @el).get(0)
      @v.addEventListener 'timeupdate', =>
        $('#currenttime').html sec2smpte(@v.currentTime, @model.get("fps")) + '/' + sec2smpte(@v.duration, @model.get("fps"))
      , true
      @
    rewind: =>
      @v.currentTime=0
    playpause: =>
      if @v.paused then @v.play() else @v.pause()
    back2s: =>
      @v.currentTime-=4
      

  class TranscriptionBox extends Backbone.View
    initialize: =>
      @render()
    events:
      'click button' : 'saveTranscription'
    render: =>
      $('textarea', @el).html  @model.get 'transcription'
    saveTranscription: =>
      @model.saveTranscription $('textarea', @el).html()

  class TagBox extends Backbone.View
    initialize: =>
      @render()
    render: =>
      @model.getNextPhrase()


  class RefinePhrase extends Backbone.View
    template: _.template($('#refinetemplate').html())
    events:
      'click button': 'play'
      'keyup input': 'save'

    initialize: =>
      @model.bind 'change', @render
      @render
    render: =>
      $(@el).html @template @model.toJSON()
      @
    save: =>
      @model.set
        start:$('input', @el).get(0).value
        end:$('input', @el).get(1).value
    play: =>
      @model.play()


  class RefinerView extends Backbone.View
    initialize: =>
      @model.bind 'change:speech', @render
    addOne: (phrase) =>
      view = new RefinePhrase
        model: phrase
      #console.log view
      view.render()
      @el.append view.render().el
    render: =>
      @model.get('speech').each @addOne

  class Workspace extends Backbone.Controller
    routes:
      '': 'turnToPage'
      ':page' : 'turnToPage'
    turnToPage: (p)->
      if p
        $('.sheet').hide()
        $('#' + p).show()
        $("a[href^='#']").removeClass 'active'
        $("a[href='##{p}']").addClass 'active'
      else
        window.location.hash = 'transcribe'

  window.v = new Vid
    url: 'koszonto.ogv'
    transcription: 'Tisztelt Honfitársaim, magyarok a világ minden pontján!'
    fps: 25
  window.player = new VideoBox
    el: $('#vid')
    model: v
  window.transcriptionbox = new TranscriptionBox
    el: $('#transcribe')
    model: v
  window.refinerview = new RefinerView
    el: $('#refine')
    model: v

  new Workspace()
  Backbone.history.start()

