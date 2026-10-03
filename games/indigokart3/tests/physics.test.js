import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { CARS } from '../src/game/content.js';
import { driveStep, advanceLap, chooseItem, FIXED_STEP } from '../src/game/physics.js';
function racer(car) { return { car, velocity:new Vector3(),position:new Vector3(),yaw:0,damage:0,speed:0 }; }
function run(car, seconds, offroad=false, frame=1/60, controls={}, surface={}) {
  const r=racer(car); let accumulator=0;
  for(let t=0;t<seconds-1e-7;t+=frame) {
    accumulator+=frame;
    while(accumulator>=FIXED_STEP-1e-9) {
      driveStep(r,{throttle:1,brake:0,steer:0,drift:false,boost:false,...controls},{offroad,slope:0,...surface},FIXED_STEP);
      accumulator-=FIXED_STEP;
    }
  }
  return r;
}
test('Dan launches faster, Lola grips harder, Asa carries the most mass',()=>{
  const [truck,dan,lola,tank]=CARS;
  assert.ok(run(dan,2).speed>run(truck,2).speed);
  assert.ok(run(truck,2).speed>run(tank,2).speed);
  assert.ok(lola.physics.grip>dan.physics.grip);
  assert.ok(tank.physics.mass>dan.physics.mass);
});
test('all cars retain useful off-road pace without an instant edge speed cap',()=>{
  for(const car of CARS) {
    const road=run(car,12),rough=run(car,12,true);
    assert.ok(rough.speed>road.speed*.82 && rough.speed<road.speed);
    const before=road.speed;
    driveStep(road,{throttle:0,steer:0,brake:0},{offroad:true,slope:0},FIXED_STEP);
    assert.ok(road.speed>before*.99);
  }
  const retention=car=>run(car,12,true).speed/run(car,12).speed;
  assert.ok(retention(CARS[0])>retention(CARS[1]));
});
test('fixed simulation gives matching positions at 30, 60 and 120 fps',()=>{
  for (const car of CARS) {
    const positions=[30,60,120].map(hz=>run(car,10,false,1/hz,{steer:.35}).position);
    assert.ok(positions[0].distanceTo(positions[1])<.0001);
    assert.ok(positions[1].distanceTo(positions[2])<.0001);
  }
});
test('boost is faster and finite; braking stops before reversing',()=>{
  for (const car of CARS) {
    assert.ok(run(car,10,false,1/60,{boost:true}).speed>run(car,10).speed);
    const r=run(car,3);
    const before=r.speed;
    for(let i=0;i<60;i++) driveStep(r,{throttle:0,brake:1,steer:0},{offroad:false,slope:0},FIXED_STEP);
    assert.ok(r.speed<before);
    assert.ok(Number.isFinite(r.position.z));
  }
});
test('drifting trades grip for slip; off-road drifting cannot charge',()=>{
  const r=run(CARS[2],3);
  const result=driveStep(r,{throttle:1,steer:1,drift:true},{offroad:false,slope:0},FIXED_STEP);
  assert.equal(result.drifting,true);
  assert.equal(driveStep(r,{throttle:1,steer:1,drift:true},{offroad:true,slope:0},FIXED_STEP).drifting,false);
});
test('start line, three complete laps, and reversing cannot farm laps',()=>{
  const r={progress:.98,lap:-1,routeDistance:-.02};
  advanceLap(r,.01,true); assert.equal(r.lap,0);
  for(let i=0;i<10;i++) { advanceLap(r,.98,false); advanceLap(r,.01,true); }
  assert.equal(r.lap,0);
  for(let lap=0;lap<3;lap++) for(let i=2;i<=101;i++) advanceLap(r,(i%100)/100,true);
  assert.equal(r.lap,3);
});
test('item balancing supplies repairs and comeback boosts',()=>{
  assert.equal(chooseItem(1,.6,()=>.9),'repair');
  assert.equal(chooseItem(4,0,()=>.4),'turbo');
  assert.equal(chooseItem(1,0,()=>.1),'shield');
  assert.equal(chooseItem(1,0,()=>.6),'pulse');
});

test('loose rally surface rewards the truck’s tires even on the racing line',()=>{
  const truckRatio=run(CARS[0],12,false,1/60,{}, {loose:true}).speed/run(CARS[0],12).speed;
  const sedanRatio=run(CARS[1],12,false,1/60,{}, {loose:true}).speed/run(CARS[1],12).speed;
  assert.ok(truckRatio>sedanRatio);
  assert.ok(sedanRatio>.95);
});
