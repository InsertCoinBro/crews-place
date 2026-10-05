import test from 'node:test';
import assert from 'node:assert/strict';
import { createWaterSlide, WaterSlideRide, WATER_SLIDES, WATER_PARK_BOUNDS } from '../shared/world/water-park-track.js';
const tracks=WATER_SLIDES.map((_,i)=>createWaterSlide(i));
for(const [index,track] of tracks.entries()) {
  test(`${WATER_SLIDES[index].name}: northwest bounds, height, frame continuity and safe splashdown`,()=>{
    assert.equal(track.points[0].y,WATER_SLIDES[index].height);
    for(let i=0;i<=track.count;i++) {
      const p=track.points[i];assert(p.toArray().every(Number.isFinite));
      assert(p.x>WATER_PARK_BOUNDS.minX+2.4&&p.x<WATER_PARK_BOUNDS.maxX-2.4);
      assert(p.z>WATER_PARK_BOUNDS.minZ+2.4&&p.z<WATER_PARK_BOUNDS.maxZ-2.4);
      assert(p.y>=2.3);
      if(i)assert(track.rotations[i].angleTo(track.rotations[i-1])<.25,'abrupt frame');
    }
    assert(track.sample(-10).position.equals(track.points[0]));
    assert(track.sample(track.length+10).position.equals(track.points.at(-1)));
  });
  test(`${WATER_SLIDES[index].name}: finishes at 30/60/120 fps, waits, replays, resets`,()=>{
    const times=[];
    for(const fps of [30,60,120]) {
      const ride=new WaterSlideRide(track);ride.board();ride.update(2);assert.equal(ride.distance,0);ride.launch();
      let budget=fps*150;while(ride.state==='riding'&&budget--)ride.update(1/fps);
      assert.equal(ride.state,'arrived');assert.equal(ride.distance,track.length);assert.equal(ride.speed,0);times.push(ride.elapsed);
      ride.reset();assert.equal(ride.state,'waiting');assert.equal(ride.distance,0);
    }
    assert(Math.max(...times)-Math.min(...times)<.04);
  });
}
test('Skyloop really inverts and gentle mode reduces speed',()=>{
  assert(tracks[0].ups.some(up=>up.y<-.8));
  const fast=new WaterSlideRide(tracks[0]),gentle=new WaterSlideRide(tracks[0]);
  gentle.gentle=true;for(const r of [fast,gentle]){r.board();r.launch();for(let i=0;i<600;i++)r.update(1/60);}
  assert(gentle.distance<fast.distance*.8);
});
test('Slides stay separated and arrive upright in their own runouts',()=>{
  for(let a=0;a<3;a++) {
    assert(tracks[a].ups.at(-1).y>.99);
    for(let b=a+1;b<3;b++) {
      const endGap=tracks[a].points.at(-1).distanceTo(tracks[b].points.at(-1));
      assert(endGap>4,`slides ${a}/${b} share a runout`);
    }
  }
});
