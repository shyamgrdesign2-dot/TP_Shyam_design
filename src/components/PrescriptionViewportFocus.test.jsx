import { fireEvent } from '@testing-library/react';
import { installPrescriptionViewportFocus, revealPrescriptionField, viewportCorrection } from './PrescriptionViewportFocus';

const rect = (left, top, width, height) => ({left,top,right:left+width,bottom:top+height,width,height});
function fixture({top=500,left=20,horizontal=false}={}) {
  const container=document.createElement('div');
  container.style.overflowY=horizontal?'hidden':'auto';
  container.style.overflowX=horizontal?'auto':'hidden';
  if(horizontal) container.className='tesseract-ct';
  Object.defineProperties(container,{clientHeight:{value:700},scrollHeight:{value:horizontal?700:2000},clientWidth:{value:500},scrollWidth:{value:horizontal?1200:500}});
  container.getBoundingClientRect=()=>rect(0,0,500,700);
  container.scrollBy=jest.fn(({top:y,left:x})=>{container.scrollTop+=y;container.scrollLeft+=x;});
  const field=document.createElement('input');
  field.getClientRects=()=>[field.getBoundingClientRect()];
  field.getBoundingClientRect=()=>rect(left-container.scrollLeft,top-container.scrollTop,160,42);
  container.append(field);document.body.append(container);
  return {container,field};
}
afterEach(()=>{document.body.innerHTML='';jest.useRealTimers();jest.restoreAllMocks();});

test('leaves a visible desktop field in place',()=>{
  const {field,container}=fixture({top:200});
  revealPrescriptionField(field,{height:800,width:1200,offsetTop:0,offsetLeft:0});
  expect(container.scrollBy).not.toHaveBeenCalled();
});

test.each([[768,430,0],[1024,340,0],[768,430,80]])('keeps the focused field above an iPad keyboard: width=%s height=%s offset=%s',(width,height,offsetTop)=>{
  const {field,container}=fixture();field.focus();
  revealPrescriptionField(field,{width,height,offsetTop,offsetLeft:0});
  expect(field.getBoundingClientRect().bottom).toBeLessThanOrEqual(offsetTop+height-12);
  expect(field).toHaveFocus();
  const calls=container.scrollBy.mock.calls.length;
  revealPrescriptionField(field,{width,height,offsetTop,offsetLeft:0});
  expect(container.scrollBy).toHaveBeenCalledTimes(calls);
});

test('reveals horizontal fields without placing them under the pinned delete cell',()=>{
  const {field,container}=fixture({top:100,left:700,horizontal:true});
  const pinned=document.createElement('div');pinned.className='tesseract-ct-sticky-action';pinned.getBoundingClientRect=()=>rect(452,0,48,42);container.append(pinned);
  revealPrescriptionField(field,{width:768,height:700});
  expect(field.getBoundingClientRect().right).toBe(440);
  expect(container.scrollTop).toBe(0);
});

test('disabled fields do not move the viewport',()=>{
  const {field,container}=fixture();field.disabled=true;
  revealPrescriptionField(field,{width:768,height:300});
  expect(container.scrollBy).not.toHaveBeenCalled();
});

test('resize after focus reveals the field and route cleanup removes keyboard listeners',()=>{
  jest.useFakeTimers();
  jest.spyOn(window,'requestAnimationFrame').mockImplementation(callback=>setTimeout(callback,16));
  jest.spyOn(window,'cancelAnimationFrame').mockImplementation(id=>clearTimeout(id));
  const viewport=new EventTarget();Object.assign(viewport,{width:768,height:800,offsetTop:0,offsetLeft:0});
  const {field,container}=fixture();
  const cleanup=installPrescriptionViewportFocus(viewport);
  field.focus();jest.advanceTimersByTime(20);
  expect(container.scrollBy).not.toHaveBeenCalled();
  viewport.height=350;fireEvent(viewport,new Event('resize'));jest.advanceTimersByTime(20);
  expect(field.getBoundingClientRect().bottom).toBeLessThanOrEqual(338);
  cleanup();const calls=container.scrollBy.mock.calls.length;
  viewport.height=150;fireEvent(viewport,new Event('resize'));jest.advanceTimersByTime(500);
  expect(container.scrollBy).toHaveBeenCalledTimes(calls);
});

test('oversized fields align their start and already visible fields need no correction',()=>{
  expect(viewportCorrection(30,800,60,300)).toBe(-30);
  expect(viewportCorrection(100,142,60,300)).toBe(0);
});
