import * as THREE from 'three';
import { mulberry32 } from './utils.js';
export class Weather {
  constructor(scene,track) {
    this.scene=scene;this.track=track;this.rain=track.data.weather==='rain';this.dust=track.data.weather==='dust';this.wetness=this.rain?.8:0;
    this.group=new THREE.Group();scene.add(this.group);
    const random=mulberry32(track.data.seed+71);
    const count=this.rain?1000:180, positions=new Float32Array(count*6);
    this.drops=Array.from({length:count},()=>({x:(random()-.5)*110,y:random()*50,z:(random()-.5)*110}));
    this.geometry=new THREE.BufferGeometry();this.geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    this.streaks=new THREE.LineSegments(this.geometry,new THREE.LineBasicMaterial({color:this.rain?0xb7cee5:0xc49a72,transparent:true,opacity:this.rain?.35:.16,depthWrite:false}));
    this.streaks.frustumCulled=false;this.group.add(this.streaks);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    const ctx=canvas.getContext('2d');
    for(let i=0;i<32;i++) {const x=25+random()*78,y=40+random()*48,r=16+random()*24,g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(255,255,255,.24)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);}
    this.cloudTexture=new THREE.CanvasTexture(canvas);
    this.clouds=[];
    for(let i=0;i<28;i++) {
      const cloud=new THREE.Sprite(new THREE.SpriteMaterial({map:this.cloudTexture,color:this.rain?0x526377:0xffe7d0,transparent:true,opacity:this.rain?.65:.42,depthWrite:false}));
      cloud.position.set((random()-.5)*track.extent*2,145+random()*80,(random()-.5)*track.extent*2);cloud.scale.set(250+random()*250,110+random()*110,1);this.group.add(cloud);this.clouds.push(cloud);
    }
    if(this.rain) {
      const mat=new THREE.MeshStandardMaterial({color:0x557384,metalness:.65,roughness:.1,transparent:true,opacity:.48,depthWrite:false});
      const geo=new THREE.CircleGeometry(1,20);
      for(let i=0;i<65;i++) {
        const f=track.frameAt((i+.5)/65),p=new THREE.Mesh(geo,mat);
        p.position.copy(f.point).addScaledVector(f.side,(i%2?1:-1)*track.data.width*.4);p.position.y+=.063;
        p.rotation.set(-Math.PI/2,0,-Math.atan2(f.tangent.x,f.tangent.z));p.scale.set(1+random()*1.5,3+random()*5,1);this.group.add(p);
      }
    }
  }
  update(dt,time,position,sun) {
    this.wetness=this.rain?.72+Math.sin(time*.025)*.13:0;
    const gust=3+Math.sin(time*.19)*2;
    const array=this.geometry.attributes.position.array;
    this.drops.forEach((d,i)=>{
      d.y-=dt*(this.rain?32:1.4);d.x+=dt*gust;
      if(d.y<0)d.y+=50;if(d.x>55)d.x-=110;
      const x=position.x+d.x,y=position.y+d.y-4,z=position.z+d.z;
      array.set([x,y,z,x+ (this.rain?.13:1),y+(this.rain?1.6:.08),z],i*6);
    });
    this.geometry.attributes.position.needsUpdate=true;
    this.clouds.forEach(c=>{c.position.x+=dt*gust*.45;if(c.position.x>this.track.extent)c.position.x=-this.track.extent;});
    if(sun) {if(!this.sunBase)this.sunBase=sun.intensity;sun.intensity=this.sunBase*(this.rain?.65+Math.sin(time*.035)*.08:.88+Math.sin(time*.03)*.12);}
  }
  dispose(){this.scene.remove(this.group);const geometries=new Set(),materials=new Set();this.group.traverse(n=>{if(n.geometry)geometries.add(n.geometry);if(n.material)materials.add(n.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.cloudTexture.dispose();}
}
