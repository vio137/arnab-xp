/* Non-SharedArrayBuffer audio player for vendor/gameboy.js.
   Drop-in replacement for the emulator's RingBufferPlayer: same single-method
   interface (writeSample). Queues mono 44100Hz Float32 samples and schedules
   them as chained AudioBufferSourceNodes, so audio works on static hosts
   without cross-origin isolation. MIT-licensed core semantics preserved. */
(function(){
  function QueuePlayer(audioContext){
    this.ctx = audioContext;
    this.chunk = 2048;               // ~46ms at 44.1kHz
    this.buf = new Float32Array(this.chunk);
    this.idx = 0;
    this.nextTime = 0;
    this.maxAhead = 0.25;            // seconds of audio allowed scheduled ahead
  }
  QueuePlayer.prototype.writeSample = function(s){
    if(!this.ctx || this.ctx.state !== 'running') return;
    this.buf[this.idx++] = s;
    if(this.idx >= this.chunk){ this.flush(); }
  };
  QueuePlayer.prototype.flush = function(){
    var ctx = this.ctx;
    var now = ctx.currentTime;
    if(this.nextTime < now + 0.02) this.nextTime = now + 0.06; // resync after underrun
    if(this.nextTime > now + this.maxAhead){ this.idx = 0; return; } // drop to bound latency
    var ab = ctx.createBuffer(1, this.chunk, ctx.sampleRate);
    ab.copyToChannel(this.buf, 0);
    var src = ctx.createBufferSource();
    src.buffer = ab;
    src.connect(ctx.destination);
    src.start(this.nextTime);
    this.nextTime += this.chunk / ctx.sampleRate;
    this.idx = 0;
  };
  window.__gbMakePlayer = function(audioContext){ return new QueuePlayer(audioContext); };
})();
