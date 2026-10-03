// Oriented body boxes, contact-point impulses and yaw inertia in metres / kg.
// Cars are not circles: bumpers touch at ~3.5 m and doors at ~2.3 m.
import { Vector3 } from 'three';
const cross = (a,b) => a.z*b.x-a.x*b.z;
export function bodyBox(r) {
  const halfWidth = r.car.kind === 'tank' ? 1.38 : 1.14;
  const halfLength = 1.79;
  const right = new Vector3(Math.cos(r.yaw),0,-Math.sin(r.yaw));
  const forward = new Vector3(Math.sin(r.yaw),0,Math.cos(r.yaw));
  return {right,forward,halfWidth,halfLength,inertia:r.car.physics.mass*(halfWidth**2+halfLength**2)/3};
}
function contact(a,b) {
  if(Math.abs(a.position.y-b.position.y)>2.4) return null;
  const A=bodyBox(a), B=bodyBox(b), delta=b.position.clone().sub(a.position); delta.y=0;
  let depth=Infinity, normal=null;
  for(const axis of [A.right,A.forward,B.right,B.forward]) {
    const ra=Math.abs(A.right.dot(axis))*A.halfWidth+Math.abs(A.forward.dot(axis))*A.halfLength;
    const rb=Math.abs(B.right.dot(axis))*B.halfWidth+Math.abs(B.forward.dot(axis))*B.halfLength;
    const overlap=ra+rb-Math.abs(delta.dot(axis));
    if(overlap<=0) return null;
    if(overlap<depth) {depth=overlap; normal=axis.clone().multiplyScalar(delta.dot(axis)<0?-1:1);}
  }
  // Project the overlap midpoint onto the contacting faces. Averaging support
  // vertices would falsely introduce torque in a centred bumper-to-bumper hit.
  const midpoint=a.position.clone().add(b.position).multiplyScalar(.5);
  const lever=(r,box)=>{
    const d=midpoint.clone().sub(r.position);
    return box.right.clone().multiplyScalar(Math.max(-box.halfWidth,Math.min(box.halfWidth,d.dot(box.right))))
      .addScaledVector(box.forward,Math.max(-box.halfLength,Math.min(box.halfLength,d.dot(box.forward))));
  };
  return {A,B,normal,depth,ra:lever(a,A),rb:lever(b,B),point:midpoint};
}
function velocityAt(r,lever) {
  const w=r.angularVelocity||0;
  return r.velocity.clone().add(new Vector3(w*lever.z,0,-w*lever.x));
}
function impulse(r,lever,j,inertia) {
  r.velocity.addScaledVector(j,1/r.car.physics.mass);
  r.angularVelocity=Math.max(-2.8,Math.min(2.8,(r.angularVelocity||0)+cross(lever,j)/inertia));
}
export function resolveCarCollision(a,b) {
  const hit=contact(a,b); if(!hit) return null;
  const {A,B,normal,depth,ra,rb,point}=hit;
  const ia=1/a.car.physics.mass, ib=1/b.car.physics.mass;
  // Inverse-mass separation also resolves an exact overlapping spawn safely.
  a.position.addScaledVector(normal,-Math.max(0,depth-.006)*ia/(ia+ib)*.85);
  b.position.addScaledVector(normal, Math.max(0,depth-.006)*ib/(ia+ib)*.85);
  const relative=velocityAt(b,rb).sub(velocityAt(a,ra));
  const closing=relative.dot(normal);
  if(closing>=0) return {speed:0,point,normal};
  const denominator=ia+ib+cross(ra,normal)**2/A.inertia+cross(rb,normal)**2/B.inertia;
  const j=-(1+.12)*closing/denominator;
  impulse(a,ra,normal.clone().multiplyScalar(-j),A.inertia);
  impulse(b,rb,normal.clone().multiplyScalar(j),B.inertia);
  const tangent=new Vector3(normal.z,0,-normal.x);
  const slip=velocityAt(b,rb).sub(velocityAt(a,ra)).dot(tangent);
  a.scrape=b.scrape=Math.min(.8,Math.abs(slip)/35);
  const jt=Math.max(-j*.24,Math.min(j*.24,-slip/(ia+ib+cross(ra,tangent)**2/A.inertia+cross(rb,tangent)**2/B.inertia)));
  impulse(a,ra,tangent.clone().multiplyScalar(-jt),A.inertia);
  impulse(b,rb,tangent.clone().multiplyScalar(jt),B.inertia);
  for(const [r,massShare] of [[a,ia/(ia+ib)],[b,ib/(ia+ib)]]) {
    r.crashTimer=Math.max(r.crashTimer||0,Math.min(.9,-closing*.025));
    r.bodyBounceSpeed=(r.bodyBounceSpeed||0)+Math.min(1.2,-closing*.045);
    if(!r.shieldTimer) r.damage=Math.min(.8,r.damage+Math.max(0,-closing-5)*.0025*massShare);
  }
  return {speed:-closing,point,normal};
}
export function resolveBarrier(r,nearest,limit) {
  const box=bodyBox(r);
  const extent=Math.abs(box.right.dot(nearest.side))*box.halfWidth+Math.abs(box.forward.dot(nearest.side))*box.halfLength;
  const penetration=Math.abs(nearest.offset)+extent-limit;
  if(penetration<=0) return null;
  const inward=nearest.side.clone().multiplyScalar(-Math.sign(nearest.offset));
  r.position.addScaledVector(inward,penetration+.01);
  r.scrape=Math.min(1,r.velocity.length()/30)*.6;
  const closing=-r.velocity.dot(inward);
  if(closing<=0) return null;
  // Lose the velocity into the wall; preserve speed along it instead of gluing
  // the vehicle to the barrier or braking the entire velocity vector.
  const outward=inward.clone().negate();
  const support=axis=>Math.abs(axis.dot(outward))<.01?0:Math.sign(axis.dot(outward));
  const lever=box.right.clone().multiplyScalar(support(box.right)*box.halfWidth).addScaledVector(box.forward,support(box.forward)*box.halfLength);
  const arm=cross(lever,inward);
  const magnitude=1.15*closing/(1/r.car.physics.mass+arm*arm/box.inertia);
  impulse(r,lever,inward.clone().multiplyScalar(magnitude),box.inertia);
  const glancing=Math.min(.035,closing*.002); r.velocity.multiplyScalar(1-glancing);
  r.crashTimer=Math.min(.8,closing*.03);
  if(!r.shieldTimer) r.damage=Math.min(.8,r.damage+Math.max(0,closing-5)*.002);
  return {speed:closing,point:r.position.clone().addScaledVector(inward,-extent),normal:inward};
}
