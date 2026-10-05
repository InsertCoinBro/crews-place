import * as THREE from 'three';
import { CoasterRide } from './coaster-track.js';

export const WATER_PARK_EXIT = Object.freeze({ x: -151, z: -62 });
export const WATER_PARK_BOUNDS = Object.freeze({ minX: -239, maxX: -100, minZ: -198, maxZ: -45 });
export const WATER_COLORS = [0xff3985, 0xff922f, 0xffdf38, 0x39dbba, 0x36bfff, 0x9862ef];
export const WATER_SLIDES = [
  { name: 'Skyloop Splash', height: 82, description: '82 m · big drop · upside-down loop', speed: 31 },
  { name: 'Twister Falls', height: 62, description: '62 m · sweeping spiral · rushing water', speed: 24 },
  { name: 'Rainbow River', height: 36, description: '36 m · gentle winding slide · no inversions', speed: 14 },
];
export function insideWaterPark(p) {
  return p.x > WATER_PARK_BOUNDS.minX && p.x < WATER_PARK_BOUNDS.maxX && p.z > WATER_PARK_BOUNDS.minZ && p.z < WATER_PARK_BOUNDS.maxZ;
}
export function createWaterSlide(index = 0) {
  const nodes = [];
  if (index === 0) {
    nodes.push([-212,82,-172],[-204,82,-172],[-191,74,-172],[-170,40,-176],[-154,11,-178],[-141,9,-178]);
    for (let i=1;i<=48;i++) {
      const a=i/48*Math.PI*2;
      nodes.push([-141+18*Math.sin(a),9+18*(1-Math.cos(a)),-178+18*i/48]);
    }
    nodes.push([-115,12,-153],[-112,19,-132],[-127,16,-118],[-146,9,-111],[-155,5,-95],[-150,2.6,-82],[-135,2.6,-80]);
  } else if (index === 1) {
    nodes.push([-212,62,-161],[-202,62,-161],[-195,56,-158]);
    for(let i=0;i<=64;i++) {
      const a=i/64*Math.PI*3;
      nodes.push([-184+25*Math.sin(a),54-i/64*39,-133-25*Math.cos(a)]);
    }
    nodes.push([-213,12,-108],[-200,9,-85],[-178,5,-78],[-158,2.6,-73],[-135,2.6,-73]);
  } else {
    nodes.push([-212,36,-150],[-202,36,-150],[-195,32,-138],[-203,27,-119],[-225,22,-105],[-222,17,-82],[-226,13,-66],[-216,9,-52],[-190,5,-48],[-160,2.6,-54],[-135,2.6,-54]);
  }
  const curve = new THREE.CatmullRomCurve3(nodes.map(p=>new THREE.Vector3(p[0] + (index === 2 ? -8 : 0),p[1],p[2])),false,'centripetal');
  curve.arcLengthDivisions=6000;
  const length=curve.getLength(), count=1200;
  const points=[], tangents=[], rights=[], ups=[], rotations=[];
  let previous, right;
  for(let i=0;i<=count;i++) {
    const tangent=curve.getTangentAt(i/count).normalize();
    if(!previous) right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),tangent).normalize();
    else right.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(previous,tangent));
    right.addScaledVector(tangent,-right.dot(tangent)).normalize();
    const up=new THREE.Vector3().crossVectors(tangent,right).normalize();
    points.push(curve.getPointAt(i/count)); tangents.push(tangent); rights.push(right.clone()); ups.push(up);
    rotations.push(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,up,tangent)));
    previous=tangent;
  }
  // Ease any accumulated spiral banking back to upright before the pool.
  for(let i=Math.floor(count*.72);i<=count;i++) {
    const tangent=tangents[i],desired=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),tangent).normalize();
    const angle=Math.atan2(tangent.dot(new THREE.Vector3().crossVectors(rights[i],desired)),rights[i].dot(desired));
    rights[i].applyAxisAngle(tangent,angle*THREE.MathUtils.smoothstep(i/count,.72,1));
    ups[i].crossVectors(tangent,rights[i]).normalize();
    rotations[i].setFromRotationMatrix(new THREE.Matrix4().makeBasis(rights[i],ups[i],tangent));
  }
  return { index, curve, length, count, points, tangents, rights, ups, rotations,
    sample(distance) {
      const f=THREE.MathUtils.clamp(distance/length,0,1)*count;
      const i=Math.min(count-1,Math.floor(f)), a=f-i;
      const rotation=rotations[i].clone().slerp(rotations[i+1],a);
      return {position:points[i].clone().lerp(points[i+1],a),rotation,
        tangent:new THREE.Vector3(0,0,1).applyQuaternion(rotation),
        right:new THREE.Vector3(1,0,0).applyQuaternion(rotation),
        up:new THREE.Vector3(0,1,0).applyQuaternion(rotation)};
    }
  };
}
export class WaterSlideRide extends CoasterRide {
  update(dt) {
    if(this.state!=='riding') return;
    for(let left=Math.min(Math.max(dt,0),.1);left>1e-8;) {
      const h=Math.min(left,1/120);left-=h;this.elapsed+=h;
      const s=this.track.sample(this.distance), remain=this.track.length-this.distance;
      const cap=WATER_SLIDES[this.track.index].speed*(this.gentle?.65:1);
      this.phase=remain<20?'Splashdown · slowing gently':s.up.y<-.2?'Around the rainbow loop!':s.tangent.y<-.4?'Here comes the big splash!':'Flowing through the rainbow';
      const target=remain<20?Math.max(2,Math.sqrt(remain)*2):cap;
      this.speed=THREE.MathUtils.damp(this.speed,target,remain<20?2:.65,h);
      this.distance=Math.min(this.track.length,this.distance+this.speed*h);
      if(this.distance>=this.track.length) {this.speed=0;this.state='arrived';this.phase='Splash! Choose another slide or ride again.';break;}
    }
  }
}
