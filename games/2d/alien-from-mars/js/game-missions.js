// The Alien from Mars — light mission ticker. Sandbox-friendly objectives.

import { PAL } from './shared.js';
import { G, popup } from './game-core.js';
import { audio } from './audio.js';

const POOL = [
  { kind: 'mutate', type: 'steak', need: 2, text: 'MUTATE 2 COWS', reward: 300 },
  { kind: 'mutate', type: 'drumstick', need: 2, text: 'MUTATE 2 CHICKENS', reward: 300 },
  { kind: 'mutate', type: 'cloudsheep', need: 2, text: 'MUTATE 2 SHEEP', reward: 300 },
  { kind: 'mutate', type: 'karatepig', need: 2, text: 'MUTATE 2 PIGS', reward: 300 },
  { kind: 'mutate', type: 'disco', need: 1, text: 'MAKE A DISCO COW', reward: 400 },
  { kind: 'mutate', type: 'tornado', need: 1, text: 'SPAWN A TWISTER', reward: 400 },
  { kind: 'mutate', type: 'mecha', need: 1, text: 'BUILD LASER MECHA', reward: 400 },
  { kind: 'mutate', type: '*', need: 3, text: 'MUTATE 3 ANIMALS', reward: 350 },
  { kind: 'kill_army', type: '*', need: 5, text: 'DEFEAT 5 ARMY', reward: 400 },
  { kind: 'kill_army', type: 'soldier', need: 6, text: 'DROP 6 SOLDIERS', reward: 350 },
  { kind: 'kill_army', type: 'tank', need: 1, text: 'WRECK A TANK', reward: 400 },
  { kind: 'kill_army', type: 'heli', need: 1, text: 'DOWN A HELI', reward: 450 },
  { kind: 'kill_army', type: 'jet', need: 1, text: 'BAG A JET', reward: 450 },
  { kind: 'kill_army', type: 'robot', need: 1, text: 'FELL THE ROBOT', reward: 600 },
  { kind: 'kill_army', type: 'sat', need: 1, text: 'KILL THE SAT', reward: 550 },
  { kind: 'destroy_prop', type: '*', need: 8, text: 'RAZE 8 PROPS', reward: 300 },
  { kind: 'kill_animal', type: '*', need: 5, text: 'CHAOS 5 CRITTERS', reward: 250 },
  { kind: 'survive', type: 'heat', need: 20, text: 'SURVIVE HEAT 20S', reward: 500 },
  { kind: 'survive', type: 'wanted3', need: 15, text: 'HOLD 3 STARS 15S', reward: 600 },
];

function pickMission() {
  // filter by current wanted so early missions stay easy
  const pool = POOL.filter((m) => {
    if (m.type === 'robot' || m.type === 'sat' || m.type === 'wanted3') return G.wanted >= 2 || G.time > 60;
    if (m.type === 'heli' || m.type === 'jet' || m.type === 'tank') return G.wanted >= 1 || G.time > 30;
    return true;
  });
  const m = pool[(G.rng() * pool.length) | 0];
  return {
    id: G.missionsDone + 1,
    kind: m.kind,
    type: m.type,
    need: m.need,
    have: 0,
    text: m.text,
    reward: m.reward,
    done: false,
    doneT: 0,
    surviveT: 0,
  };
}

export function resetMissions() {
  G.mission = null;
  G.missionCd = 6; // first mission after a short beat
  G.missionsDone = 0;
}

export function updateMissions(dt) {
  // clear completed banner
  if (G.mission && G.mission.done) {
    G.mission.doneT -= dt;
    if (G.mission.doneT <= 0) {
      G.mission = null;
      G.missionCd = 5 + G.rng() * 4;
    }
    return;
  }

  if (!G.mission) {
    G.missionCd -= dt;
    if (G.missionCd <= 0) {
      G.mission = pickMission();
      audio.play('mission', { vol: 0.6 });
      popup(G.player.x, G.player.y - 30, 'NEW MISSION!', PAL.horizon, 1.2);
    }
    return;
  }

  // survive-style missions tick while condition holds
  const m = G.mission;
  if (m.kind === 'survive') {
    let ok = false;
    if (m.type === 'heat') ok = G.heat >= 30 || G.wanted >= 1;
    if (m.type === 'wanted3') ok = G.wanted >= 3;
    if (ok) {
      m.surviveT = (m.surviveT || 0) + dt;
      m.have = Math.min(m.need, m.surviveT | 0);
      if (m.surviveT >= m.need) {
        m.have = m.need;
        // complete via noteMission path manually
        m.done = true;
        m.doneT = 2.5;
        G.score += m.reward;
        G.missionsDone++;
        G.missionCd = 4;
        audio.play('mission');
        popup(G.player.x, G.player.y - 24, 'MISSION!', PAL.horizon, 1.3);
      }
    } else {
      // decay progress slowly when condition breaks
      m.surviveT = Math.max(0, (m.surviveT || 0) - dt * 0.5);
      m.have = m.surviveT | 0;
    }
  }
}
