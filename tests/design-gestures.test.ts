import {it,expect} from 'vitest';
import {gestureLayer,coverImage} from '../shared/design-gestures';
import {createDesign} from '../shared/marketing-design';
const design=createDesign({brand:'A',headline:'B',subtitle:'',badge:'',cta:'',photo:''});
it('clamps dragged layers and snaps centres',()=>{const l={...design.layers[0],width:200,height:100};expect(gestureLayer(l,design,-9999,-9999,'move')).toMatchObject({x:0,y:0});const centred=gestureLayer({...l,x:0,y:0},design,443,490,'move');expect(centred.x).toBe(440);expect(centred.y).toBe(490);});
it('keeps resized layers within the canvas',()=>{const l=design.layers[0];const next=gestureLayer(l,design,9999,9999,'resize');expect(next.x+next.width).toBe(design.width);expect(next.y+next.height).toBe(design.height);});
it('matches CSS cover crop positions',()=>{expect(coverImage({width:100,height:100},{width:200,height:100},100,50)).toEqual({width:200,height:100,left:-100,top:0});});
