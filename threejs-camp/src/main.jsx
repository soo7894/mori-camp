import React, { Suspense, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Float, Html, OrthographicCamera, PerspectiveCamera, RoundedBox, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import {
  Backpack, Bell, Coffee, Footprints, Hammer, Heart, Leaf, LockKeyhole, LogIn, MessageCircle,
  Moon, Plus, Send, Settings, ShoppingBag, Sparkles as SparklesIcon, Sun, UserRound,
  TentTree, Trees, Users, UtensilsCrossed, Volume2, VolumeX, X
} from 'lucide-react';
import './styles.css';

const activities = [
  { id: 'tent', label: '텐트 치기', icon: TentTree, reward: 24, color: '#e98254' },
  { id: 'fire', label: '불멍하기', icon: SparklesIcon, reward: 18, color: '#e96245' },
  { id: 'meal', label: '캠핑 요리', icon: UtensilsCrossed, reward: 32, color: '#d9973f' },
  { id: 'coffee', label: '커피 내리기', icon: Coffee, reward: 16, color: '#9e6b4e' },
  { id: 'walk', label: '숲길 산책', icon: Footprints, reward: 26, color: '#63945a' },
  { id: 'garden', label: '꽃밭 가꾸기', icon: Leaf, reward: 22, color: '#79a44f' },
];

const buildItems = [
  { id: 'tent', name: '살구빛 텐트', icon: '⛺', price: 120 },
  { id: 'chair', name: '통나무 의자', icon: '🪑', price: 45 },
  { id: 'lamp', name: '숲속 랜턴', icon: '🏮', price: 65 },
  { id: 'flower', name: '들꽃 화단', icon: '🌼', price: 35 },
];

const mat = {
  grass: '#789b45', grassLight: '#8cac54', dirt: '#b4783e', soil: '#9a6037',
  wood: '#a86f38', woodDark: '#734526', cream: '#f4d7a2', roof: '#d96845',
  roofLight: '#e77b56', water: '#47aeb3', stone: '#d8caa6', leaf: '#477c39',
};

function ResponsiveCamera() {
  const { size } = useThree();
  const camera = useRef();
  useFrame(() => {
    if (!camera.current) return;
    const target = size.width < 700 ? 35 : size.width < 1100 ? 46 : 58;
    if (camera.current.zoom !== target) { camera.current.zoom = target; camera.current.updateProjectionMatrix(); }
  });
  return <OrthographicCamera ref={camera} makeDefault position={[0, 18, 22]} zoom={58} near={0.1} far={100} onUpdate={(c) => c.lookAt(0, 0, 0)} />;
}

function TerrainBlock({ position, size, color = mat.grass, radius = .45, top = true }) {
  return <group position={position}>
    <RoundedBox args={[size[0], size[1], size[2]]} radius={radius} smoothness={4} castShadow receiveShadow>
      <meshStandardMaterial color={mat.dirt} roughness={.82} />
    </RoundedBox>
    {top && <RoundedBox position={[0, size[1] / 2 + .05, 0]} args={[size[0] - .08, .18, size[2] - .08]} radius={radius} smoothness={4} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={.92} />
    </RoundedBox>}
  </group>;
}

function River() {
  const ripples = [[-7.3,-3.8],[7.2,-4.5],[-6.8,4.2],[6.6,5.2]];
  return <group>
    <mesh position={[0,-1.05,0]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <planeGeometry args={[40,32]} />
      <meshStandardMaterial color={mat.water} roughness={.25} metalness={.05} />
    </mesh>
    {ripples.map((p,i)=><group key={i} position={[p[0],-.98,p[1]]} rotation={[-Math.PI/2,0,0]}>
      <mesh><torusGeometry args={[.46,.035,8,28,Math.PI*1.3]} /><meshBasicMaterial color="#9de2d4" transparent opacity={.6}/></mesh>
      <mesh position={[.55,.12,.01]}><torusGeometry args={[.24,.025,8,20,Math.PI]} /><meshBasicMaterial color="#9de2d4" transparent opacity={.45}/></mesh>
    </group>)}
    {[[-7.8,-2.6],[-7.3,-2],[7.4,3.8],[7.8,4.5]].map((p,i)=><LilyPad key={i} position={[p[0],-.94,p[1]]} flower={i===1}/>) }
  </group>;
}

function LilyPad({ position, flower=false }) {
  return <group position={position}>
    <mesh rotation={[-Math.PI/2,0,.4]} castShadow><circleGeometry args={[.42,18,0,Math.PI*1.82]} /><meshStandardMaterial color="#6d9c4d" roughness={.8}/></mesh>
    {flower && <Flower position={[0,.08,0]} scale={.55}/>}
  </group>;
}

function ToyTree({ position, scale=1, tone=0 }) {
  const shades = ['#4c823e','#568d43','#417536'];
  return <group position={position} scale={scale}>
    <mesh position={[0,.8,0]} castShadow><cylinderGeometry args={[.28,.38,1.6,10]} /><meshStandardMaterial color="#81502d" roughness={.86}/></mesh>
    <RoundedBox position={[0,2.15,0]} args={[1.5,2.5,1.35]} radius={.48} smoothness={5} castShadow receiveShadow>
      <meshStandardMaterial color={shades[tone%3]} roughness={.86}/>
    </RoundedBox>
    {[-.48,0,.48].map((x,i)=><mesh key={i} position={[x,1.25,.28]} castShadow><sphereGeometry args={[.48,14,10]} /><meshStandardMaterial color={shades[tone%3]} roughness={.9}/></mesh>)}
    <mesh position={[-.34,2.65,.68]} castShadow><sphereGeometry args={[.18,10,8]} /><meshStandardMaterial color="#6ca04c"/></mesh>
  </group>;
}

function Bush({ position, scale=1, color='#5f8e3b' }) {
  return <group position={position} scale={scale}>
    {[-.34,0,.34].map((x,i)=><mesh key={i} position={[x,.2+(i%2)*.12,0]} castShadow><sphereGeometry args={[.34+(i%2)*.06,12,9]} /><meshStandardMaterial color={color} roughness={.9}/></mesh>)}
  </group>;
}

function Flower({ position, color='#fff0bd', scale=1 }) {
  return <group position={position} scale={scale}>
    <mesh position={[0,.28,0]}><cylinderGeometry args={[.025,.025,.55,6]} /><meshStandardMaterial color="#4e863f"/></mesh>
    {[0,1,2,3,4].map(i=><mesh key={i} position={[Math.cos(i*Math.PI*2/5)*.2,.58,Math.sin(i*Math.PI*2/5)*.2]} castShadow><sphereGeometry args={[.16,10,8]}/><meshStandardMaterial color={color}/></mesh>)}
    <mesh position={[0,.59,0]} castShadow><sphereGeometry args={[.12,10,8]}/><meshStandardMaterial color="#e0a440"/></mesh>
  </group>;
}

function Lamp({ position, tall=true }) {
  return <group position={position}>
    <mesh position={[0,tall?.75:.45,0]} castShadow><cylinderGeometry args={[.12,.18,tall?1.5:.9,12]}/><meshStandardMaterial color={mat.wood}/></mesh>
    <mesh position={[0,tall?1.48:.88,0]} castShadow><cylinderGeometry args={[.24,.32,.42,10]}/><meshStandardMaterial color="#6d4c2f"/></mesh>
    <mesh position={[0,tall?1.5:.9,0]}><cylinderGeometry args={[.17,.22,.3,10]}/><meshStandardMaterial color="#ffe495" emissive="#ffc85b" emissiveIntensity={1.2}/></mesh>
    <mesh position={[0,tall?1.75:1.14,0]} castShadow><cylinderGeometry args={[.28,.22,.12,10]}/><meshStandardMaterial color={mat.woodDark}/></mesh>
    <pointLight position={[0,tall?1.5:.9,0]} color="#ffd77e" intensity={.65} distance={3.5}/>
  </group>;
}

function Fence({ from=[0,0,0], length=3, rotation=0 }) {
  const posts = Array.from({length:Math.floor(length)+1},(_,i)=>i-length/2);
  return <group position={from} rotation={[0,rotation,0]}>
    {posts.map((x,i)=><group key={i} position={[x,0,0]}><mesh position={[0,.55,0]} castShadow><cylinderGeometry args={[.11,.14,1.1,10]}/><meshStandardMaterial color={mat.wood}/></mesh><mesh position={[0,1.08,0]}><sphereGeometry args={[.14,10,8]}/><meshStandardMaterial color="#c88d4f"/></mesh></group>)}
    <mesh position={[0,.68,0]} castShadow><boxGeometry args={[length,.09,.09]}/><meshStandardMaterial color="#b67d42"/></mesh>
  </group>;
}

function Cottage() {
  const tileRows = useMemo(()=>Array.from({length:18},(_,i)=>({x:(i%6-2.5)*.88,z:Math.floor(i/6)*.67})),[]);
  const gableShape = useMemo(()=>{const s=new THREE.Shape();s.moveTo(-2.15,0);s.lineTo(2.15,0);s.lineTo(0,1.85);s.closePath();return s},[]);
  return <group position={[0,.05,-1.55]}>
    <RoundedBox position={[0,1.55,0]} args={[6.3,3,3.8]} radius={.28} smoothness={4} castShadow receiveShadow>
      <meshStandardMaterial color="#edcf98" roughness={.86}/>
    </RoundedBox>
    <RoundedBox position={[0,.32,1.86]} args={[6.55,.65,.35]} radius={.13} smoothness={4} castShadow><meshStandardMaterial color="#a76b3d"/></RoundedBox>
    {[-2.7,-1.8,-.9,0,.9,1.8,2.7].map((x,i)=><RoundedBox key={i} position={[x,.3,2.08]} args={[.78,.55,.28]} radius={.08} smoothness={3}><meshStandardMaterial color={i%2?'#b67b49':'#a66b40'}/></RoundedBox>)}
    <group position={[0,3.22,-.72]}>
      <RoundedBox position={[0,.18,-1.05]} rotation={[.54,0,0]} args={[7,.28,3.25]} radius={.14} smoothness={4} castShadow><meshStandardMaterial color={mat.roof}/></RoundedBox>
      <RoundedBox position={[0,.18,1.05]} rotation={[-.54,0,0]} args={[7,.28,3.25]} radius={.14} smoothness={4} castShadow><meshStandardMaterial color={mat.roofLight}/></RoundedBox>
      <RoundedBox position={[0,1.04,0]} args={[7.25,.28,.35]} radius={.12} smoothness={4} castShadow><meshStandardMaterial color="#b94f36"/></RoundedBox>
      {tileRows.map((t,i)=><RoundedBox key={i} position={[t.x,-.36-i%2*.02,1.36-t.z*.52]} rotation={[-.54,0,0]} args={[.76,.15,.82]} radius={.16} smoothness={4} castShadow><meshStandardMaterial color={i%2? '#dc6d4b':'#e47a55'} roughness={.78}/></RoundedBox>)}
    </group>
    <group position={[0,2.85,2.13]}>
      <mesh castShadow><shapeGeometry args={[gableShape]}/><meshStandardMaterial color="#efd29e" roughness={.9}/></mesh>
      <RoundedBox position={[-1.05,.95,.08]} rotation={[0,0,-.71]} args={[2.8,.23,.36]} radius={.1} smoothness={3} castShadow><meshStandardMaterial color="#c9583d"/></RoundedBox>
      <RoundedBox position={[1.05,.95,.08]} rotation={[0,0,.71]} args={[2.8,.23,.36]} radius={.1} smoothness={3} castShadow><meshStandardMaterial color="#c9583d"/></RoundedBox>
    </group>
    <Door position={[0,1.17,2.08]}/>
    <Window position={[-2.12,1.75,2.06]}/><Window position={[2.12,1.75,2.06]}/>
    <Window position={[0,3.28,2.22]} small/>
    <group position={[2.15,4.32,-.45]}>
      <RoundedBox args={[.72,1.5,.72]} radius={.1} smoothness={3} castShadow><meshStandardMaterial color="#9b704e"/></RoundedBox>
      <RoundedBox position={[0,.78,0]} args={[.95,.18,.95]} radius={.08} smoothness={3}><meshStandardMaterial color="#6e5139"/></RoundedBox>
    </group>
    <Bush position={[-2.4,.35,2.4]} scale={.75}/><Bush position={[2.45,.35,2.4]} scale={.75}/>
  </group>;
}

function Door({ position }) {
  return <group position={position}>
    <RoundedBox args={[1.25,2.05,.22]} radius={.16} smoothness={4} castShadow><meshStandardMaterial color="#8b5231"/></RoundedBox>
    <RoundedBox position={[0,.22,.15]} args={[.88,1.38,.12]} radius={.12} smoothness={4}><meshStandardMaterial color="#b87843"/></RoundedBox>
    <mesh position={[.34,.1,.26]}><sphereGeometry args={[.07,10,8]}/><meshStandardMaterial color="#f1c557" metalness={.25}/></mesh>
  </group>;
}

function Window({ position, small=false }) {
  return <group position={position}>
    <RoundedBox args={[small?1:.98,small?.72:1.08,.2]} radius={.14} smoothness={4} castShadow><meshStandardMaterial color="#9a6338"/></RoundedBox>
    <RoundedBox position={[0,0,.12]} args={[small?.72:.7,small?.45:.8,.08]} radius={.07} smoothness={3}><meshStandardMaterial color="#94cfd0" emissive="#d9f4e7" emissiveIntensity={.2}/></RoundedBox>
    <mesh position={[0,0,.18]}><boxGeometry args={[.07,small?.45:.8,.05]}/><meshStandardMaterial color="#a66d3b"/></mesh>
    <mesh position={[0,0,.18]}><boxGeometry args={[small?.72:.7,.07,.05]}/><meshStandardMaterial color="#a66d3b"/></mesh>
  </group>;
}

function Bridge({ position=[0,0,0] }) {
  return <group position={position}>
    {[-1.3,-.86,-.43,0,.43,.86,1.3].map((z,i)=><RoundedBox key={i} position={[0,0,z]} args={[2.5,.24,.36]} radius={.08} smoothness={3} castShadow><meshStandardMaterial color={i%2?'#b87c43':'#c98d4c'}/></RoundedBox>)}
    {[-1.15,1.15].map(x=><group key={x} position={[x,.48,0]}>{[-1.3,0,1.3].map(z=><mesh key={z} position={[0,0,z]}><cylinderGeometry args={[.1,.13,.95,10]}/><meshStandardMaterial color="#8c5933"/></mesh>)}<mesh position={[0,.34,0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.06,.06,2.6,8]}/><meshStandardMaterial color="#b77b43"/></mesh></group>)}
  </group>;
}

function RoundTable() {
  return <group position={[-3.7,.22,2.55]}>
    <mesh position={[0,.63,0]} castShadow><cylinderGeometry args={[.82,.82,.18,20]}/><meshStandardMaterial color="#c58a4b"/></mesh>
    <mesh position={[0,.3,0]}><cylinderGeometry args={[.13,.2,.62,12]}/><meshStandardMaterial color="#85552f"/></mesh>
    {[-1.15,1.15].map((x,i)=><group key={x} position={[x,0,i?.2:-.1]}><mesh position={[0,.36,0]} castShadow><cylinderGeometry args={[.4,.4,.16,18]}/><meshStandardMaterial color="#d09958"/></mesh><mesh position={[0,.18,0]}><cylinderGeometry args={[.1,.13,.36,10]}/><meshStandardMaterial color="#7d4d2c"/></mesh></group>)}
    <mesh position={[-.25,.83,0]}><cylinderGeometry args={[.18,.22,.22,14]}/><meshStandardMaterial color="#e9e3c5"/></mesh>
    <mesh position={[-.25,.96,0]}><torusGeometry args={[.13,.028,7,16]}/><meshStandardMaterial color="#5f8b4b"/></mesh>
    <RoundedBox position={[.3,.82,0]} rotation={[0,.3,0]} args={[.55,.08,.7]} radius={.04} smoothness={2}><meshStandardMaterial color="#f0dfb0"/></RoundedBox>
  </group>;
}

function Pond() {
  return <group position={[3.45,.24,2.9]}>
    <mesh position={[0,.08,0]} receiveShadow castShadow><boxGeometry args={[3.05,.16,2.5]}/><meshStandardMaterial color="#d9c79f" roughness={.9}/></mesh>
    <mesh position={[0,.18,0]}><boxGeometry args={[2.6,.08,2.05]}/><meshStandardMaterial color="#62c9c4" roughness={.18}/></mesh>
    {Array.from({length:12},(_,i)=>{const a=i/12*Math.PI*2;return <mesh key={i} position={[Math.cos(a)*1.38,.3,Math.sin(a)*1.08]} castShadow><dodecahedronGeometry args={[.25]}/><meshStandardMaterial color={i%2?'#d8caa9':'#eadbb8'}/></mesh>})}
    <LilyPad position={[-.25,.43,.05]} flower/><LilyPad position={[.55,.44,-.35]}/>
  </group>;
}

function Mailbox() {
  return <group position={[2.1,.25,4.12]} rotation={[0,-.2,0]}>
    <mesh position={[0,.6,0]}><cylinderGeometry args={[.1,.13,1.2,9]}/><meshStandardMaterial color="#80502d"/></mesh>
    <RoundedBox position={[0,1.25,0]} args={[.65,.65,.9]} radius={.22} smoothness={4} castShadow><meshStandardMaterial color="#b77943"/></RoundedBox>
    <RoundedBox position={[0,1.26,.47]} args={[.5,.08,.08]} radius={.02} smoothness={2}><meshStandardMaterial color="#68442c"/></RoundedBox>
    <mesh position={[.42,1.28,0]}><boxGeometry args={[.08,.55,.08]}/><meshStandardMaterial color="#e66b4b"/></mesh>
  </group>;
}

function Tent({ position=[0,0,0], color='#e77c54' }) {
  return <group position={position}>
    <mesh position={[0,.65,0]} rotation={[0,Math.PI/4,0]} castShadow><coneGeometry args={[1.15,1.5,4]}/><meshStandardMaterial color={color}/></mesh>
    <mesh position={[0,.53,.72]}><circleGeometry args={[.38,3]}/><meshStandardMaterial color="#40533d"/></mesh>
  </group>;
}

function Campfire({ position=[0,0,0] }) {
  const flame=useRef();
  useFrame(({clock})=>{if(flame.current) flame.current.scale.y=.9+Math.sin(clock.elapsedTime*7)*.12});
  return <group position={position}>
    {Array.from({length:7},(_,i)=><mesh key={i} position={[Math.cos(i)*.5,.15,Math.sin(i)*.5]}><dodecahedronGeometry args={[.2]}/><meshStandardMaterial color="#9b8669"/></mesh>)}
    <mesh rotation={[0,0,Math.PI/2]} position={[0,.26,0]}><cylinderGeometry args={[.09,.11,.85,8]}/><meshStandardMaterial color="#6e4025"/></mesh>
    <mesh ref={flame} position={[0,.65,0]}><coneGeometry args={[.27,.82,8]}/><meshStandardMaterial color="#ff793d" emissive="#ff5428" emissiveIntensity={1.6}/></mesh>
    <pointLight position={[0,1,0]} color="#ff9b55" intensity={1.5} distance={4}/>
  </group>;
}

function Character({ activity, onInteract }) {
  const group=useRef();
  useFrame(({clock})=>{if(group.current) group.current.position.y=.25+Math.sin(clock.elapsedTime*2.2)*.025});
  return <group ref={group} position={[0,.25,4.05]} onClick={(e)=>{e.stopPropagation();onInteract()}}>
    <mesh position={[0,.68,0]} castShadow><capsuleGeometry args={[.34,.58,5,12]}/><meshStandardMaterial color="#f5e7d3"/></mesh>
    <mesh position={[0,1.55,0]} castShadow><sphereGeometry args={[.58,24,18]}/><meshStandardMaterial color="#e9b183"/></mesh>
    <mesh position={[0,1.78,-.04]} castShadow><sphereGeometry args={[.6,24,15,0,Math.PI*2,0,Math.PI*.62]}/><meshStandardMaterial color="#3d2d29"/></mesh>
    <mesh position={[-.19,1.53,.51]}><sphereGeometry args={[.045,8,6]}/><meshStandardMaterial color="#2f2927"/></mesh><mesh position={[.19,1.53,.51]}><sphereGeometry args={[.045,8,6]}/><meshStandardMaterial color="#2f2927"/></mesh>
    <mesh position={[-.25,.28,0]}><capsuleGeometry args={[.12,.38,4,8]}/><meshStandardMaterial color="#4e6380"/></mesh><mesh position={[.25,.28,0]}><capsuleGeometry args={[.12,.38,4,8]}/><meshStandardMaterial color="#4e6380"/></mesh>
    <Html center position={[0,2.55,0]}><button className="key-prompt" onClick={onInteract}><kbd>E</kbd><span>{activity?'활동 중':'오두막 들어가기'}</span></button></Html>
  </group>;
}

function PlacedItem({ item }) {
  const p=[item.x,.1,item.z];
  if(item.type==='tent') return <Tent position={p}/>;
  if(item.type==='lamp') return <Lamp position={p}/>;
  if(item.type==='flower') return <Flower position={p} scale={1.3}/>;
  return <group position={p}><mesh position={[0,.38,0]}><cylinderGeometry args={[.42,.42,.16,16]}/><meshStandardMaterial color="#b47a41"/></mesh><mesh position={[0,.18,0]}><cylinderGeometry args={[.1,.12,.36,10]}/><meshStandardMaterial color="#74472a"/></mesh></group>;
}

function SummerCamera(){
  const camera=useRef();
  const {pointer,size}=useThree();
  useFrame(()=>{if(!camera.current)return;const compact=size.width<700;camera.current.position.x=THREE.MathUtils.lerp(camera.current.position.x,pointer.x*(compact?.35:.75),.025);camera.current.position.y=THREE.MathUtils.lerp(camera.current.position.y,compact?3.8:4.6,.04);camera.current.lookAt(0,1,-7)});
  return <PerspectiveCamera ref={camera} makeDefault position={[0,4.6,11]} fov={size.width<700?63:52} near={.1} far={120}/>;
}

function SummerTree({position,scale=1,shade=0}){
  const colors=['#3f8561','#4a946b','#357759','#579a66'];
  return <group position={position} scale={scale}>
    <mesh position={[0,1.25,0]} castShadow><cylinderGeometry args={[.22,.34,2.5,7]}/><meshToonMaterial color="#72533e"/></mesh>
    <mesh position={[0,3.15,0]} castShadow><dodecahedronGeometry args={[1.25,0]}/><meshToonMaterial color={colors[shade%colors.length]}/></mesh>
    <mesh position={[-.72,2.72,.12]} castShadow><dodecahedronGeometry args={[.83,0]}/><meshToonMaterial color={colors[(shade+1)%colors.length]}/></mesh>
    <mesh position={[.72,2.82,.04]} castShadow><dodecahedronGeometry args={[.9,0]}/><meshToonMaterial color={colors[(shade+2)%colors.length]}/></mesh>
    <mesh position={[0,3.9,-.15]} castShadow><dodecahedronGeometry args={[.78,0]}/><meshToonMaterial color={colors[shade%colors.length]}/></mesh>
  </group>
}

function SummerHouse({position,rotation=0,color='#d9b3a5',roof='#c96f66',scale=1}){
  return <group position={position} rotation={[0,rotation,0]} scale={scale}>
    <mesh position={[0,1.5,0]} castShadow receiveShadow><boxGeometry args={[4.6,3,3.4]}/><meshToonMaterial color={color}/></mesh>
    <mesh position={[-1.25,1.55,1.73]} castShadow><boxGeometry args={[1.05,1.05,.08]}/><meshToonMaterial color="#6d8f93"/></mesh>
    <mesh position={[1.28,1.55,1.73]} castShadow><boxGeometry args={[.82,1.25,.08]}/><meshToonMaterial color="#66878b"/></mesh>
    <mesh position={[0,.82,1.78]} castShadow><boxGeometry args={[.8,1.65,.16]}/><meshToonMaterial color="#826655"/></mesh>
    <mesh position={[0,3.25,0]} rotation={[0,Math.PI/4,0]} castShadow><coneGeometry args={[3.55,1.45,4]}/><meshToonMaterial color={roof}/></mesh>
    <mesh position={[1.25,4.05,-.4]} castShadow><boxGeometry args={[.45,1.2,.45]}/><meshToonMaterial color="#6d6258"/></mesh>
  </group>
}

function Cloud({position,scale=1}){
  return <group position={position} scale={scale}>
    {[[-1.4,0,0,1.2],[-.4,.35,0,1.5],[.8,.15,0,1.3],[1.8,-.05,0,.9],[0,-.25,0,1.45]].map((p,i)=><mesh key={i} position={p.slice(0,3)}><dodecahedronGeometry args={[p[3],1]}/><meshToonMaterial color={i%2?'#ffe8bb':'#fff0cd'}/></mesh>)}
  </group>;
}

function Road(){
  return <group>
    <mesh position={[0,.015,-17]} rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[7.8,46]}/><meshToonMaterial color="#aeb7b6"/></mesh>
    <mesh position={[-4,.04,-17]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.18,46]}/><meshBasicMaterial color="#f3dfaa"/></mesh>
    <mesh position={[4,.04,-17]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.18,46]}/><meshBasicMaterial color="#f3dfaa"/></mesh>
    {[-6,-14,-22,-30,-38].map(z=><mesh key={z} position={[0,.05,z]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.18,3.1]}/><meshBasicMaterial color="#f9ecc9"/></mesh>)}
  </group>;
}

function UtilityPole({position,side=1}){
  return <group position={position}>
    <mesh position={[0,2.9,0]} castShadow><cylinderGeometry args={[.09,.15,5.8,7]}/><meshToonMaterial color="#4e4a42"/></mesh>
    <mesh position={[side*.32,5.38,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.055,.055,.75,6]}/><meshToonMaterial color="#3f423d"/></mesh>
    <mesh position={[side*.58,5.2,0]}><sphereGeometry args={[.09,7,6]}/><meshToonMaterial color="#d9d0ae"/></mesh>
  </group>;
}

function StrawCharacter({onInteract,activity}){
  const g=useRef();
  useFrame(({clock})=>{if(g.current)g.current.position.y=.08+Math.sin(clock.elapsedTime*2)*.025});
  return <group ref={g} position={[0,.08,4]} onClick={(e)=>{e.stopPropagation();onInteract()}}>
    <mesh position={[0,1.12,0]} castShadow><capsuleGeometry args={[.31,.75,5,10]}/><meshToonMaterial color="#eee8d4"/></mesh>
    <mesh position={[-.2,.42,0]} castShadow><capsuleGeometry args={[.11,.5,4,8]}/><meshToonMaterial color="#5aa5a0"/></mesh><mesh position={[.2,.42,0]} castShadow><capsuleGeometry args={[.11,.5,4,8]}/><meshToonMaterial color="#5aa5a0"/></mesh>
    <mesh position={[0,2.02,0]} castShadow><sphereGeometry args={[.5,16,12]}/><meshToonMaterial color="#c7946c"/></mesh>
    <mesh position={[0,2.38,0]} castShadow><cylinderGeometry args={[.87,.87,.12,18]}/><meshToonMaterial color="#d7ae62"/></mesh>
    <mesh position={[0,2.58,0]} castShadow><cylinderGeometry args={[.55,.7,.42,16]}/><meshToonMaterial color="#e4c077"/></mesh>
    <mesh position={[0,2.54,.55]} rotation={[0,0,.2]}><boxGeometry args={[.5,.08,.08]}/><meshToonMaterial color="#6d8d75"/></mesh>
    <mesh position={[0,.02,.25]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.8,22]}/><meshBasicMaterial color="#2e3130" transparent opacity={.22}/></mesh>
    <Html center position={[0,3.25,0]}><button className="summer-prompt" onClick={onInteract}><kbd>E</kbd><span>{activity?'활동 중':'둘러보기'}</span></button></Html>
  </group>;
}

function SummerCampScene({night,activity,placing,placed,onGround,onInteract}){
  const trees=[[-10,-7,1.2,0],[-8,-11,.9,1],[-11,-16,1.1,2],[-8,-21,.8,3],[10,-7,1.15,2],[8,-12,.85,0],[11,-17,1.05,1],[8,-23,.9,3],[-7,-29,1.1,2],[7,-31,1.2,1],[-13,-26,1,0],[13,-27,1,2]];
  return <>
    <color attach="background" args={[night?'#334b6a':'#68b4e5']}/><fog attach="fog" args={[night?'#334b6a':'#9bc9d0',30,78]}/><SummerCamera/>
    <hemisphereLight intensity={night?.55:1.8} color={night?'#7694bb':'#fff1c9'} groundColor="#6f8b65"/>
    <directionalLight position={[-14,18,10]} intensity={night?.65:3.1} color={night?'#9ab1d9':'#ffd58e'} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-24} shadow-camera-right={24} shadow-camera-top={24} shadow-camera-bottom={-24}/>
    <mesh position={[0,-.08,-18]} rotation={[-Math.PI/2,0,0]} receiveShadow onClick={(e)=>{e.stopPropagation();onGround(e.point)}}><planeGeometry args={[62,76]}/><meshToonMaterial color={night?'#4a6d63':'#76b985'}/></mesh>
    <Road/>
    <SummerHouse position={[-8,0,-12]} rotation={.25} color="#cfaaa3" roof="#be6670" scale={1.05}/><SummerHouse position={[8.2,0,-15]} rotation={-.22} color="#ddb6a6" roof="#db725e" scale={.95}/>
    <SummerHouse position={[-10,0,-29]} rotation={.12} color="#d5b29d" roof="#d07a67" scale={.72}/><SummerHouse position={[9.5,0,-32]} rotation={-.15} color="#d9b2a2" roof="#ca6a5c" scale={.68}/>
    {trees.map((t,i)=><SummerTree key={i} position={[t[0],0,t[1]]} scale={t[2]} shade={t[3]}/>)}
    <group position={[-7,.02,-3.5]}><Tent position={[0,0,0]} color="#e98865"/><Campfire position={[2,0,.2]}/><RoundTable/></group>
    <group position={[7,.02,-4]}><Tent position={[0,0,0]} color="#e0a963"/><Lamp position={[-1.6,0,.4]}/><Bush position={[1.7,0,.4]} color="#3f8561"/></group>
    {[-9,-17,-25,-33].flatMap((z,i)=>[<UtilityPole key={`l${z}`} position={[-5.4,0,z]} side={-1}/>,<UtilityPole key={`r${z}`} position={[5.4,0,z]} side={1}/>])}
    <Cloud position={[-12,14,-38]} scale={1.8}/><Cloud position={[9,16,-46]} scale={2.2}/><Cloud position={[1,13,-60]} scale={1.25}/>
    <mesh position={[-13,1,-48]}><dodecahedronGeometry args={[9,1]}/><meshToonMaterial color="#5a9873"/></mesh><mesh position={[14,1,-52]}><dodecahedronGeometry args={[10,1]}/><meshToonMaterial color="#4d8d70"/></mesh>
    <StrawCharacter onInteract={onInteract} activity={activity}/>{placed.map(item=><PlacedItem key={item.key} item={item}/>) }
    <ContactShadows position={[0,.02,1]} scale={20} opacity={.3} blur={2.2} far={8} color="#374944"/>
    {night&&<Sparkles count={80} scale={[45,18,55]} position={[0,14,-26]} size={1.2} speed={.06} color="#fff0ad"/>}
    {placing&&<Html center position={[0,4,-2]}><div className="world-hint">잔디를 눌러 배치하세요</div></Html>}
  </>;
}

function DioramaScene({ night, activity, placing, placed, onGround, onInteract }) {
  const trees=[[-7.1,-5.4,1.1,0],[-5.7,-5.9,.9,1],[-4.2,-6.2,1,2],[-1.8,-6.3,.85,0],[2,-6.3,.9,1],[4.3,-6.1,1.05,2],[6.5,-5.6,1.15,0],[-8,-1.5,1.05,1],[8,-1.8,1.1,2],[-7.7,3.6,.9,0],[7.8,3.4,.95,1],[-6.4,6.2,.95,2],[6.6,6.2,.72,0]];
  const flowers=[[-5.3,-2.7],[-4.8,-2.4],[4.9,-2.7],[5.4,-2.45],[-5.3,4.6],[5.6,4.8],[-2.6,4.6]];
  return <>
    <color attach="background" args={[night?'#142f38':'#8dc4ad']}/><fog attach="fog" args={[night?'#142f38':'#8dc4ad',24,39]}/>
    <ResponsiveCamera/>
    <ambientLight intensity={night?.65:1.55} color={night?'#7ba0bc':'#fff0cf'}/>
    <directionalLight position={[-9,15,10]} intensity={night?.7:2.6} color={night?'#a5bde0':'#ffd69c'} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={16} shadow-camera-bottom={-16}/>
    <River/>
    <TerrainBlock position={[0,-.55,0]} size={[15.5,1.15,12.5]}/>
    <TerrainBlock position={[-8.4,-.2,-5.8]} size={[4.2,2.1,4.4]} color="#6f9343"/><TerrainBlock position={[8.4,-.2,-5.7]} size={[4.2,2.1,4.5]} color="#6f9343"/>
    <mesh position={[0,.16,0]} rotation={[-Math.PI/2,0,0]} onClick={(e)=>{e.stopPropagation();onGround(e.point)}}>
      <planeGeometry args={[15,12]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/>
    </mesh>
    <mesh position={[0,.07,2.5]} rotation={[-Math.PI/2,0,0]} receiveShadow onClick={(e)=>{e.stopPropagation();onGround(e.point)}}><planeGeometry args={[3.1,7.6]}/><meshStandardMaterial color="#d9ad6b" roughness={1}/></mesh>
    {[[0,4.6],[.45,3.9],[-.45,3.25],[.3,2.65],[-.3,2]].map((p,i)=><mesh key={i} position={[p[0],.13,p[1]]} rotation={[-Math.PI/2,0,.2*i]}><circleGeometry args={[.38+(i%2)*.07,7]}/><meshStandardMaterial color={mat.stone}/></mesh>)}
    <Cottage/><Bridge position={[0,-.2,7.05]}/><RoundTable/><Pond/><Mailbox/>
    <Tent position={[-5.4,.12,1.3]} color="#dc7751"/><Campfire position={[-5.35,.12,-.15]}/>
    <Fence from={[-4.7,.12,4.9]} length={3.2}/><Fence from={[4.7,.12,4.9]} length={3.2}/><Fence from={[-6.3,.12,3.4]} length={2.2} rotation={Math.PI/2}/><Fence from={[6.3,.12,3.4]} length={2.2} rotation={Math.PI/2}/>
    {[-5.7,-2.9,2.9,5.7].map((x,i)=><Lamp key={i} position={[x,.18,4.9]}/>)}
    {trees.map((t,i)=><ToyTree key={i} position={[t[0],.25,t[1]]} scale={t[2]} tone={t[3]}/>)}
    {flowers.map((p,i)=><Flower key={i} position={[p[0],.28,p[1]]} color={i%3===0?'#fff1bd':i%3===1?'#f4e7cc':'#f7d4c2'} scale={.8}/>) }
    <Bush position={[-4.7,.25,-3.1]} scale={.85}/><Bush position={[4.8,.25,-3.2]} scale={.85}/><Bush position={[-6.5,.25,1]} scale={.7}/><Bush position={[6.4,.25,.8]} scale={.7}/>
    <Character activity={activity} onInteract={onInteract}/>
    {placed.map(item=><PlacedItem key={item.key} item={item}/>) }
    <ContactShadows position={[0,.04,0]} scale={28} opacity={.42} blur={2.2} far={8} color="#3b3825"/>
    {night && <><Sparkles count={70} scale={[26,10,20]} position={[0,7,0]} size={1.3} speed={.08} color="#fff1b7"/><Float speed={.8} floatIntensity={.2}><mesh position={[8,8,-6]}><sphereGeometry args={[1,28,22]}/><meshBasicMaterial color="#ffe2a0"/></mesh></Float></>}
    {placing && <Html center position={[0,5.5,1]}><div className="world-hint">잔디를 눌러 배치하세요</div></Html>}
  </>;
}

function App(){
  const [night,setNight]=useState(false),[sound,setSound]=useState(true),[coins,setCoins]=useState(840),[hearts,setHearts]=useState(6);
  const [activity,setActivity]=useState(null),[progress,setProgress]=useState(0),[toast,setToast]=useState('여름 오후의 캠핑장에 도착했어요');
  const [chatOpen,setChatOpen]=useState(false),[buildOpen,setBuildOpen]=useState(false),[placing,setPlacing]=useState(null),[placed,setPlaced]=useState([]);
  const [text,setText]=useState(''),[messages,setMessages]=useState([{name:'소라',text:'오두막 앞에서 기다릴게! 🌼'},{name:'우디',text:'연못에 개구리가 있어!'}]);
  const [loginOpen,setLoginOpen]=useState(true),[nickname,setNickname]=useState('');

  const startActivity=(a)=>{setActivity(a);setProgress(5);setToast(`${a.label} 시작!`);const timer=setInterval(()=>setProgress(p=>{if(p>=100){clearInterval(timer);setCoins(c=>c+a.reward);setHearts(h=>Math.min(9,h+1));setToast(`완료! 솔방울 +${a.reward}`);setTimeout(()=>setActivity(null),1100);return 100}return p+5}),100)};
  const onGround=(point)=>{if(!placing)return;const item=buildItems.find(i=>i.id===placing);if(coins<item.price){setToast('솔방울이 부족해요');return}setPlaced(v=>[...v,{type:placing,x:point.x,z:point.z,key:Date.now()}]);setCoins(c=>c-item.price);setToast(`${item.name} 배치 완료!`);setPlacing(null)};
  const enterCottage=()=>setToast(activity?'활동을 마치고 들어가 볼까요?':'오두막 내부는 다음 업데이트에서 열려요!');
  const send=(e)=>{e.preventDefault();if(!text.trim())return;setMessages(v=>[...v,{name:'나',text:text.trim(),mine:true}]);setText('')};
  const enterCamp=(e)=>{e.preventDefault();const name=nickname.trim()||'여행자';setLoginOpen(false);setToast(`${name}님, 여름 캠핑장에 어서 오세요!`)};
  return <main className={night?'game night':'game'}>
    <Canvas shadows dpr={[1,1.6]} gl={{antialias:true}}><Suspense fallback={null}><SummerCampScene night={night} activity={activity} placing={placing} placed={placed} onGround={onGround} onInteract={enterCottage}/></Suspense></Canvas>
    <header className="hud-top">
      <div className="logo-chip"><span><Trees size={23}/></span><div><b>SUMMER CAMP</b><small>느린 오후의 산책</small></div></div>
      <div className="top-center"><button aria-label="낮 풍경" onClick={()=>setNight(false)} className={!night?'on':''}><Sun size={17}/></button><span>{night?'별빛 가득한 밤':'포근한 오후'}<small>{night?'PM 9:24 · 17°':'PM 4:38 · 23°'}</small></span><button aria-label="밤 풍경" onClick={()=>setNight(true)} className={night?'on':''}><Moon size={16}/></button></div>
      <div className="resources"><span className="heart-count"><Heart size={15} fill="currentColor"/>{hearts}</span><span className="coin-count">● {coins}</span><button onClick={()=>setSound(!sound)} aria-label="소리 켜기/끄기">{sound?<Volume2 size={18}/>:<VolumeX size={18}/>}</button><button className="profile-dot" aria-label="로그인 화면 열기" onClick={()=>setLoginOpen(true)}>FP<i/></button></div>
    </header>
    <aside className="quest-card"><span className="quest-icon"><Leaf size={21}/></span><div><small>SUMMER SOUNDS</small><b>여름의 소리 5개 찾기</b><div className="quest-progress"><i/></div><em>0 / 5</em></div></aside>
    <nav className="tool-rail"><button aria-label="캠핑장" className="active"><Trees size={20}/><span>숲</span></button><button aria-label="꾸미기" onClick={()=>setBuildOpen(true)}><Hammer size={20}/><span>꾸미기</span></button><button aria-label="가방"><Backpack size={20}/><span>가방</span></button><button aria-label="상점"><ShoppingBag size={20}/><span>상점</span></button><button aria-label="설정"><Settings size={20}/><span>설정</span></button></nav>
    <div className="online-chip"><Users size={15}/><span><b>3</b>명이 함께 쉬는 중</span><div><i className="av pink">소</i><i className="av blue">우</i><i className="av gold">나</i></div></div>
    {toast&&<div className="toast-new"><Bell size={15}/><span>{toast}</span><button onClick={()=>setToast('')}><X size={13}/></button></div>}
    <section className="activity-bar">
      <div className="bar-intro"><small><SparklesIcon size={11}/> 무엇을 해볼까요?</small><b>마음 가는 대로</b></div>
      <div className="activity-buttons">{activities.map(a=>{const Icon=a.icon;return <button key={a.id} onClick={()=>startActivity(a)} style={{'--c':a.color}}><span><Icon size={21}/></span><div><b>{a.label}</b><small>+{a.reward} ●</small></div></button>})}</div>
    </section>
    {activity&&<div className="doing-card"><span style={{background:activity.color}}>{React.createElement(activity.icon,{size:20})}</span><div><b>{activity.label} 중</b><div><i style={{width:`${progress}%`}}/></div><small>{progress<100?'천천히 해도 괜찮아요':`완료! +${activity.reward} 솔방울`}</small></div><strong>{progress}%</strong></div>}
    <button aria-label="채팅 열기" className="chat-button" onClick={()=>setChatOpen(true)}><MessageCircle size={22}/><i>2</i></button>
    {buildOpen&&<div className="side-sheet"><header><div><small>MY FOREST</small><h2>숲 꾸미기</h2></div><button onClick={()=>setBuildOpen(false)}><X size={19}/></button></header><p>아이템을 고른 뒤 잔디 위를 눌러주세요.</p><div className="build-list">{buildItems.map(item=><button key={item.id} onClick={()=>{setPlacing(item.id);setBuildOpen(false)}}><span>{item.icon}</span><div><b>{item.name}</b><small>● {item.price}</small></div><Plus size={16}/></button>)}</div></div>}
    {chatOpen&&<div className="side-sheet chat-sheet"><header><div><small>FOREST CHAT · 3 ONLINE</small><h2>친구들과 이야기</h2></div><button onClick={()=>setChatOpen(false)}><X size={19}/></button></header><div className="chat-body">{messages.map((m,i)=><div key={i} className={m.mine?'bubble mine':'bubble'}>{!m.mine&&<b>{m.name}</b>}<p>{m.text}</p></div>)}</div><form onSubmit={send}><input value={text} onChange={e=>setText(e.target.value)} placeholder="숲 친구들에게 이야기해 보세요"/><button><Send size={17}/></button></form></div>}
    {loginOpen&&<section className="login-layer" aria-label="로그인">
      <div className="login-scrim"/>
      <form className="login-card" onSubmit={enterCamp}>
        <div className="login-mark"><Trees size={27}/><i/></div>
        <small className="login-kicker">A SLOW SUMMER TOGETHER</small>
        <h1>여름 숲에서<br/><em>잠시 쉬어가요</em></h1>
        <p>친구들과 이야기하고, 마음 가는 캠핑 활동을<br/>하나씩 즐겨보세요.</p>
        <label><span><UserRound size={15}/> 닉네임</span><input autoFocus value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="숲에서 사용할 이름" maxLength={12}/></label>
        <label><span><LockKeyhole size={15}/> 초대 코드 <i>선택</i></span><input placeholder="친구의 캠핑장 코드" maxLength={16}/></label>
        <button className="login-primary" type="submit"><span>캠핑장 입장하기</span><LogIn size={18}/></button>
        <button className="login-guest" type="button" onClick={()=>{setNickname('');setLoginOpen(false);setToast('게스트로 캠핑장을 둘러보는 중이에요')}}>게스트로 먼저 둘러보기</button>
        <div className="login-foot"><i/> 지금 3명의 친구가 쉬고 있어요</div>
      </form>
    </section>}
  </main>
}

createRoot(document.getElementById('root')).render(<App/>);
