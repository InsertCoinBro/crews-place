import * as THREE from 'three';
import { RollerCoaster, rounded, bar } from './coaster.js';
import { label } from './models.js';
import { createWaterSlide, WaterSlideRide, WATER_COLORS, WATER_PARK_EXIT, WATER_SLIDES, insideWaterPark } from './water-park-track.js';
const v=(x,y,z)=>new THREE.Vector3(x,y,z);
const colorMaterial=color=>new THREE.MeshStandardMaterial({color,roughness:.3,metalness:.08});

// Shared arc-length UVs make the whitewater visibly travel downhill, through
// curves and inversions, instead of pulsing in place.
function surface(track,radius,startAngle,arc,water=false) {
  const positions=[],uv=[],colors=[],indices=[],sides=water?10:20;
  for(let i=0;i<=track.count;i++) {
    const p=track.points[i], color=new THREE.Color(WATER_COLORS[Math.floor(i/track.count*18+track.index*2)%6]);
    for(let j=0;j<=sides;j++) {
      const a=startAngle+arc*j/sides;
      const q=p.clone().addScaledVector(track.rights[i],Math.cos(a)*radius).addScaledVector(track.ups[i],Math.sin(a)*radius);
      positions.push(...q.toArray());uv.push(i/track.count*track.length/5,j/sides);colors.push(color.r,color.g,color.b);
      if(i<track.count&&j<sides) {
        // Roof windows give follow-view riders a glimpse inside each tube.
        if(!water&&startAngle===0&&Math.floor(i/55)%3===1) continue;
        const a=i*(sides+1)+j,b=a+1,c=a+sides+1,d=c+1;indices.push(a,c,b,b,c,d);
      }
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
function flowingTexture() {
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
  const c=canvas.getContext('2d');c.fillStyle='#13b9df';c.fillRect(0,0,256,128);
  for(let i=0;i<28;i++) {
    const x=(i*73)%256,y=(i*37)%128;
    c.strokeStyle=i%3?'#97f5ff':'#efffff';c.lineWidth=i%3?2:4;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+12,y-6,x+28,y+2);c.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
export class WaterPark extends RollerCoaster {
  constructor(game) {
    const track=createWaterSlide(0);
    super(game,{track,ride:new WaterSlideRide(track),id:'water-park',title:'Rainbow Rapids',exitPoint:WATER_PARK_EXIT,colors:WATER_COLORS});
    const item=game.interactions.items.find(i=>i.id==='water-park');item.hint='E · Take the rainbow lift and choose a slide';item.label='Ride Rainbow Rapids';
    this.time=0;
  }
  buildTrack() {
    this.tracks=[this.track,createWaterSlide(1),createWaterSlide(2)];
    this.waterTexture=flowingTexture();
    const water=new THREE.MeshStandardMaterial({map:this.waterTexture,roughness:.17,metalness:.1,emissive:0x067eaa,emissiveIntensity:.3,side:THREE.DoubleSide});
    const shell=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.48,metalness:0,envMapIntensity:.2,side:THREE.DoubleSide});
    this.tracks.forEach(track=>{
      for(const [angle,arc,radius,isWater] of [[Math.PI,Math.PI,2.4,false],[0,Math.PI,2.4,false],[Math.PI*1.17,Math.PI*.66,2.29,true]]) {
        const mesh=new THREE.Mesh(surface(track,radius,angle,arc,isWater),isWater?water:shell);mesh.name=isWater?'fast-flowing-slide-water':'rainbow-slide-shell';this.group.add(mesh);
      }
      const rings=new THREE.InstancedMesh(new THREE.TorusGeometry(2.44,.085,6,24),colorMaterial(0xfff9df),Math.floor(track.length/9));
      const dummy=new THREE.Object3D();
      for(let i=0;i<rings.count;i++) {const s=track.sample(i*9);dummy.position.copy(s.position);dummy.quaternion.copy(s.rotation);dummy.updateMatrix();rings.setMatrixAt(i,dummy.matrix);}this.group.add(rings);
      for(let d=24;d<track.length-25;d+=38) {
        const s=track.sample(d);if(s.up.y<.65||Math.abs(s.tangent.y)>.6)continue;
        const foot=s.position.clone();foot.y=.1;
        // Skip pillars that would intersect any of the other slides.
        if(this.tracks.some(t=>t.points.some((q,i)=>i%6===0&&Math.hypot(q.x-foot.x,q.z-foot.z)<3&&q.y<s.position.y-4)))continue;
        bar(this.group,foot,s.position.clone().addScaledVector(s.up,-2.6),.27,WATER_COLORS[track.index*2]);
      }
    });
  }
  buildStation() {
    const g=this.group;
    rounded(g,[-169,.025,-125],[138,.09,144],0xf7e9c8,.02);
    // Flush promenade reaches the west town approach without crossing the maze.
    rounded(g,[-93,.035,-57],[130,.09,6],0xffd792,.02);
    for(let i=0;i<22;i++)rounded(g,[-157+i*6,.09,-57],[2,.045,4],WATER_COLORS[i%6],.01);
    // A broad, shallow splash lagoon with three separate runouts.
    rounded(g,[-137,.16,-80],[37,.32,30],0xffffff,.12);
    const pool=new THREE.Mesh(new THREE.PlaneGeometry(34,27),new THREE.MeshStandardMaterial({map:this.waterTexture,roughness:.2,emissive:0x087fac,emissiveIntensity:.25}));pool.rotation.x=-Math.PI/2;pool.position.set(-137,.34,-80);g.add(pool);
    for(let i=0;i<3;i++) {rounded(g,[-141,.6,-80+i*7],[28,.5,5.9],WATER_COLORS[i*2],.2);const lane=new THREE.Mesh(new THREE.PlaneGeometry(27,5.3),pool.material);lane.rotation.x=-Math.PI/2;lane.position.set(-141,.87,-80+i*7);g.add(lane);}
    // Colorful splash islands break up the plaza and invite ground exploration.
    for(const [cx,cz,r] of [[-181,-107,13],[-226,-131,7],[-140,-135,9]]) {
      for(let i=5;i>=0;i--) {
        const disk=new THREE.Mesh(new THREE.CircleGeometry(r*(i+1)/6,48),colorMaterial(WATER_COLORS[i]));
        disk.rotation.x=-Math.PI/2;disk.position.set(cx,.095+(6-i)*.003,cz);g.add(disk);
      }
      for(let i=0;i<5;i++) {
        const a=i/5*Math.PI*2;
        const petal=new THREE.Mesh(new THREE.SphereGeometry(1.5,12,8),colorMaterial(WATER_COLORS[i]));petal.position.set(cx+Math.cos(a)*2.5,3.8,cz+Math.sin(a)*2.5);petal.scale.y=.5;g.add(petal);
      }
      bar(g,v(cx,0,cz),v(cx,3.6,cz),.22,0x31bbaa);
      const center=new THREE.Mesh(new THREE.SphereGeometry(1.2,16,10),colorMaterial(0xffd638));center.position.set(cx,4,cz);g.add(center);
    }
    // Tall rainbow lift tower: three visible deck levels match the slide starts.
    for(const x of [-218,-207])for(const z of [-177,-145])bar(g,v(x,0,z),v(x,86,z),.6,0x5860c9);
    for(const [i,y] of [36,62,82].entries()) {
      rounded(g,[-212,y-2.8,-161],[17,.65,39],WATER_COLORS[i*2],.25);
      for(const z of [-179,-143])bar(g,v(-220,y-1.8,z),v(-204,y-1.8,z),.15,0xffffff);
      label(g,`${y} m`,-220,y,-141,4,'#5942aa','#ffffff');
    }
    rounded(g,[-218,42,-161],[3,84,4],0xffcd42,.5);
    label(g,'RAINBOW LIFT',-217,6,-142,10,'#6b36ae','#ffffff');
    // Entry rainbow and oversized candy-colored splash sculptures.
    for(let i=0;i<6;i++) {
      const arch=new THREE.Mesh(new THREE.TorusGeometry(10+i*.65,.36,8,64,Math.PI),colorMaterial(WATER_COLORS[i]));arch.position.set(-151,1,-60);g.add(arch);
    }
    label(g,'RAINBOW RAPIDS',-151,9,-59.5,17,'#502aa1','#ffffff');
    label(g,'CHOOSE A SLIDE · E',-151,3.6,-59.4,10,'#ffffff','#54299f');
    label(g,'WATER PARK  ←',-47,2.4,-54,8,'#6535ad','#ffffff');
    bar(g,v(-47,0,-54),v(-47,2,-54),.12,0xa357d9);
    // A quiet shaded rest area and a walk-through rainbow splash garden.
    for(let i=0;i<7;i++) {
      const x=-231+i*17,z=-58;
      const canopy=new THREE.Mesh(new THREE.ConeGeometry(4.4,1.7,12),colorMaterial(WATER_COLORS[i%6]));canopy.position.set(x,4.8,z-7);g.add(canopy);bar(g,v(x,0,z-7),v(x,4.6,z-7),.12,0xffffff);
      rounded(g,[x,.65,z-5],[5,1.1,1.3],WATER_COLORS[(i+2)%6],.25);
    }
    label(g,'QUIET CORNER',-224,2,-58,8,'#eef7ff','#50368c');
    this.fountains=[];
    for(let i=0;i<8;i++) {
      const x=-115,z=-99-i*11;
      const ring=new THREE.Mesh(new THREE.TorusGeometry(3,.35,8,32,Math.PI),colorMaterial(WATER_COLORS[i%6]));ring.position.set(x,.2,z);g.add(ring);
      const jet=new THREE.Mesh(new THREE.CylinderGeometry(.2,.35,3.4,8),colorMaterial(0x91edff));jet.position.set(x,1.7,z);g.add(jet);this.fountains.push(jet);
    }
    // Foam beads are instanced so the whole park stays inexpensive to animate.
    this.foam=new THREE.InstancedMesh(new THREE.SphereGeometry(.12,6,4),new THREE.MeshBasicMaterial({color:0xe9ffff}),144);this.foam.frustumCulled=false;g.add(this.foam);this.foamDummy=new THREE.Object3D();
  }
  buildTrain() {
    const raft=new THREE.Group();this.group.add(raft);this.cars=[raft];
    const tube=new THREE.Mesh(new THREE.TorusGeometry(.95,.3,12,36),colorMaterial(0xffd637));tube.rotation.x=Math.PI/2;tube.position.y=-1;raft.add(tube);
    rounded(raft,[0,-1.13,0],[1.3,.18,1.5],0xef498f,.08);
    for(const x of [-.8,.8])bar(raft,v(x,-.8,-.2),v(x,-.8,.3),.07,0x584097);
  }
  buildHUD() {
    super.buildHUD();this.hud.classList.add('water-park-hud');
    this.selector=document.createElement('div');this.selector.className='water-slide-options';
    WATER_SLIDES.forEach((slide,i)=>{const button=document.createElement('button');button.textContent=slide.name;button.title=slide.description;button.onclick=()=>{if(this.game.mode==='playing')this.selectSlide(i);};this.selector.append(button);});
    this.hud.insertBefore(this.selector,this.hud.querySelector('.coaster-stats'));
    this.description=document.createElement('span');this.hud.querySelector('.coaster-stats').append(this.description);
    this.view='front';this.viewButton.textContent='View: in the tube · C';
  }
  selectSlide(index) {
    if(this.ride.state==='riding')return;
    this.track=this.tracks[index];this.ride=new WaterSlideRide(this.track);this.ride.board();this.placeTrain();this.updateHUD();
  }
  board() {
    if(this.occupied)return;super.board();if(!this.occupied)return;
    this.game.player.model.position.set(0,-1,-.24);this.updateHUD();
    this.game.ui.toast('The rainbow lift brought you up! Choose a slide, then Start slide.');
  }
  toggleView() {super.toggleView();this.viewButton.textContent=`View: ${this.view==='front'?'in the tube':'outside raft'} · C`;}
  update(dt) {this.ride.gentle=this.game.calm;super.update(dt);}
  updateHUD() {
    super.updateHUD();if(!this.selector)return;
    [...this.selector.children].forEach((button,i)=>{button.disabled=this.ride.state==='riding';button.setAttribute('aria-pressed',String(i===this.track.index));});
    this.description.textContent=WATER_SLIDES[this.track.index].description;
    this.launchButton.textContent=this.ride.state==='arrived'?'Ride again · E':'Start slide · E';
    this.exitButton.textContent='Return to park';this.progress.textContent=this.ride.state==='arrived'?'Splashdown!':`${Math.round(this.ride.distance/this.track.length*100)}%`;
  }
  updateCamera(dt) {
    const g=this.game,s=this.track.sample(this.ride.distance),front=this.view==='front';
    if(front) {
      // Camera stays on the centerline inside the tube, including inversions.
      g.camera.position.copy(s.position);g.camera.up.copy(g.calm?v(0,1,0):s.up);
      const ahead=this.track.sample(Math.min(this.track.length,this.ride.distance+3)).position;
      if(ahead.distanceToSquared(s.position)<.01)ahead.copy(s.position).add(s.tangent);
      g.camera.lookAt(ahead);g.camera.fov=65;g.player.model.visible=false;
    } else {
      const up=g.calm?v(0,1,0):s.up;
      g.camera.position.copy(s.position).addScaledVector(s.tangent,-9).addScaledVector(up,6);g.camera.up.copy(up);g.camera.lookAt(s.position);g.camera.fov=58;g.player.model.visible=true;
    }
    g.camera.updateProjectionMatrix();
  }
  animateWater(dt) {
    if(this.game.area.id!=='town'||(!insideWaterPark(this.game.player.position)&&this.game.player.position.distanceTo(v(-169,0,-125))>230))return;
    this.time+=dt;this.waterTexture.offset.x=-this.time*(this.game.calm?.7:2.7);
    for(let i=0;i<this.foam.count;i++) {
      const track=this.tracks[i%3],d=(i*7.91+this.time*(this.game.calm?8:23))%track.length,s=track.sample(d);
      this.foamDummy.position.copy(s.position).addScaledVector(s.up,-2.05).addScaledVector(s.right,Math.sin(i*8)*.65);this.foamDummy.scale.set(.8,.6,2.6);this.foamDummy.quaternion.copy(s.rotation);this.foamDummy.updateMatrix();this.foam.setMatrixAt(i,this.foamDummy.matrix);
    }
    this.foam.instanceMatrix.needsUpdate=true;
    this.fountains.forEach((jet,i)=>jet.scale.y=1+Math.sin(this.time*2+i)*.12);
  }
}
