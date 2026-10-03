import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { CARS } from '../src/game/content.js';
import { resolveCarCollision, resolveBarrier, bodyBox } from '../src/game/collisions.js';
const car=(spec=CARS[0],x=0,z=0)=>({car:spec,position:new Vector3(x,0,z),velocity:new Vector3(),yaw:0,damage:0,angularVelocity:0});
const momentum=rs=>rs.reduce((v,r)=>v.addScaledVector(r.velocity,r.car.physics.mass),new Vector3());
const energy=rs=>rs.reduce((sum,r)=>sum+.5*r.car.physics.mass*r.velocity.lengthSq()+.5*bodyBox(r).inertia*r.angularVelocity**2,0);
test('bumper contact occurs before visible bodies overlap deeply',()=>{
  const a=car(),b=car(CARS[0],0,3.5);a.velocity.z=25;
  const before=momentum([a,b]),e=energy([a,b]);
  const hit=resolveCarCollision(a,b);
  assert.ok(hit.speed>24);assert.ok(b.velocity.z>10);assert.ok(a.velocity.z<15);
  assert.ok(Math.abs(a.angularVelocity)<1e-10);assert.ok(before.distanceTo(momentum([a,b]))<1e-8);assert.ok(energy([a,b])<e);
});
test('opposing equal-mass cars absorb most of a head-on crash',()=>{
  const a=car(),b=car(CARS[0],0,3.4);a.velocity.z=30;b.velocity.z=-30;b.yaw=Math.PI;
  resolveCarCollision(a,b);assert.ok(Math.abs(a.velocity.z)<5);assert.ok(Math.abs(b.velocity.z)<5);assert.ok(a.damage>0);
});
test('off-centre hits create yaw; heavier tank resists displacement',()=>{
  const a=car(CARS[1],.9,0),b=car(CARS[3],0,3.4);a.velocity.z=35;
  const p=momentum([a,b]),e=energy([a,b]);resolveCarCollision(a,b);
  assert.ok(Math.abs(a.angularVelocity)>.05);assert.ok(Math.abs(b.angularVelocity)>.05);
  assert.ok(b.position.z-3.4<a.position.distanceTo(new Vector3(.9,0,0)));
  assert.ok(p.distanceTo(momentum([a,b]))<1e-8);assert.ok(energy([a,b])<=e);
});
test('separating bodies do not receive another bounce or damage',()=>{
  const a=car(),b=car(CARS[0],2.1,0);a.velocity.x=-5;b.velocity.x=5;
  const hit=resolveCarCollision(a,b);assert.equal(hit.speed,0);assert.equal(a.damage,0);assert.equal(a.velocity.x,-5);
});
test('side swipe transfers momentum and resolves an exact overlapping spawn',()=>{
  const a=car(),b=car(CARS[2],2.1,0);a.velocity.set(12,0,30);b.velocity.z=20;
  resolveCarCollision(a,b);assert.ok(b.velocity.x>0);assert.ok(Number.isFinite(a.angularVelocity));
  const c=car(),d=car();for(let i=0;i<5;i++)resolveCarCollision(c,d);
  assert.ok(c.position.distanceTo(d.position)>2);assert.ok(Number.isFinite(c.position.x));
});
test('no collision between separated or vertically distant cars',()=>{
  assert.equal(resolveCarCollision(car(),car(CARS[0],0,4)),null);
  const b=car();b.position.y=4;assert.equal(resolveCarCollision(car(),b),null);
});
test('glancing barrier contact preserves forward speed and reflects only outward motion',()=>{
  const a=car(CARS[0],23,0);a.velocity.set(3,0,45);
  const hit=resolveBarrier(a,{offset:23,side:new Vector3(1,0,0)},24);
  assert.ok(hit);assert.ok(a.position.x<23);assert.ok(a.velocity.x<0);assert.ok(a.velocity.z>43);
  assert.equal(resolveBarrier(a,{offset:0,side:new Vector3(1,0,0)},24),null);
});

test('a glancing wall impact turns the nose parallel, not farther into the wall',()=>{
  const a=car(CARS[0],23,0);a.yaw=.25;a.velocity.set(12,0,40);
  resolveBarrier(a,{offset:23,side:new Vector3(1,0,0)},24);
  assert.ok(a.angularVelocity<0);
  assert.ok(a.velocity.z>38);
});
test('varied oblique impacts conserve momentum and never add kinetic energy',()=>{
  for(let i=0;i<180;i++) {
    const a=car(CARS[i%4]),b=car(CARS[(i+1)%4],Math.sin(i*1.9)*2,Math.cos(i*.9)*3);
    a.yaw=i*.2;b.yaw=i*.7;a.velocity.set(Math.sin(i)*35,0,Math.cos(i*1.1)*40);b.velocity.set(Math.sin(i*.4)*25,0,Math.cos(i*2.1)*25);
    a.angularVelocity=Math.sin(i)*.5;b.angularVelocity=Math.cos(i)*.5;
    const p=momentum([a,b]),e=energy([a,b]);resolveCarCollision(a,b);
    assert.ok(p.distanceTo(momentum([a,b]))<1e-7);assert.ok(energy([a,b])<=e+1e-7,`impact ${i} added energy`);
  }
});
