// Original rendered audio lives in public/audio; source: art/build_audio.py.
// No continuously running oscillator is used for a vehicle engine.
const NAMES = ['truck-idle','truck-load','tank-idle','tank-load','electric-idle','electric-load','road','gravel','rain','wind','tires','scrape','crash-0','crash-1','crash-2','music-coast','music-harbor','music-rally'];
const bank = new Map();
export async function loadSoundBank() {
  const decoder = new OfflineAudioContext(2, 1, 32000);
  await Promise.all(NAMES.map(async name => {
    const response = await fetch(`${import.meta.env.BASE_URL}audio/${name}.mp3`);
    if (!response.ok) throw new Error(`Audio unavailable: ${name}`);
    bank.set(name, await decoder.decodeAudioData(await response.arrayBuffer()));
  }));
}
export class GameAudio {
  constructor() { this.muted=false; this.voices=[]; this.musicVolume=.38; this.effectsVolume=.8; this.musicOffset=0; }
  start() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master=this.ctx.createGain(); this.master.gain.value=this.muted?0:.75;
      const limiter=this.ctx.createDynamicsCompressor(); limiter.threshold.value=-12; limiter.ratio.value=5; limiter.attack.value=.003;
      this.master.connect(limiter); limiter.connect(this.ctx.destination);
      this.sfx=this.ctx.createGain(); this.sfx.gain.value=this.effectsVolume; this.sfx.connect(this.master);
      this.musicGain=this.ctx.createGain(); this.musicGain.gain.value=this.musicVolume; this.musicGain.connect(this.master);
    }
    this.ctx.resume();
  }
  sound(name, volume=1, loop=false, spatial=false, rate=1) {
    if (!this.ctx || !bank.has(name)) return null;
    const source=this.ctx.createBufferSource(); source.buffer=bank.get(name); source.loop=loop; source.playbackRate.value=rate;
    const gain=this.ctx.createGain(); gain.gain.value=volume; source.connect(gain);
    const pan=spatial?this.ctx.createPanner():null;
    if (pan) { pan.panningModel='HRTF'; pan.distanceModel='inverse'; pan.refDistance=7; pan.maxDistance=180; pan.rolloffFactor=1.1; gain.connect(pan); pan.connect(this.sfx); }
    else gain.connect(this.sfx);
    source.start(0,loop?Math.random()*source.buffer.duration:0);
    const voice={source,gain,pan}; source.onended=()=>{source.disconnect();gain.disconnect();pan?.disconnect();};
    return voice;
  }
  prepare(racers) {
    this.voices.forEach(v=>Object.values(v.layers).forEach(n=>n?.source.stop()));
    this.ambience?.forEach(n=>n?.source.stop());
    this.voices=racers.map(r=>{
      const kind=r.car.kind==='truck'?'truck':r.car.kind==='tank'?'tank':'electric';
      return {r,kind,layers:{idle:this.sound(`${kind}-idle`,0,true,true),load:this.sound(`${kind}-load`,0,true,true),tires:this.sound('tires',0,true,true),gravel:this.sound('gravel',0,true,true),scrape:this.sound('scrape',0,true,true)}};
    });
    this.ambience=[this.sound('road',0,true),this.sound('wind',0,true),this.sound('rain',0,true)];
  }
  param(param,value) { param.setTargetAtTime(value,this.ctx.currentTime,.08); }
  update(racers, player, camera, weather, active) {
    if (!this.ctx) return;
    const listener=this.ctx.listener;
    const dir=camera.getWorldDirection(camera.position.clone());
    ['X','Y','Z'].forEach((axis,i)=>{
      this.param(listener[`position${axis}`],camera.position.getComponent(i));
      this.param(listener[`forward${axis}`],dir.getComponent(i));
      this.param(listener[`up${axis}`],i===1?1:0);
    });
    this.voices.forEach(v=>{
      const r=v.r, speed=r.velocity.length();
      // Combustion gears drop revs on an upshift; EVs retain broad road/motor texture.
      const gear=Math.min(5,Math.floor(speed/11));
      const rev=v.kind==='electric' ? .7+speed/100 : .68+(speed-gear*11)/15+gear*.045;
      for (const [name,n] of Object.entries(v.layers)) {
        if (!n) continue;
        ['X','Y','Z'].forEach((axis,i)=>this.param(n.pan[`position${axis}`],r.position.getComponent(i)+(i===1?1:0)));
        let gain=0;
        if (name==='idle') { gain=.28*(1-(r.throttle||0)*.65); this.param(n.source.playbackRate,rev); }
        if (name==='load') { gain=.12+(r.throttle||0)*.32+speed*.001; this.param(n.source.playbackRate,rev*(r.car.id==='lola' ? 1.08:1)); }
        if (name==='tires') gain=!r.offroad?Math.min(.5,Math.max(0,(r.slip||0)-.09)*1.4+(r.brake||0)*.22)*Math.min(speed/15,1):0;
        if (name==='scrape') gain=(r.scrape||0)*.22;
        if (name==='gravel') gain=(r.offroad||weather?.dust ? .28:0)*Math.min(speed/30,1);
        this.param(n.gain.gain,active?gain:0);
      }
    });
    const speed=player?.speed||0;
    this.ambience?.forEach((n,i)=>{if(n)this.param(n.gain.gain,active?(i===0?.07*Math.min(speed/40,1):i===1?.1*Math.min(speed/60,1):.22*(weather?.wetness||0)):0);});
  }
  setEngine() {} // Engine voices are updated together once per rendered frame.
  startMusic(theme) {
    this.start(); if(this.music) return;
    const name=`music-${['coast','harbor','rally'].includes(theme)?theme:'coast'}`;
    if(this.musicTheme!==name) this.musicOffset=0;
    this.musicTheme=name;
    this.music=this.ctx.createBufferSource(); this.music.buffer=bank.get(name); if(!this.music.buffer){this.music=null;return;}
    this.music.loop=true; this.music.connect(this.musicGain); this.musicStarted=this.ctx.currentTime;
    this.music.start(0,this.musicOffset%this.music.buffer.duration);
  }
  stopMusic() { if(this.music){this.musicOffset+=this.ctx.currentTime-this.musicStarted;this.music.stop();this.music.disconnect();this.music=null;} }
  setVolume(bus,value) { this[bus==='music'?'musicVolume':'effectsVolume']=value; const node=bus==='music'?this.musicGain:this.sfx;if(node)this.param(node.gain,value); }
  toggle(){this.muted=!this.muted;if(this.master)this.param(this.master.gain,this.muted?0:.75);return this.muted;}
  crash(speed,point) {
    if(speed<2) return;
    const n=this.sound(`crash-${Math.floor(Math.random()*3)}`,Math.min(.85,speed/30),false,!!point,.85+Math.random()*.3);
    if(n?.pan&&point){n.pan.positionX.value=point.x;n.pan.positionY.value=point.y;n.pan.positionZ.value=point.z;}
  }
  tone(freq,duration=.1,type='sine',volume=.07,slide=0) {
    if(!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain(),t=this.ctx.currentTime;
    o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.linearRampToValueAtTime(Math.max(30,freq+slide),t+duration);
    g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(this.sfx);o.start();o.stop(t+duration);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  countdown(go){this.tone(go?880:440,go?.35:.13,'sine',.16);}
  itemPickup(){this.tone(660,.18,'sine',.1,330);}
  boost(){const n=this.sound('wind',.3);if(n)n.source.stop(this.ctx.currentTime+.7);}
  repair(){this.itemPickup();}
  lap(){this.tone(880,.4,'triangle',.09,440);}
  fanfare(){this.musicOffset=0;this.tone(330,.25,'triangle',.08,330);}
}
