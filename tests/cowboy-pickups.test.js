import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {preparePlayerCharacter} from '../shared/world/player-character.js';
import {Player} from '../shared/core/player.js';
import {Pickups,aimHand} from '../shared/world/pickups.js';
async function cowboy() {
 const bytes=await readFile(new URL('../assets/models/cowboy.glb',import.meta.url));
 return preparePlayerCharacter(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''));
}
test('every cowboy clip moves the intended joints and contains finite keyframes',async()=>{
 const model=await cowboy();
 for(const clip of model.animations) {
   assert.ok(clip.duration>0);
   assert.ok(clip.tracks.every(t=>Array.from(t.values).every(Number.isFinite)),clip.name);
 }
 for(const [clipName,boneName] of [['Walk','DEF-shinL'],['Run','DEF-upper_armL'],['JumpStart','DEF-shinR'],['Dance','DEF-thighL'],['Reach','DEF-handR']]) {
   const mixer=new THREE.AnimationMixer(model);
   const action=mixer.clipAction(THREE.AnimationClip.findByName(model.animations,clipName)).play();
   mixer.setTime(0); const bone=model.getObjectByName(boneName);model.updateMatrixWorld(true);const first=bone.matrixWorld.clone();
   mixer.setTime(action.getClip().duration*.5);model.updateMatrixWorld(true);
   assert.ok(!first.equals(bone.matrixWorld),clipName+' should move '+boneName);
   mixer.stopAllAction();mixer.uncacheRoot(model);
 }
});
test('pickup attaches at contact, returns to its stand and survives avatar changes',async()=>{
 const scene=new THREE.Scene(), model=await cowboy(),player=new Player(scene,model),pickups=new Pickups(scene);
 player.teleport(-2.4,15.45);
 let pressed=true;
 const input={consume:()=>{const p=pressed;pressed=false;return p;}};
 const tick=()=>{model.animator.update(1/60);pickups.update(1/60,player,input);};
 tick();assert.ok(pickups.pending,'Reach must start');
 for(let i=0;i<20;i++)tick();assert.equal(pickups.held,null,'do not grab before contact');
 for(let i=0;i<45;i++)tick();
 assert.equal(pickups.held.item.mesh.parent,model.getObjectByName('DEF-handR'));
 pressed=true;for(let i=0;i<65;i++)tick();
 assert.equal(pickups.held,null);
 assert.ok(pickups.items[0].mesh.position.equals(pickups.items[0].home));
 pressed=true;for(let i=0;i<65;i++)tick();assert.ok(pickups.held);
 player.model=new THREE.Group();pickups.update(1/60,player,input);
 assert.equal(pickups.held,null);assert.equal(pickups.items[0].mesh.parent,scene);
});
test('reach IK moves wrist toward a target without stretching the arm',async()=>{
 const model=await cowboy();model.updateMatrixWorld(true);
 const hand=model.getObjectByName('DEF-handR'),upper=model.getObjectByName('DEF-upper_armR'),lower=model.getObjectByName('DEF-forearmR');
 const pos=n=>n.getWorldPosition(new THREE.Vector3());
 const lengths=[pos(upper).distanceTo(pos(lower)),pos(lower).distanceTo(pos(hand))];
 const target=new THREE.Vector3(.15,1.05,.25),before=pos(hand).distanceTo(target);
 assert.ok(aimHand(model,target));
 assert.ok(pos(hand).distanceTo(target)<before);
 assert.ok(Math.abs(pos(upper).distanceTo(pos(lower))-lengths[0])<1e-6);
 assert.ok(Math.abs(pos(lower).distanceTo(pos(hand))-lengths[1])<1e-6);
});
test('cowboy dance toggles, movement cancels it, and carrying leaves legs animated',async()=>{
 const model=await cowboy(),animator=model.animator;
 assert.ok(animator.trigger('Dance'));
 for(let i=0;i<360;i++)animator.update(1/60);
 assert.equal(animator.current,'Dance','dance should loop past its first cycle');
 animator.trigger('Dance');animator.update(1/60);assert.equal(animator.current,'Idle');
 animator.trigger('Dance');animator.update(.2,{speed:5.2});assert.equal(animator.current,'Walk');
 animator.setCarrying(true);animator.update(.2,{speed:5.2});
 assert.equal(animator.current,'Walk');assert.equal(animator.carrying,true);
 assert.ok(animator.activeAction.getClip().tracks.some(t=>t.name.includes('DEF-shin')));
 assert.ok(!animator.activeAction.getClip().tracks.some(t=>t.name.startsWith('DEF-handR.')));
 animator.reset();assert.equal(animator.carrying,false);
});
