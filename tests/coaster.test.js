import test from 'node:test';
import assert from 'node:assert/strict';
import {createCoasterTrack,CoasterRide,COASTER_STATION} from '../shared/world/coaster-track.js';
const track=createCoasterTrack();
test('coaster is a long smooth closed circuit anchored to the northeast station',()=>{
  assert.ok(track.length>400);
  assert.ok(track.points[0].distanceTo(track.points.at(-1))<.001);
  assert.ok(track.rotations[0].angleTo(track.rotations.at(-1))<.01);
  assert.equal(track.points[0].x,COASTER_STATION.x);
  assert.ok(Math.max(...track.points.map(p=>p.y))>32);
  assert.ok(Math.min(...track.points.map(p=>p.y))>.7);
  assert.ok(track.points.every(p=>Math.abs(p.x)<90 && Math.abs(p.z)<90));
  let entries=0, inverted=false;
  for(let i=0;i<track.count;i++) {
    const next=track.ups[i].y<-.5;
    if(next&&!inverted)entries++;
    inverted=next;
    assert.ok(track.rotations[i].angleTo(track.rotations[i+1])<.2,'abrupt track rotation');
  }
  assert.equal(entries,2);
});
test('board, explicit launch, gravity speed, brake, exact station return, repeat',()=>{
  const ride=new CoasterRide(track);
  assert.equal(ride.launch(),false);
  assert.equal(ride.board(),true);ride.update(1);assert.equal(ride.distance,0);
  assert.equal(ride.launch(),true);
  let maxSpeed=0,ticks=0;
  while(ride.state==='riding'&&ticks++<18000){ride.update(1/60);maxSpeed=Math.max(maxSpeed,ride.speed);}
  assert.equal(ride.state,'arrived');assert.equal(ride.distance,0);assert.equal(ride.speed,0);
  assert.ok(maxSpeed>25);assert.ok(ride.elapsed>35 && ride.elapsed<130);
  console.log(`Track ${track.length.toFixed(1)} m; ride ${ride.elapsed.toFixed(1)} s; peak ${(maxSpeed*3.6).toFixed(1)} km/h`);
  ride.reset();assert.equal(ride.board(),true);assert.equal(ride.launch(),true);
});
