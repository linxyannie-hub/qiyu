import {mkdir,rm,cp} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});await cp('index.html','dist/index.html');await cp('assets','dist/assets',{recursive:true});console.log('静态发布文件已生成：dist/');
