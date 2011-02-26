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




class Phrase extends Backbone.Model
  # start, end, text
  validate: (attrs)->
    if attrs.text is ''
      return 'nem lehet üres'
  startTime: ->
    smpte2sec(@get('start'), 25)
  lengthMs: ->
    ( smpte2sec(@get('end'), 25) - smpte2sec(@get('start'),25) ) * 1000
  play: ->
    vid.currentTime = @startTime()
    vid.play()
    window.setTimeout () ->
      vid.pause()
    , @lengthMs()

class Speech extends Backbone.Collection
  model: Phrase

#class Thing extends Backbone.Model
  #initialize: ->
    #arr = $('textarea').html().replace(/^\s+/, '').replace(/[\?!\.-;,]/g, ' ').replace(/\s+/g, ' ').toLowerCase().split(' ')
    #phrases = (new Phrase({text:phrase}) for phrase in arr)
    #@set
      #speech: new Speech(phrases)



$(document).ready ->
  class Vid extends Backbone.Model
    
    # videó
    # metadata
    #   url
    #   title
    # text (darabolatlan)
    # speech
    initialize: ->
    saveTranscription: (t) ->
      arr = t.replace(/^\s+|\s+$/, '').replace(/[\?!\.-;,]/g, ' ').replace(/\s+/g, ' ').toLowerCase().split(' ')
      phrases = (new Phrase({text: phrase}) for phrase in arr)
      @set
        speech: new Speech(phrases)


  class VideoBox extends Backbone.View
    tagName: 'video'
    template: _.template($('#vidtemplate').html())
    initialize: ->
      @render()
    render: ->
      $(@el).html(@template(@model.toJSON()))
      v = $('video', @el).get(0)
      $('#rewind', @el).bind 'click', ->
        v.currentTime=0
      $('#playpause', @el).bind 'click', ->
        if v.paused then v.play() else v.pause()
      $('#back2s', @el).bind 'click', ->
        v.currentTime-=4
      v.addEventListener 'timeupdate', =>
        $('#currenttime').html sec2smpte(v.currentTime, @model.get("fps")) + '/' + sec2smpte(v.duration, @model.get("fps"))
      , true
      @
      

  class TranscriptionBox extends Backbone.View
    initialize: ->
      @render()
    render: ->
      $('textarea', @el).html  @model.get 'transcription'
      $('button', @el).bind 'click', =>
        @model.saveTranscription $('textarea', @el).html()



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

  new Workspace()
  Backbone.history.start()

