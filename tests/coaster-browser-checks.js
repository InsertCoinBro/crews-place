import {COASTER_EXIT} from '../shared/world/coaster-track.js';
export function runCoasterChecks(game) {
  const results=[];
  const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
  const check=(name,fn)=>{try{fn();results.push('PASS · '+name);}catch(e){results.push('FAIL · '+name+': '+e.message);console.error(e);}};
  const key=code=>{window.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true}));game.tick(1/60);window.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));};
  const frames=n=>{for(let i=0;i<n;i++)game.tick(1/60);};
  game.start();game.player.teleport(COASTER_EXIT.x,COASTER_EXIT.z);game.follow.reset(0);frames(60);
  const c=game.coaster;
  check('E at the observed meadow station boards the visible cowboy',()=>{
    key('KeyE');assert(c.ride.state==='seated','did not board: '+JSON.stringify({mode:game.mode,state:c.ride.state,near:game.interactions.current?.id,pos:game.player.position.toArray(),cooldown:game.interactionCooldown,enabled:game.input.enabled}));assert(game.player.model.parent===c.cars[0],'rider not attached');assert(game.player.model.visible,'rider invisible');assert(!c.hud.hidden,'controls hidden');
  });
  check('Boarding waits for a separate launch interaction',()=>{frames(90);assert(c.ride.distance===0,'left without launch');});
  check('Launch button starts the ride and locks walking/jumping',()=>{
    c.launchButton.click();frames(30);assert(c.ride.state==='riding'&&c.ride.distance>0,'did not launch');key('Space');key('KeyW');assert(game.player.position.distanceTo(c.cars[0].position)<.01,'escaped cart');
  });
  check('Pause freezes the ride and resume continues',()=>{
    game.pause();const d=c.ride.distance;frames(90);assert(c.ride.distance===d,'moved while paused');game.resume();frames(30);assert(c.ride.distance>d,'did not resume');
  });
  check('Camera toggle supports a visible front-seat view',()=>{key('KeyC');assert(c.view==='front','no front view');assert(!game.player.model.visible,'head blocks front view');key('KeyC');assert(game.player.model.visible,'follow rider hidden');});
  check('Full ride traverses both loops, reaches high speed, and returns to the exact station',()=>{
    let loops=0,was=false,max=0,limit=9000;
    while(c.ride.state==='riding'&&limit--){game.tick(1/60);const inv=c.track.sample(c.ride.distance).up.y<-.5;if(inv&&!was)loops++;was=inv;max=Math.max(max,c.ride.speed);}
    assert(loops===2,'expected two inversions, got '+loops);assert(max>25,'fast section missing');assert(c.ride.state==='arrived','failed to return');assert(c.cars[0].position.distanceTo(c.track.points[0])<.001,'missed station');assert(c.ride.speed===0,'not stopped');
  });
  check('Ride again and early return leave the player safely on the platform',()=>{key('KeyE');frames(120);c.exitButton.click();assert(c.ride.state==='waiting','ride not reset');assert(!game.player.inVehicle,'vehicle flag leaked');assert(game.player.model.parent===game.scene,'rider parent not restored');assert(game.player.position.x===COASTER_EXIT.x&&game.player.position.z===COASTER_EXIT.z,'wrong exit');});
  check('Both characters can board and character change restores the scene',()=>{
    game.pause();game.setCharacter('jolly_robot');game.resume();frames(45);key('KeyE');assert(c.occupied,'robot did not board');game.pause();game.setCharacter('cowboy');assert(!c.occupied,'character switch retained ride');assert(game.player.model.parent===game.scene,'new character not in scene');game.resume();
  });
  check('Calm camera, render, finite transforms, and graphics health',()=>{
    frames(45);key('KeyE');game.calm=true;c.launchButton.click();frames(180);assert(game.camera.up.y===1,'calm camera rolls');game.renderer.render(game.scene,game.camera);assert(game.renderer.info.render.triangles>10000,'park not rendered');assert(game.renderer.getContext().getError()===0,'WebGL error');assert(game.camera.position.toArray().every(Number.isFinite),'invalid camera');c.exit();game.calm=false;
  });
  const panel=document.createElement('section');panel.id='coaster-test-results';panel.style.cssText='position:absolute;left:16px;top:185px;z-index:30;max-width:650px;max-height:52vh;overflow:auto;padding:16px;border-radius:14px;background:#fffaf0ed;color:#194f69;font:12px/1.55 monospace';
  const title=document.createElement('strong');title.textContent=`${results.filter(r=>r.startsWith('PASS')).length}/${results.length} coaster browser checks passed`;panel.append(title);
  for(const result of results){const el=document.createElement('div');el.textContent=result;panel.append(el);}
  for(const [name,fn] of [
    ['Park overview',()=>{game.mode='paused';game.camera.up.set(0,1,0);game.camera.position.set(98,77,-2);game.camera.lookAt(23,6,-61);panel.hidden=true;}],
    ['First loop view',()=>{c.board();c.ride.state='riding';c.ride.distance=170;c.placeTrain();c.updateCamera(1);game.mode='paused';game.camera.position.set(23,18,-44);game.camera.up.set(0,1,0);game.camera.lookAt(0,12,-76);panel.hidden=true;}],
    ['Station view',()=>{if(c.occupied)c.exit();game.setMode('playing');game.player.teleport(COASTER_EXIT.x,COASTER_EXIT.z+9);game.follow.reset(0);panel.hidden=true;}]
  ]){const b=document.createElement('button');b.textContent=name;b.onclick=fn;panel.append(b);}
  document.body.append(panel);game.player.teleport(COASTER_EXIT.x,COASTER_EXIT.z+9);game.follow.reset(0);
}
