import { WATER_PARK_EXIT } from '../shared/world/water-park-track.js';
export function addWaterParkChecks(game) {
  const button=document.createElement('button');button.textContent='Run water park checks';button.style.cssText='position:absolute;top:100px;left:20px;z-index:100;padding:16px';document.body.append(button);
  button.onclick=()=>{
    button.remove();const results=[],park=game.waterPark;
    const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
    const check=(name,fn)=>{try{fn();results.push('PASS · '+name);}catch(e){results.push('FAIL · '+name+': '+e.message);console.error(e);}};
    const frames=n=>{for(let i=0;i<n;i++)game.tick(1/60);};
    const key=code=>{window.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true}));game.tick(1/60);window.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));};
    game.start();game.player.teleport(WATER_PARK_EXIT.x,WATER_PARK_EXIT.z);frames(45);
    check('Entrance boards with E and waits for an explicit start',()=>{key('KeyE');frames(20);assert(park.ride.state==='seated','not seated');assert(park.ride.distance===0,'auto start');assert(game.player.model.parent===park.cars[0],'raft missing rider');});
    check('All three slides finish, replay and return to the park',()=>{
      for(let index=0;index<3;index++) {
        park.selector.children[index].click();assert(park.track.index===index,'wrong slide');park.launchButton.click();
        let budget=8000;while(park.ride.state==='riding'&&budget--)park.update(1/60);
        assert(park.ride.state==='arrived','never arrived');assert(park.cars[0].position.distanceTo(park.track.points.at(-1))<.001,'missed pool');
        park.launchButton.click();assert(park.ride.distance===0&&park.ride.state==='riding','replay failed');
        park.exitButton.click();assert(!game.player.inVehicle&&game.player.model.parent===game.scene,'exit cleanup');assert(game.player.position.x===WATER_PARK_EXIT.x&&game.player.position.z===WATER_PARK_EXIT.z,'wrong return');park.board();
      }
    });
    check('Pause freezes ride and flowing water; resume continues',()=>{park.launch();frames(30);game.pause();const d=park.ride.distance,t=park.time;frames(30);assert(park.ride.distance===d&&park.time===t,'pause moved');game.resume();frames(30);assert(park.ride.distance>d&&park.time>t,'resume stuck');});
    check('Tube camera, outside view and gentle mode render cleanly',()=>{
      for(let index=0;index<3;index++) {
        park.exit();park.board();park.selectSlide(index);
        for(const fraction of [.1,.3,.5,.8,1])for(const gentle of [false,true]) {
          park.ride.distance=park.track.length*fraction;park.placeTrain();game.calm=gentle;
          for(const view of ['front','follow']) {park.view=view;park.updateCamera(1/60);assert(game.camera.position.toArray().every(Number.isFinite),'camera invalid');if(gentle)assert(game.camera.up.y===1,'gentle camera rolls');game.renderer.render(game.scene,game.camera);assert(game.renderer.getContext().getError()===0,'WebGL error');}
        }
      }
      game.calm=false;
    });
    check('Every avatar attaches and exits; character switch cleans up',()=>{park.exit();const original=game.player.model.userData.avatarId;for(const avatar of game.characters.keys()){game.pause();game.setCharacter(avatar);game.resume();park.board();assert(park.occupied&&game.player.model.parent===park.cars[0],'avatar attach');park.launch();park.update(1);park.exit();assert(!game.player.inVehicle,'avatar locked');}game.pause();game.setCharacter(original);game.resume();});
    check('Animated flow advances and controls fit the viewport',()=>{const offset=park.waterTexture.offset.x;park.animateWater(.1);assert(offset!==park.waterTexture.offset.x,'water static');park.board();const r=park.hud.getBoundingClientRect();assert(r.left>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight,'HUD overflow');assert([...park.hud.querySelectorAll('button')].every(b=>b.getBoundingClientRect().height>=44),'small touch target');park.exit();});
    game.player.teleport(WATER_PARK_EXIT.x,WATER_PARK_EXIT.z+7);game.follow.reset(0);frames(10);
    const panel=document.createElement('section');panel.id='water-park-test-results';panel.style.cssText='position:absolute;top:150px;left:12px;right:12px;z-index:60;padding:16px;background:#30204eee;color:white;max-height:55vh;overflow:auto';
    const title=document.createElement('strong');title.textContent=`${results.filter(s=>s.startsWith('PASS')).length}/${results.length} water park browser checks passed`;panel.append(title);
    results.forEach(result=>{const row=document.createElement('div');row.textContent=result;panel.append(row);});
    for(const [text,fn] of [['Inspect park panorama',()=>{game.setMode('paused');game.camera.position.set(-83,62,-21);game.camera.up.set(0,1,0);game.camera.lookAt(-175,28,-126);game.renderer.render(game.scene,game.camera);}],['Inspect tube view',()=>{game.setMode('playing');park.board();park.selectSlide(0);park.ride.distance=50;park.placeTrain();park.view='front';park.updateCamera(1/60);game.setMode('paused');game.renderer.render(game.scene,game.camera);}],['Explore park',()=>{game.setMode('playing');if(park.occupied)park.exit();game.player.teleport(WATER_PARK_EXIT.x,WATER_PARK_EXIT.z+4);game.follow.reset(0);}]]) {const b=document.createElement('button');b.textContent=text;b.onclick=()=>{panel.hidden=true;fn();};panel.append(b);}
    document.body.append(panel);
  };
}
