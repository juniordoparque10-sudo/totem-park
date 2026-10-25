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
  smartLobby:{ layout:"A",secondarySlots:2,items,typography:{ titleScale:100,primaryTextScale:100,secondaryTextScale:100 },rotation:{ intervalSeconds:10 } },
});

function Row({ transparency }) {
  const config = makeConfig(transparency);
  return <section className="comparison">
    <h2>{transparency}%</h2>
    <div><strong>Prévia ampliada</strong><Stage config={config} scale={0.3}/></div>
    <div><strong>Redução anterior</strong><Stage config={config} scale={0.15}/></div>
    <div><strong>Miniatura corrigida</strong><Stage config={config} scale={0.15} composite/></div>
  </section>;
}

function Stage({ config,scale,composite=false }) {
  return <div className="manual-frame" style={{ width:1920*scale,height:1080*scale }}><div className="manual-logical" style={{ transform:composite?undefined:`scale(${scale})`,zoom:composite?scale:undefined }}><TemplateV2Renderer template={template} config={config} orientation="Paisagem" mode="thumbnail"/></div></div>;
}

function App() { return <main><h1>Smart Lobby — fidelidade da miniatura</h1>{[0,35,50,100].map((value)=><Row key={value} transparency={value}/>)}</main>; }
createRoot(document.getElementById("root")).render(<App/>);

const style=document.createElement("style");
style.textContent=`body{margin:0;background:#09111f;color:#fff;font:16px Arial}main{padding:24px}.comparison{display:grid;grid-template-columns:70px 288px 288px;gap:18px;align-items:start;margin:24px 0;padding:18px;background:#111c2e;border-radius:16px}.comparison h2{grid-row:1/3;margin:28px 0}.comparison>div:first-of-type{grid-column:2/4}.comparison strong{display:block;margin:0 0 8px}.comparison>div{min-width:0;overflow:hidden}.manual-frame{position:relative;overflow:hidden;background:#050b14}.manual-logical{position:absolute;inset:0;width:1920px;height:1080px;transform-origin:top left}.manual-logical>.tpv2-root{width:1920px;height:1080px}`;
document.head.append(style);
