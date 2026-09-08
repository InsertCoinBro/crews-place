import * as THREE from 'three';

// Station anchored to the northeast meadow observed in the user's open game.
export const COASTER_STATION = Object.freeze({ x: 59, z: -61 });
export const COASTER_EXIT = Object.freeze({ x: 59, z: -57.6 });
export const COASTER_COLORS = [0xf24e85, 0xffad39, 0xffd557, 0x26c5b8, 0x4689ed, 0xa879eb];
export function createCoasterTrack() {
  const nodes = [[59,1,-61],[67,1,-61],[77,3,-64],[82,8,-74],
    [72,17,-83],[52,28,-84],[32,33,-83],[22,30,-82],[12,10,-82],[0,3,-82]];
  // A little lateral separation through each inversion keeps the entry and
  // exit rails apart, with true upside-down travel at the top.
  const loop = (x, z, radius, direction, drift) => {
    for (let i=1;i<=32;i++) {
      const a=i/32*Math.PI*2;
      nodes.push([x+direction*radius*Math.sin(a),3+radius*(1-Math.cos(a)),z+drift*i/32]);
    }
  };
  loop(0,-82,10,-1,13);
  nodes.push([-17,5,-68],[-32,10,-65],[-39,13,-54],[-30,8,-42],[-15,15,-43],[5,3,-43]);
  loop(5,-43,8,1,-12);
  nodes.push([23,12,-56],[37,17,-39],[58,7,-34],[77,5,-36],
    [85,7,-45],[85,3,-63],[75,1.4,-72],[51,1,-72],[44,1,-67],[47,1,-61]);
  const curve=new THREE.CatmullRomCurve3(nodes.map(p=>new THREE.Vector3(...p)),true,'centripetal');
  curve.arcLengthDivisions=12000;
  const length=curve.getLength(), count=3000;
  const points=[], tangents=[], rights=[], ups=[], rotations=[];
  for(let i=0;i<=count;i++) {
    const t=i/count, tangent=curve.getTangentAt(t).normalize();
    const node=curve.getUtoTmapping(t)*nodes.length;
    let referenceUp=new THREE.Vector3(0,1,0);
    for(const [start,direction] of [[9,-1],[47,1]]) {
      if(node>=start && node<=start+32) {
        const a=(node-start)/32*Math.PI*2;
        referenceUp.set(-direction*Math.sin(a),Math.cos(a),0);
      }
    }
    const right=new THREE.Vector3().crossVectors(referenceUp,tangent).normalize();
    const up=new THREE.Vector3().crossVectors(tangent,right).normalize();
    points.push(curve.getPointAt(t)); tangents.push(tangent); rights.push(right); ups.push(up);
    rotations.push(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,up,tangent)));
  }
  const sample=(distance)=>{
    const f=THREE.MathUtils.euclideanModulo(distance,length)/length*count;
    const i=Math.floor(f), a=f-i;
    const rotation=rotations[i].clone().slerp(rotations[i+1],a);
    return {position:points[i].clone().lerp(points[i+1],a),rotation,
      tangent:new THREE.Vector3(0,0,1).applyQuaternion(rotation),
      right:new THREE.Vector3(1,0,0).applyQuaternion(rotation),
      up:new THREE.Vector3(0,1,0).applyQuaternion(rotation)};
  };
  return {curve,length,count,points,tangents,rights,ups,rotations,sample};
}

// Acceleration is integrated in small steps. Lift motors, gravity, trim brakes,
// and the final station brake each act on the same distance-based route.
export class CoasterRide {
  constructor(track) { this.track=track; this.reset(); }
  reset() { this.state='waiting'; this.distance=0; this.speed=0; this.elapsed=0; this.phase='Ready to board'; }
  board() { if(this.state!=='waiting') return false; this.state='seated'; this.phase='Ready when you are'; return true; }
  launch() { if(this.state!=='seated') return false; this.state='riding'; this.phase='Leaving the station'; return true; }
  update(dt) {
    if(this.state!=='riding') return;
    for(let left=Math.min(dt,0.1);left>1e-8;) {
      const h=Math.min(left,1/120); left-=h; this.elapsed+=h;
      const s=this.track.sample(this.distance), remain=this.track.length-this.distance;
      if(remain<27) {
        this.phase='Station brakes';
        const target=Math.min(10,Math.sqrt(Math.max(0,2*2.5*(remain-0.08))));
        this.speed=THREE.MathUtils.damp(this.speed,target,4,h);
      } else if(this.distance<12) {
        this.phase='Leaving the station'; this.speed=Math.min(6,this.speed+2.5*h);
      } else if(this.distance<105 && s.tangent.y>0.03) {
        this.phase='Climbing to the sky'; this.speed=THREE.MathUtils.damp(this.speed,4.5,2,h);
      } else {
        this.phase=s.up.y < -0.2 ? 'Upside down!' : s.tangent.y < -0.35 ? 'The big drop' : 'Rainbow rush';
        this.speed=THREE.MathUtils.clamp(this.speed+(-9.81*s.tangent.y-0.16)*h,9,29);
      }
      this.distance+=this.speed*h;
      if(remain<0.13 || this.distance>=this.track.length) {
        this.distance=0; this.speed=0; this.state='arrived'; this.phase='Welcome back!'; break;
      }
    }
  }
}
