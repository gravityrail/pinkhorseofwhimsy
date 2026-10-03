// SI units (metres, seconds, kilograms). Fixed-step integration keeps steering,
// grip and suspension consistent across 30/60/120 Hz displays.
export const FIXED_STEP = 1 / 120;
export function driveStep(racer, input, surface, dt) {
  const p = racer.car.physics;
  const speed = racer.velocity.x * Math.sin(racer.yaw) + racer.velocity.z * Math.cos(racer.yaw);
  const offroad = surface.offroad;
  const drifting = input.drift && Math.abs(speed) > 9 && Math.abs(input.steer) > .15 && !offroad;
  racer.steer = (racer.steer || 0) + (input.steer - (racer.steer || 0)) * (1 - Math.exp(-9 * dt));
  const yawRate = (1.25 + racer.car.stats.handling * .04) * Math.min(Math.abs(speed) / 10, 1) / (1 + Math.abs(speed) / 38);
  racer.angularVelocity = (racer.angularVelocity || 0) * Math.exp(-2.7 * dt);
  racer.yaw += racer.angularVelocity * dt;
  racer.scrape=(racer.scrape||0)*Math.exp(-12*dt);
  racer.crashTimer = Math.max(0, (racer.crashTimer || 0) - dt);
  racer.yaw += racer.steer * yawRate * dt * (speed < 0 ? -1 : 1) * (drifting ? 1.28 : 1);
  const fx = Math.sin(racer.yaw), fz = Math.cos(racer.yaw);
  const longitudinal = racer.velocity.x * fx + racer.velocity.z * fz;
  const limit = p.maxSpeed * (1 - racer.damage * .08) * (input.boost ? 1.3 : 1);
  const torque = p.power / p.mass * (1 - .38 * Math.max(0, longitudinal) / limit);
  let force = input.throttle * torque * (input.boost ? 1.85 : 1) * (1 - racer.damage * .12);
  if (input.boost) force += 11;
  if (speed > limit) force -= (speed-limit)*1.8;
  if (input.brake) force -= longitudinal > 1 ? Math.min(longitudinal / dt, 28) : longitudinal > -8 ? 9 : 0;
  force -= surface.slope * 9.81;
  racer.velocity.x += fx * force * dt;
  racer.velocity.z += fz * force * dt;
  const side = racer.velocity.x * fz - racer.velocity.z * fx;
  const grip = p.grip * (offroad ? .78 + p.offroadGrip * .17 : surface.loose ? .87 : 1) * (1 - (surface.wetness || 0) * .13) * (drifting ? .32 : 1) * (racer.crashTimer > 0 ? .45 : 1);
  const correction = side * (1 - Math.exp(-grip * dt));
  racer.velocity.x -= fz * correction; racer.velocity.z += fx * correction;
  // Grass/gravel scrub speed gradually. Crossing a painted edge must never
  // instantly remove 43% of the car's momentum or impose an invisible wall.
  const rolling = offroad ? .08 + p.offroadDrag * .065 : surface.loose ? .055 + p.offroadDrag * .022 : .035;
  const drag = rolling + Math.abs(speed) * .001;
  racer.velocity.multiplyScalar(Math.exp(-drag * dt));
  racer.slip = Math.abs(Math.atan2(side,Math.max(3,Math.abs(longitudinal))));
  racer.throttle = input.throttle;
  racer.brake = input.brake;
  racer.drifting = drifting;
  racer.position.addScaledVector(racer.velocity, dt);
  racer.speed = Math.max(0, racer.velocity.x * fx + racer.velocity.z * fz);
  racer.offroad = offroad;
  return { drifting, forwardX: fx, forwardZ: fz };
}
export function chooseItem(place, damage, random = Math.random) {
  if (damage > .35) return 'repair';
  const roll = random();
  if (place > 2 && roll < .5) return 'turbo';
  return roll < .35 ? 'shield' : roll < .7 ? 'pulse' : 'turbo';
}
export function advanceLap(racer, progress, forward) {
  let delta = progress - racer.progress;
  if (delta < -.5) delta += 1;
  if (delta > .5) delta -= 1;
  // Signed route distance prevents shortcuts and reversing over the finish.
  racer.routeDistance = (racer.routeDistance ?? racer.progress - 1) + delta;
  const previousLap = racer.lap;
  racer.previousProgress = racer.progress;
  racer.progress = progress;
  if (forward && racer.routeDistance >= racer.lap + 1) racer.lap += 1;
  return racer.lap > previousLap;
}
