// Deterministic web/native exports from the shared lowercase-b vector master.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '../..');
const green = '#009F50';
const mark = '<path fill="currentColor" fill-rule="evenodd" d="M12 13a7 7 0 0 1 14 0v16.75A28 28 0 1 1 12 54V13Zm28 27a14 14 0 1 0 0 28 14 14 0 0 0 0-28Z"/>';
const svg = (body, viewBox='0 0 80 88', color=green) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" color="${color}">${body}</svg>`;
const standalone = svg(mark);
const square = (background, color, scale=9, offset=152) => svg(`<rect width="1024" height="1024" fill="${background}"/><g transform="translate(${offset} 116) scale(${scale})">${mark}</g>`, '0 0 1024 1024', color);
async function png(source, file, size) { await sharp(Buffer.from(source)).resize(size,size,{fit:'contain',background:'#00000000'}).png().toFile(path.join(root,file)); }
(async()=>{
 const web='public/bgos';
 await fs.writeFile(path.join(root,web,'icon.svg'), standalone);
 for(const [file,ink] of [['logo.svg','#070B2D'],['logo-dark.svg','#FFFFFF']]) {
  await fs.writeFile(path.join(root,web,file), svg(`${mark}<text x="91" y="65" fill="${ink}" font-family="Inter,Arial,sans-serif" font-size="56" font-weight="800" letter-spacing="-3">bgos</text>`,'0 0 240 88'));
 }
 await png(standalone,`${web}/brand-mark.png`,256);
 // Retain legacy public URL so cached references never show an outdated mark.
 await png(standalone,`${web}/teal-mark.png`,256);
 await png(square('#FFFFFF',green),`${web}/apple-touch-icon.png`,180);
 await png(square(green,'#FFFFFF'),`${web}/icon-192.png`,192);
 await png(square(green,'#FFFFFF'),`${web}/icon-512.png`,512);
 await png(square(green,'#FFFFFF',7,232),`${web}/icon-maskable-512.png`,512);
 await png(standalone,'bgosmobile/assets/brand-mark.png',256);
 await png(svg(mark,'0 0 80 88','#FFFFFF'),'bgosmobile/assets/brand-mark-light.png',256);
 await png(square(green,'#FFFFFF'),'bgosmobile/assets/app-icon.png',1024);
 const adaptive=svg(`<g transform="translate(232 204) scale(7)">${mark}</g>`,'0 0 1024 1024','#FFFFFF');
 await png(adaptive,'bgosmobile/assets/adaptive-icon.png',1024);
 for(const file of ['icon.svg','logo.svg','logo-dark.svg','brand-mark.png','teal-mark.png','apple-touch-icon.png','icon-192.png','icon-512.png','icon-maskable-512.png']) await fs.copyFile(path.join(root,web,file),path.join(root,'apps/bgos/public/bgos',file));
 console.log('Generated matching BGOS web and native brand assets.');
})();
