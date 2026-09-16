import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { label, makeBench } from './models.js';
import { createCoasterTrack, CoasterRide, COASTER_STATION, COASTER_EXIT, COASTER_COLORS } from './coaster-track.js';
const v=(x,y,z)=>new THREE.Vector3(x,y,z);
const mats=new Map();
function mat(color,metalness=0.15) {
  const key=`${color}/${metalness}`;
  if(!mats.has(key)) mats.set(key,new THREE.MeshStandardMaterial({color,roughness:0.32,metalness}));
  return mats.get(key);
}
function mesh(parent,geo,color,pos) {
  const m=new THREE.Mesh(geo,mat(color)); m.position.copy(pos); m.castShadow=true; m.receiveShadow=true; parent.add(m); return m;
}
export function rounded(parent,pos,size,color,r=0.15) { return mesh(parent,new RoundedBoxGeometry(...size,3,r),color,v(...pos)); }
export function bar(parent,a,b,r,color) {
  const delta=b.clone().sub(a);
  const m=mesh(parent,new THREE.CylinderGeometry(r,r,delta.length(),10),color,a.clone().add(b).multiplyScalar(.5));
  m.quaternion.setFromUnitVectors(v(0,1,0),delta.normalize()); return m;
}
export function tube(track,offsetY,offsetX,radius,paletteColors=COASTER_COLORS) {
  const vertices=[], normals=[], colors=[], indices=[], sides=8;
  const palette=paletteColors.map(c=>new THREE.Color(c));
  for(let i=0;i<=track.count;i++) {
    const colorT=i/track.count*palette.length, ci=Math.floor(colorT)%palette.length;
    const color=palette[ci].clone().lerp(palette[(ci+1)%palette.length],colorT%1);
    const p=track.points[i].clone().addScaledVector(track.ups[i],offsetY).addScaledVector(track.rights[i],offsetX);
    for(let j=0;j<sides;j++) {
      const a=j/sides*Math.PI*2, n=track.rights[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(track.ups[i],Math.sin(a));
      vertices.push(...p.clone().addScaledVector(n,radius).toArray()); normals.push(...n.toArray()); colors.push(color.r,color.g,color.b);
      if(i<track.count) { const a=i*sides+j,b=i*sides+(j+1)%sides,c=b+sides,d=a+sides; indices.push(a,b,d,b,c,d); }
    }
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeBoundingSphere();return geo;
}
export class RollerCoaster {
  constructor(game, options = {}) {
    this.game=game; this.track=options.track ?? createCoasterTrack(); this.ride=options.ride ?? new CoasterRide(this.track);
    this.title=options.title ?? 'Rainbow Rush'; this.id=options.id ?? 'coaster';
    this.exitPoint=options.exitPoint ?? COASTER_EXIT; this.colors=options.colors ?? COASTER_COLORS;
    this.group=new THREE.Group();this.group.name=this.title+' coaster park';game.areas.town.group.add(this.group);
    this.buildTrack(); this.buildStation(); this.buildTrain(); this.buildHUD();
    game.interactions.register({id:options.id ?? 'rainbow-coaster',area:'town',kind:this.id,x:this.exitPoint.x,z:this.exitPoint.z,radius:5,label:'Board '+this.title,hint:'E · Get into the coaster cart'});
    game.interactions.on(this.id,()=>this.board());
    this.placeTrain();
  }
  get occupied() { return this.ride.state!=='waiting'; }
  buildTrack() {
    const railMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.28,metalness:.4});
    for(const x of [-.67,.67]) { const m=new THREE.Mesh(tube(this.track,0,x,.105),railMat); m.castShadow=true;this.group.add(m); }
    const spine=new THREE.Mesh(tube(this.track,-.48,0,.19),railMat);spine.castShadow=true;this.group.add(spine);
    for (const [x,z,r] of [[0,-75.5,10],[5,-49,8]]) {
      const top=v(x,3+2*r+.6,z);
      for (const side of [-1,1]) {
        const foot=v(x+side*(r+4),.15,z);
        bar(this.group,foot,top,.23,0x188da2);
        rounded(this.group,[foot.x,.1,foot.z],[1.6,.3,1.6],0xd8cab1,.08);
      }
    }
    const count=Math.floor(this.track.length/1.2), ties=new THREE.InstancedMesh(new THREE.BoxGeometry(1.75,.13,.19),mat(0xe8f6fa,.45),count);
    const dummy=new THREE.Object3D();
    for(let i=0;i<count;i++) { const s=this.track.sample(i/count*this.track.length);dummy.position.copy(s.position).addScaledVector(s.up,-.15);dummy.quaternion.copy(s.rotation);dummy.updateMatrix();ties.setMatrixAt(i,dummy.matrix); }
    ties.castShadow=true;this.group.add(ties);
    for(let d=10;d<this.track.length-18;d+=10) {
      const s=this.track.sample(d);
      if(s.up.y<.75 || Math.abs(s.tangent.y)>.65) continue;
      const p=s.position.clone().addScaledVector(s.up,-.65);
      for(const side of [-1,1]) {
        const foot=p.clone().addScaledVector(s.right,side*2.1); foot.y=.18;
        // Keep every pylon away from all other parts of the track.
        if(this.track.points.some((q,i)=>i%12===0 && Math.hypot(q.x-foot.x,q.z-foot.z)<1.35 && q.y<p.y)) continue;
        rounded(this.group,[foot.x,.1,foot.z],[1.1,.28,1.1],0xe7dbc7,.08);
        bar(this.group,foot,p,.16,0x26a7b2);
      }
    }
  }
  buildStation() {
    const g=this.group, {x,z}=COASTER_STATION;
    rounded(g,[x,.04,z+5],[26,.12,16],0xf2ddbb,.05);
    rounded(g,[x,.13,z+3.4],[18,.18,4.9],0xfff1d7,.06);
    // Flush paths are walkable with the existing ground-plane movement system.
    rounded(g,[43,.025,-40],[5,.08,24],0xe7d7ba,.02);
    rounded(g,[51,.03,-51],[20,.08,4],0xe7d7ba,.02);
    for(const xx of [x-8,x+8]) {
      for(const zz of [z-2.1,z+5.2]) bar(g,v(xx,.1,zz),v(xx,5,zz),.16,0x5ba6ae);
    }
    // Curved translucent-looking canopy, split into bright candy stripes.
    for(let i=0;i<8;i++) {
      const shape=new THREE.Shape();shape.moveTo(-4,0);shape.quadraticCurveTo(0,2.8,4,0);shape.lineTo(4,-.18);shape.quadraticCurveTo(0,2.52,-4,-.18);shape.closePath();
      const roof=mesh(g,new THREE.ExtrudeGeometry(shape,{depth:2.15,bevelEnabled:false,curveSegments:24}),COASTER_COLORS[i%6],v(x-8.5+i*2.15,5,z+1.5));
      roof.rotation.y=Math.PI/2;
    }
    label(g,'RAINBOW RUSH',x,5.1,z+5.55,12,'#194f69','#fff6cd');
    label(g,'BOARD HERE  •  E',x+5,1.7,z+4.8,3.6,'#fff5db','#24566b');
    // Gates stay on the far side of the open boarding path.
    for(const xx of [x-5.5,x+5.5]) {
      bar(g,v(xx,.1,z+2),v(xx,1.15,z+2),.07,0xef6796);
      bar(g,v(xx,.1,z+4.6),v(xx,1.15,z+4.6),.07,0xef6796);
      bar(g,v(xx,1.05,z+2),v(xx,1.05,z+4.6),.06,0xef6796);
    }
    for(const side of [-1,1]) {
      makeBench(g,x+side*10,z+5,side*Math.PI/2);
      for(let j=0;j<3;j++) {
        const xx=x+side*11, zz=z-4+j*5;
        mesh(g,new THREE.CylinderGeometry(1.1,.9,.55,32),0xf4c28e,v(xx,.28,zz));
        for(let k=0;k<9;k++) { const a=k*2.4,p=v(xx+Math.sin(a)*.72,.73,zz+Math.cos(a)*.72); mesh(g,new THREE.SphereGeometry(.27,12,8),COASTER_COLORS[(j+k)%6],p); }
      }
    }
    // A line of welcoming pennants and round lanterns along the plaza.
    for(let i=0;i<7;i++) {
      const xx=44+i*4.6;
      bar(g,v(xx,0,-46),v(xx,4.1,-46),.06,0x456f8b);
      mesh(g,new THREE.SphereGeometry(.26,16,12),0xffd97d,v(xx,4.15,-46));
      if(i<6) {
        bar(g,v(xx,3.8,-46),v(xx+4.6,3.8,-46),.018,0x456f8b);
        for(let k=0;k<4;k++) mesh(g,new THREE.ConeGeometry(.26,.7,3),COASTER_COLORS[(i+k)%6],v(xx+.7+k,3.46,-46)).rotation.z=Math.PI;
      }
    }
  }
  buildTrain() {
    this.cars=[];
    for(let i=0;i<3;i++) {
      const car=new THREE.Group();this.group.add(car);this.cars.push(car);
      rounded(car,[0,.31,0],[1.7,.5,2.35],this.colors[i*2],.2);
      rounded(car,[0,.57,1.05],[1.7,.8,.36],this.colors[i*2],.15);
      for(const x of [-.76,.76]) rounded(car,[x,.72,0],[.2,.72,1.9],this.colors[i*2],.09);
      rounded(car,[0,.65,-.48],[1.24,.25,.72],0x243b67,.1);
      rounded(car,[0,1.1,-.85],[1.3,.9,.22],0x243b67,.1);
      for(const x of [-.45,.45]) bar(car,v(x,.6,.28),v(x,1.14,.28),.055,0xffd769);
      bar(car,v(-.55,1.14,.28),v(.55,1.14,.28),.065,0xffd769);
      for(const x of [-.8,.8]) for(const z of [-.73,.73]) { const wheel=mesh(car,new THREE.CylinderGeometry(.23,.23,.16,20),0x24374c,v(x,.01,z));wheel.rotation.z=Math.PI/2; }
      if(i===0) { const lamp=mesh(car,new THREE.SphereGeometry(.22,16,12),0xfff4bc,v(0,.9,1.22));lamp.scale.z=.3; }
    }
  }
  buildHUD() {
    this.hud=document.createElement('section');this.hud.className='coaster-hud';this.hud.hidden=true;this.hud.setAttribute('aria-label',this.title+' ride controls');
    this.hud.innerHTML='<div><span class="coaster-eyebrow">RAINBOW RUSH</span><strong id="coaster-phase" aria-live="polite">Ready when you are</strong></div><div class="coaster-stats"><span id="coaster-speed">0 km/h</span><span id="coaster-progress">At the station</span></div><div class="coaster-actions"><button id="coaster-launch">Launch ride · E</button><button id="coaster-view">View: follow cart · C</button><button id="coaster-exit">Get out</button></div>';
    document.querySelector('#hud').append(this.hud);
    this.phase=this.hud.querySelector('#coaster-phase');this.speedLabel=this.hud.querySelector('#coaster-speed');this.progress=this.hud.querySelector('#coaster-progress');
    this.launchButton=this.hud.querySelector('#coaster-launch');this.viewButton=this.hud.querySelector('#coaster-view');this.exitButton=this.hud.querySelector('#coaster-exit');
    this.hud.querySelector('.coaster-eyebrow').textContent=this.title.toUpperCase();
    if(this.id !== 'coaster') this.hud.querySelectorAll('[id]').forEach(el=>el.id=el.id.replace('coaster',this.id));
    this.launchButton.onclick=()=>{if(this.game.mode==='playing') this.launch();};
    this.viewButton.onclick=()=>{if(this.game.mode==='playing')this.toggleView();};
    this.exitButton.onclick=()=>{if(this.game.mode==='playing')this.exit();};
    this.view='follow';
  }
  board() {
    const g=this.game;
    if(g.player.inVehicle || g.driving || g.flying || g.cornMaze?.occupied || g.area.id!=='town' || g.mode!=='playing' || !this.ride.board()) return;
    g.pickups.reset();g.player.velocity.set(0,0);g.player.velocityY=0;g.player.inVehicle=true;g.player.model.animator?.reset();
    this.savedParent=g.player.model.parent;
    this.cars[0].add(g.player.model);
    g.player.model.position.set(0,.29,-.24);g.player.model.rotation.set(0,0,0);g.player.model.visible=true;
    this.poseRider();g.input.clear();g.ui.showPrompt(null);this.hud.hidden=false;
    document.querySelector('#cowboy-controls').hidden=true;document.querySelector('#robot-gestures').hidden=true;
    g.ui.toast('You are in! Press E or Launch ride when ready.');this.placeTrain();this.updateHUD();
  }
  poseRider() {
    // The exported characters have articulated legs; use a seated pose while
    // their animation mixer is suspended, and reset it when they step out.
    const model=this.game.player.model;
    model.traverse(n=>{
      if(/DEF-thigh[LR]$|thigh[._-][LR]$/i.test(n.name)) n.rotation.x=-Math.PI/2;
      if(/DEF-shin[LR]$|shin[._-][LR]$/i.test(n.name)) n.rotation.x=Math.PI/2;
    });
  }
  launch() {
    if(this.ride.state==='arrived') { this.ride.reset();this.ride.board(); }
    if(this.ride.launch()) { this.game.input.clear();this.game.canvas.focus();this.updateHUD(); }
  }
  toggleView() { this.view=this.view==='follow'?'front':'follow';this.viewButton.textContent=`View: ${this.view==='follow'?'follow cart':'front seat'} · C`;this.game.canvas.focus(); }
  exit() {
    if(!this.occupied) return;
    const g=this.game;
    this.savedParent.add(g.player.model);g.player.model.rotation.set(0,0,0);g.player.inVehicle=false;g.player.model.visible=true;
    this.ride.reset();this.hud.hidden=true;g.camera.up.set(0,1,0);g.camera.fov=55;g.camera.updateProjectionMatrix();
    g.player.teleport(this.exitPoint.x,this.exitPoint.z);g.player.heading=Math.PI;g.follow.reset(0);g.input.clear();g.interactionCooldown=.6;g.refreshCharacterUI();g.canvas.focus();this.placeTrain();g.ui.toast('Back at the station. Ride again whenever you like!');
  }
  placeTrain() {
    this.cars.forEach((car,i)=>{ const s=this.track.sample(this.ride.distance-i*2.8);car.position.copy(s.position);car.quaternion.copy(s.rotation); });
    if(this.occupied) this.game.player.position.copy(this.cars[0].position);
  }
  update(dt) {
    if(!this.occupied) return;
    if(this.game.input.consume('KeyC'))this.toggleView();
    if(this.game.input.consume('KeyE') && this.ride.state!=='riding')this.launch();
    this.ride.update(dt);this.placeTrain();this.updateHUD();
  }
  updateHUD() {
    if(this.phase.textContent!==this.ride.phase)this.phase.textContent=this.ride.phase;
    this.speedLabel.textContent=`${Math.round(this.ride.speed*3.6)} km/h`;
    this.progress.textContent=this.ride.state==='riding'?`${Math.floor(this.ride.distance/this.track.length*100)}% of the circuit`:'At the station';
    this.launchButton.hidden=this.ride.state==='riding';this.launchButton.textContent=this.ride.state==='arrived'?'Ride again · E':'Launch ride · E';
    this.exitButton.textContent=this.ride.state==='riding'?'Return to station':'Get out';
  }
  updateCamera(dt) {
    const g=this.game,s=this.track.sample(this.ride.distance),front=this.view==='front';
    const up=g.calm?v(0,1,0):s.up;
    const target=s.position.clone().addScaledVector(s.up,1.4);
    const desired=front?s.position.clone().addScaledVector(s.up,1.65).addScaledVector(s.tangent,.75):target.clone().addScaledVector(s.tangent,-8).addScaledVector(up,3.7);
    if(front && !g.calm)g.camera.position.copy(desired);else g.camera.position.lerp(desired,1-Math.exp(-(g.calm?5:10)*dt));
    g.camera.up.copy(up);
    g.camera.lookAt(front?target.clone().addScaledVector(s.tangent,12):target);
    g.camera.fov=THREE.MathUtils.damp(g.camera.fov,g.calm?55:55+this.ride.speed*.38,3,dt);g.camera.updateProjectionMatrix();
    g.player.model.visible=!front;g.follow.yaw=Math.atan2(-s.tangent.x,-s.tangent.z);
  }
}
