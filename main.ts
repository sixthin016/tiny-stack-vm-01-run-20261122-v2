// TinyStack VM interpreter (kit ISA program/v1); exit 0 halt, 2 underflow, 3 overflow, 4 div0, 5 bad op, 6 bad addr, 7 call ovf, 8 empty ret, 9 bad jump, 10 steps, 11 out.
import{mkdirSync,readdirSync,readFileSync,writeFileSync}from'node:fs';
import{join}from'node:path';
const I=process.env.MAKEFUN_INPUT_DIR??'/input',O=process.env.MAKEFUN_OUTPUT_DIR??'/output';
const L=new Uint8Array(256).fill(255),U=new Uint8Array(256),V=new Uint8Array(256);
function h(o,i,p,q){L[o]=i;U[o]=p;V[o]=q}
h(0,0,0,0);h(1,1,0,1);h(2,4,0,1);h(3,0,1,0);h(4,0,1,2);h(5,0,2,2);h(6,0,2,3);h(7,0,3,3);h(23,0,1,1);h(27,0,1,1);
for(const o of[16,17,18,19,20,21,22,24,25,26,28,29,30,32,33,34])h(o,0,2,1);
h(48,2,0,0);h(49,2,1,0);h(50,2,1,0);h(51,2,0,0);h(52,0,0,0);h(64,0,1,1);h(65,0,2,0);h(80,0,1,0);h(81,0,1,0);h(82,0,0,1);h(83,0,1,0);
function y(o,a,b){
if(o>18&&o<23){if(!b)return[0,4];if(o==19)return[a==-2147483648&&b==-1?a:(a/b)|0,0];if(o==20)return[b==-1?0:(a%b)|0,0];if(o==21)return[Math.floor((a>>>0)/(b>>>0))|0,0];return[((a>>>0)%(b>>>0))|0,0]}
if(o==16)return[(a+b)|0,0];if(o==17)return[(a-b)|0,0];if(o==18)return[Math.imul(a,b),0];if(o==24)return[a&b,0];if(o==25)return[a|b,0];if(o==26)return[a^b,0];if(o==28)return[a<<(b&31),0];if(o==29)return[a>>(b&31),0];if(o==30)return[(a>>>(b&31))|0,0];if(o==32)return[a==b?1:0,0];if(o==33)return[a<b?1:0,0];return[(a>>>0)<(b>>>0)?1:0,0]}
function d(b,v){let u=v<0?-v:v,t=12;do{b[--t]=48+u%10;u=(u/10)|0}while(u>0);if(v<0)b[--t]=45;return t}
function e(p,g){
const S=new Int32Array(256),C=new Int32Array(64),M=new Int32Array(256),T=new Uint8Array(65536),D=new Uint8Array(12);
let sp=0,cp=0,pc=0,st=0,ip=0,ol=0;
const f=c=>[T.subarray(0,ol),c];
for(;;){
if(st==1e6)return f(10);
if(pc<0||pc>=p.length)return f(9);
const o=p[pc],i=L[o];
if(i==255)return f(5);
if(pc+i>=p.length)return f(9);
st++;
const n=pc+1+i;pc=n;
if(sp<U[o])return f(2);
if(sp-U[o]+V[o]>256)return f(3);
if(!o)return f(0);
if(o==1){S[sp++]=(p[n-1]<<24)>>24;continue}
if(o==2){S[sp++]=p[n-4]|(p[n-3]<<8)|(p[n-2]<<16)|(p[n-1]<<24);continue}
if(o==3){sp--;continue}
if(o==4){S[sp]=S[sp-1];sp++;continue}
if(o==5){const t=S[sp-1];S[sp-1]=S[sp-2];S[sp-2]=t;continue}
if(o==6){S[sp]=S[sp-2];sp++;continue}
if(o==7){const a=S[sp-3];S[sp-3]=S[sp-2];S[sp-2]=S[sp-1];S[sp-1]=a;continue}
if(o==23){S[sp-1]=-S[sp-1]|0;continue}
if(o==27){S[sp-1]=~S[sp-1];continue}
if(o>=16&&o<=34){const[r,t]=y(o,S[sp-2],S[sp-1]);if(t)return f(t);sp-=2;S[sp++]=r;continue}
if(o>=48&&o<=50){const q=((p[n-2]|(p[n-1]<<8))<<16)>>16;let k=o==48;if(!k){const v=S[--sp];k=o==49?v==0:v!=0}if(k)pc=n+q;continue}
if(o==51){if(cp==64)return f(7);C[cp++]=n;pc=p[n-2]|(p[n-1]<<8);continue}
if(o==52){if(!cp)return f(8);pc=C[--cp];continue}
if(o==64){const a=S[sp-1];if(a<0||a>=256)return f(6);S[sp-1]=M[a];continue}
if(o==65){const a=S[sp-1],v=S[sp-2];if(a<0||a>=256)return f(6);sp-=2;M[a]=v;continue}
if(o==80){const v=S[--sp],t=d(D,v),l=12-t;if(ol+l>65536)return f(11);T.set(D.subarray(t),ol);ol+=l;continue}
if(o==81){if(ol+1>65536)return f(11);T[ol++]=S[--sp]&255;continue}
if(o==82){S[sp++]=ip<g.length?g[ip++]:-1;continue}
return f(S[--sp]&255)}}
for(const id of readdirSync(I).sort()){const[o,c]=e(new Uint8Array(readFileSync(join(I,id,'program.bin'))),new Uint8Array(readFileSync(join(I,id,'input.bin'))));mkdirSync(join(O,id),{recursive:true});writeFileSync(join(O,id,'stdout.bin'),o);writeFileSync(join(O,id,'exit.txt'),c+'\n')}
