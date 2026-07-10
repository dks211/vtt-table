"use strict";
/* ---------------- boot ---------------- */
const {model,renderer,table,editor,panel,network}=App.services;
renderer.resize();
model.loadLevel(App.content.VERSO_LEVEL);
editor.setScene("verso");
editor.setTool("select");
renderer.fitScene(); table.updZoom();
panel.renderPanel();
requestAnimationFrame(table.frame);
{
  // Convenience screen lock only. Deployment access is enforced by Worker Basic Auth.
  const DM_SCREEN_WORD="mindthecarpet";
  const jc=new URLSearchParams(location.search).get("join");
  const gate=$("dmgate");
  let unlocked=false;
  try{unlocked=sessionStorage.getItem("verso-dm")==="ok";}catch(e){}
  if(jc){
    gate.remove();
    network.joinTable(jc.trim());
  }else if(unlocked){
    gate.remove();
  }else{
    const tryPass=()=>{
      if($("dmpass").value===DM_SCREEN_WORD){
        try{sessionStorage.setItem("verso-dm","ok");}catch(e){}
        gate.remove();
      }else{
        $("dmerr").textContent="the house does not recognize you";
        gate.classList.remove("shake");void gate.offsetWidth;gate.classList.add("shake");
        $("dmpass").value="";$("dmpass").focus();
      }
    };
    $("dmgo").onclick=tryPass;
    $("dmpass").addEventListener("keydown",e=>{if(e.key==="Enter")tryPass();});
    $("dmpass").focus();
  }
}
