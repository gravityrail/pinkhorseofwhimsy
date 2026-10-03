import { MathUtils } from 'three';
// Steering targets are measured in metres, so a longer circuit does not make
// the AI aim hundreds of metres through the inside of the next corner.
export function aiInput(racer,track,difficulty,time,index,rivals=[]) {
  const nearest=track.nearest(racer.position,racer.progress);
  const frame=track.frameAt(nearest.progress+(14+racer.speed*.55)/track.length);
  let lane=Math.sin(time*(.24+index*.025)+racer.aiWobble)*track.data.width*difficulty.error+racer.lane*track.data.width;
  const nearby=rivals.filter(other=>other!==racer).map(other=>{
    const delta=other.position.clone().sub(racer.position);
    return {r:other,ahead:delta.dot(nearest.tangent),side:nearest.offset+delta.dot(nearest.side)};
  });
  const leader=nearby.filter(o=>o.ahead>1 && o.ahead<10+racer.speed*.65 && Math.abs(o.side-nearest.offset)<3.4).sort((a,b)=>a.ahead-b.ahead)[0];
  if(leader && leader.r.speed<racer.speed+2) {
    const side=nearest.offset<0?-1:1;
    const options=[side*track.data.width*.32,-side*track.data.width*.32];
    const clear=options.find(candidate=>!nearby.some(o=>o.ahead>-8 && o.ahead<25 && Math.abs(o.side-candidate)<3.4));
    if(clear!==undefined){racer.passLane=clear;racer.passUntil=time+1.4;}
  }
  if(racer.passUntil>time)lane=racer.passLane;
  const target=frame.point.clone().addScaledVector(frame.side,lane);
  const desired=Math.atan2(target.x-racer.position.x,target.z-racer.position.z);
  const yawError=Math.atan2(Math.sin(desired-racer.yaw),Math.cos(desired-racer.yaw));
  const steer=MathUtils.clamp(yawError*3.2,-1,1);
  const curve=1-MathUtils.clamp(nearest.tangent.dot(track.frameAt(nearest.progress+55/track.length).tangent),-1,1);
  const targetSpeed=racer.car.physics.maxSpeed*racer.skill*(1-Math.min(.3,curve*2));
  const emergency=leader && leader.ahead<5+Math.max(0,racer.speed-leader.r.speed)*.6;
  return {nearest,steer,throttle:!emergency&&racer.speed<targetSpeed?1:0,brake:emergency?1:racer.speed>targetSpeed+3?.5:0};
}
