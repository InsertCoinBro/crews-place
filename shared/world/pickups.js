import * as THREE from 'three';

// Apply a two-bone reach after the animation mixer, without stretching the arm.
export function aimHand(model, target) {
  const upper = model.getObjectByName('DEF-upper_armR');
  const lower = model.getObjectByName('DEF-forearmR');
  const hand = model.getObjectByName('DEF-handR');
  if (!upper || !lower || !hand) return false;
  model.updateMatrixWorld(true);
  const a = upper.getWorldPosition(new THREE.Vector3());
  const b = lower.getWorldPosition(new THREE.Vector3());
  const c = hand.getWorldPosition(new THREE.Vector3());
  const l1 = a.distanceTo(b), l2 = b.distanceTo(c);
  const direction = target.clone().sub(a);
  const distance = THREE.MathUtils.clamp(direction.length(), Math.abs(l1-l2)+.001, l1+l2-.001);
  direction.normalize();
  let bend = b.clone().sub(a).addScaledVector(direction, -b.clone().sub(a).dot(direction));
  if (bend.lengthSq() < 1e-8) bend.set(0,-1,0).addScaledVector(direction,direction.y);
  bend.normalize();
  const along = (l1*l1 + distance*distance - l2*l2)/(2*distance);
  const elbow = a.clone().addScaledVector(direction, along).addScaledVector(bend, Math.sqrt(Math.max(0,l1*l1-along*along)));
  function rotate(bone, from, to) {
    const delta = new THREE.Quaternion().setFromUnitVectors(from.normalize(),to.normalize());
    const world = bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(delta);
    bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));
    model.updateMatrixWorld(true);
  }
  rotate(upper,b.clone().sub(a),elbow.clone().sub(a));
  const joint = lower.getWorldPosition(new THREE.Vector3());
  rotate(lower,hand.getWorldPosition(new THREE.Vector3()).sub(joint),a.clone().addScaledVector(direction,distance).sub(joint));
  return true;
}

export class Pickups {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.held = null;
    this.pending = null;
    this.hint = '';
    for (const [index,z] of [15,13.3].entries()) {
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(.22,.27,.86,16),new THREE.MeshStandardMaterial({color:0xb48a60,roughness:.8}));
      stand.position.set(-2.4,.43,z);
      stand.receiveShadow=stand.castShadow=true;
      scene.add(stand);
      const mesh = new THREE.Mesh(index ? new THREE.BoxGeometry(.22,.22,.22) : new THREE.SphereGeometry(.12,16,12),new THREE.MeshStandardMaterial({color:index?0xe3b950:0x59aac9,roughness:.6}));
      const home = new THREE.Vector3(-2.4,index?.97:.98,z);
      mesh.position.copy(home);
      mesh.castShadow=true;
      mesh.name=index?'Pickup_Block':'Pickup_Ball';
      scene.add(mesh);
      this.items.push({mesh,home,name:index?'block':'ball'});
    }
  }
  reset() {
    this.pending=null;
    if(this.held) {
      const {item,model}=this.held;
      this.scene.add(item.mesh);
      item.mesh.position.copy(item.home);
      item.mesh.rotation.set(0,0,0);
      delete item.mesh.userData.carriedItem;
      model.animator?.setCarrying(false);
      this.held=null;
    }
    this.hint='';
  }
  // Call after Player.update, only in the town. Reset when changing area/avatar.
  update(dt,player,input) {
    if(this.held && this.held.model!==player.model) this.reset();
    const distance=item=>Math.hypot(player.position.x-item.home.x,player.position.z-item.home.z);
    const item=this.held?.item ?? this.items.reduce((a,b)=>distance(a)<distance(b)?a:b);
    const near=distance(item);
    this.hint=near<1.4 ? (near>.57?'Move closer to the toy stand':`T · ${this.held?'Return':'Grab'} ${item.name}`) : (this.held?'Bring the toy back to its stand · T to return':'');
    if(this.pending) {
      const p=this.pending;
      if(player.actualSpeed>.2 || !player.grounded || player.model!==p.model) { this.pending=null; return; }
      p.time+=dt;
      if(p.time<.65) aimHand(player.model,item.home);
      if(!p.contact && p.time>=.5) {
        p.contact=true;
        if(this.held) this.reset();
        else {
          const hand=player.model.getObjectByName('DEF-handR');
          if(hand) {
            hand.attach(item.mesh);
            item.mesh.position.set(0,.045,0);
            item.mesh.userData.carriedItem=true;
            this.held={item,model:player.model};
            player.model.animator?.setCarrying(true);
          }
        }
      }
      if(p.time>=1) this.pending=null;
      return;
    }
    if(!input.consume('KeyT') || near>.57 || !player.grounded || player.actualSpeed>.15) return;
    if(!player.model.getObjectByName('DEF-handR') || !player.model.animator?.actions.has('Reach')) {this.hint='Choose Cowboy to pick up toys';return;}
    player.heading=Math.atan2(item.home.x-player.position.x,item.home.z-player.position.z);
    player.sync();
    if(player.model.animator.trigger('Reach')) this.pending={model:player.model,time:0,contact:false};
  }
}
