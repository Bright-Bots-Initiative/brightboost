var ne=Object.defineProperty,ie=Object.defineProperties;
var ae=Object.getOwnPropertyDescriptors;
var D=Object.getOwnPropertySymbols;
var J=Object.prototype.hasOwnProperty, G=Object.prototype.propertyIsEnumerable;
var M=(i,e,t)=>e in i?ne(i,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):i[e]=t,
    v=(i,e)=>{for(var t in e||(e={}))J.call(e,t)&&M(i,t,e[t]);if(D)for(var t of D(e))G.call(e,t)&&M(i,t,e[t]);return i},
    Y=(i,e)=>ie(i,ae(e)),
    X=(i,e)=>{var t={};for(var r in i)J.call(i,r)&&e.indexOf(r)<0&&(t[r]=i[r]);if(i!=null&&D)for(var r of D(i))e.indexOf(r)<0&&G.call(i,r)&&(t[r]=i[r]);return t};

// Import the vendor bundle (absolute path for safety)
import { S as oe, i as le, s as ce, e as fe, c as ue, a as he, d as $, b as B, f as R, t as de, g as _e, h as pe, j as me, k as g, l as ge, m as N, n as w, o as P, p as b, q as we, r as be, u as ve, v as S, w as T, x as L, y as j, z as C, A as U, B as O, C as K, D as F } from "/qubitgame/scripts/vendor-8e2b44e1.js";

// Import your index Svelte component directly
import Index from "/qubitgame/scripts/pages/index.svelte-8f33aba2.js";

// Mount the Svelte app into the #svelte container
const app = new Index({
  target: document.querySelector('#svelte'),
  hydrate: true
});

// Expose app globally if needed
window.app = app;
