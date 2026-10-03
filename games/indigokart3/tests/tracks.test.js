import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3, CatmullRomCurve3 } from 'three';
import { TRACKS, CARS, DIFFICULTIES } from '../src/game/content.js';
import { TrackWorld } from '../src/game/Track.js';
import { aiInput } from '../src/game/ai.js';
import { driveStep, advanceLap, FIXED_STEP } from '../src/game/physics.js';
import { resolveBarrier, resolveCarCollision } from '../src/game/collisions.js';
function route(data) {
  // Use production geometry queries without creating a renderer or scenery.
  const track=Object.create(TrackWorld.prototype);
  Object.assign(track,{data,curve:new CatmullRomCurve3(data.points.map(p=>new Vector3(...p)),true,'catmullrom',.45),sampleCount:1536,samples:[]});
  track.curve.arcLengthDivisions=4096;track.length=track.curve.getLength();track.buildSamples();return track;
}
for(const data of TRACKS) {
  test(`${data.name}: long, wide, sweeping layout and continuous wheel heights`,()=>{
    const track=route(data);assert.ok(track.length>2500);assert.ok(data.width>=26);
    let broad=0;
    for(let i=0;i<1000;i++) {
      const a=track.frameAt(i/1000),b=track.frameAt(i/1000+5/track.length);
      const radius=5/Math.max(.00001,a.tangent.angleTo(b.tangent));
      assert.ok(radius>60);if(radius>120)broad++;
      assert.ok(Math.abs(a.tangent.y)<.1);
      const height=track.groundHeightAt(a.point.x,a.point.z);
      assert.ok(Math.abs(height-a.point.y)<.1);
    }
    assert.ok(broad>900);
  });
  test(`${data.name}: four-car race finishes two laps without getting stuck`,()=>{
    const track=route(data),difficulty=DIFFICULTIES.hard;
    const racers=CARS.map((car,i)=>{
      const progress=1-(7+Math.floor(i/2)*6)/track.length,f=track.frameAt(progress);
      return {car,position:f.point.clone().addScaledVector(f.side,i%2?2.35:-2.35),velocity:new Vector3(),yaw:Math.atan2(f.tangent.x,f.tangent.z),speed:0,damage:0,progress,lap:-1,routeDistance:progress-1,skill:difficulty.pace+(i-1)*.018,aiWobble:i,lane:i%2?.2:-.2};
    });
    let crashes=0;
    for(let time=0;time<220 && racers.some(r=>r.lap<data.laps);time+=FIXED_STEP) {
      racers.forEach((r,i)=>{
        const {nearest,steer,throttle,brake}=aiInput(r,track,difficulty,time,i,racers);
        driveStep(r,{steer,throttle,brake},{offroad:Math.abs(nearest.offset)>data.width*.53,slope:nearest.tangent.y,loose:data.road?.style==='dirt',wetness:data.weather==='rain'?.8:0},FIXED_STEP);
        r.position.y=nearest.point.y;
      });
      for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)resolveCarCollision(racers[i],racers[j]);
      racers.forEach(r=>{
        const n=track.nearest(r.position),hit=resolveBarrier(r,n,data.width*data.barrierScale);
        if(hit?.speed>2)crashes++;
        advanceLap(r,n.progress,r.velocity.dot(n.tangent)>0);
        assert.ok(Number.isFinite(r.position.x));assert.ok(Math.abs(n.offset)<data.width);
      });
    }
    assert.ok(racers.every(r=>r.lap>=data.laps),'every driver must finish');
    assert.ok(crashes<12,`AI should race cleanly, had ${crashes} barrier hits`);
  });
}
