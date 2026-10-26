import React from "react";
import { createRoot } from "react-dom/client";
import TemplateV2Renderer from "../../src/templates-v2/TemplateV2Renderer.jsx";
import { SMART_LOBBY_TYPE } from "../../src/templates-v2/schema.js";
import "../../src/App.css";
import "../../src/templates-v2/template-v2.css";
import "../../src/templates-v2/editor/template-v2-editor.css";

const items = [
  { id:"welcome",title:"Bem Vindo",subtitle:"Bem-vindo ao nosso espaço. Este painel preserva transparência, cores e tipografia.",active:true },
  { id:"lift",title:"Elevadores",subtitle:"Manutenção preventiva programada para hoje.",active:true },
  { id:"hall",title:"Corredor",subtitle:"Atenção às áreas comuns durante a manutenção.",active:true },
];
const template = { id:"fidelity",identity:{ templateType:SMART_LOBBY_TYPE },templateType:SMART_LOBBY_TYPE };
const makeConfig = (panelTransparency) => ({
  style:{ backgroundColor:"#6281ac",primaryColor:"#1458c7",secondaryColor:"#129dd9",textColor:"#fff",overlayOpacity:9,panelTransparency,mediaFit:"cover",mediaPosition:"center" },
  media:{ primary:{ type:"image",url:"/src/assets/hero.png" } },
  visibility:{ showContent:true,showHeadline:true,showSubtitle:true,showServices:true },
  display:{ duration:15,defaultOrientation:"Paisagem" },
  smartLobby:{ layout:"A",secondarySlots:2,items,typography:{ titleScale:140,primaryTextScale:140,secondaryTextScale:140 },rotation:{ intervalSeconds:10 } },
});

function Row({ transparency }) {
  const config = makeConfig(transparency);
  return <section className="comparison">
    <h2>{transparency}%</h2>
    <div data-role="preview"><strong>Preview</strong><Stage config={config} scale={0.18}/></div>
    <div data-role="catalog"><strong>Miniatura do catálogo</strong><Stage config={config} scale={0.18} catalog/></div>
  </section>;
}

function Stage({ config,scale,catalog=false }) {
  const stage=<div className="manual-frame" style={{ width:1920*scale,height:1080*scale }}><div className="manual-logical" style={{ transform:`scale(${scale})` }}><TemplateV2Renderer template={template} config={config} orientation="Paisagem" mode="thumbnail"/></div></div>;
  return catalog?<div className="tpv2-published-strip"><article>{stage}</article></div>:stage;
}

function App() { return <main><h1>Smart Lobby — fidelidade da miniatura</h1>{[0,35,50,100].map((value)=><Row key={value} transparency={value}/>)}</main>; }
createRoot(document.getElementById("root")).render(<App/>);

const style=document.createElement("style");
style.textContent=`body{margin:0;background:#09111f;color:#fff;font:16px Arial}main{padding:24px}.comparison{display:grid;grid-template-columns:70px 346px 346px;gap:18px;align-items:start;margin:24px 0;padding:18px;background:#111c2e;border-radius:16px}.comparison h2{margin:28px 0}.comparison strong{display:block;margin:0 0 8px}.comparison>div{min-width:0;overflow:hidden}.comparison .tpv2-published-strip{display:block;margin:0}.comparison .tpv2-published-strip>article{width:max-content}.manual-frame{position:relative;overflow:hidden;background:#050b14}.manual-logical{position:absolute;inset:0;width:1920px;height:1080px;transform-origin:top left}.manual-logical>.tpv2-root{width:1920px;height:1080px}`;
document.head.append(style);
