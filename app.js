
const KEY='gmv_chuvas_lancamentos_v1';
const state={talhoes:window.GMV_TALHOES||[], lancamentos:[], selected:null, map:null, layers:{}, markers:{}};
const $=id=>document.getElementById(id);
const today=()=>new Date().toISOString().slice(0,10);
const brDate=iso=>{ if(!iso) return '--'; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; };
const currentMonth=()=>today().slice(0,7);
const fmt=n=>(Number(n)||0).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
function load(){try{state.lancamentos=JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){state.lancamentos=[]}}
function save(){localStorage.setItem(KEY,JSON.stringify(state.lancamentos));}
function init(){load(); $('dataInput').value=today(); fillSelects(); initMap(); renderAll(); bind();}
function fillSelects(){['talhaoInput','filtroTalhao'].forEach(id=>{const el=$(id); const first=id==='filtroTalhao'?'<option value="todos">Todos os talhões</option>':''; el.innerHTML=first+state.talhoes.map(t=>`<option value="${t.nome}">${t.nome}</option>`).join('');}); if(state.talhoes[0]) selectTalhao(state.talhoes[0].nome,false);}
function initMap(){
 if(!window.L){$('map').innerHTML='<div style="padding:30px">Sem internet para carregar o mapa. Conecte e atualize.</div>';return}
 state.map=L.map('map',{zoomControl:true});
 const sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles © Esri'}).addTo(state.map);
 const osm=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'});
 L.control.layers({'Satélite':sat,'Mapa':osm},{},{position:'topright'}).addTo(state.map);
 const bounds=[];
 state.talhoes.forEach(t=>{
  const layer=L.polygon(t.coords,{color:'#fff',weight:2,fillColor:t.cor,fillOpacity:.38}).addTo(state.map);
  layer.on('click',()=>{selectTalhao(t.nome,true);});
  const center=layer.getBounds().getCenter();
  layer.bindPopup(`<b>${t.nome}</b><br>Área: ${fmt(t.area)} ha<br><button onclick="selectTalhao('${t.nome}',true)">Lançar chuva</button>`);
  const marker=L.marker(center,{interactive:false,icon:L.divIcon({className:'label-talhao',html:`<div style="background:rgba(0,0,0,.45);color:white;font-weight:800;padding:4px 8px;border-radius:8px;border:1px solid #fff8">${t.nome}<br><small>${fmt(t.area)} ha</small></div>`})}).addTo(state.map);
  state.layers[t.nome]=layer; state.markers[t.nome]=marker; t.coords.forEach(c=>bounds.push(c));
 });
 if(bounds.length) state.map.fitBounds(bounds,{padding:[30,30]}); else state.map.setView([-10.74,-52.74],13);
}
function selectTalhao(nome,fly=true){
 state.selected=nome; if($('talhaoInput')) $('talhaoInput').value=nome; if($('filtroTalhao')) $('filtroTalhao').value=nome;
 Object.entries(state.layers).forEach(([n,l])=>l.setStyle({weight:n===nome?5:2,fillOpacity:n===nome?.55:.35}));
 const t=state.talhoes.find(x=>x.nome===nome); if(t&&fly&&state.layers[nome]) state.map.fitBounds(state.layers[nome].getBounds(),{padding:[40,40],maxZoom:15});
 renderSelected(); renderHistorico(); renderResumo(); drawChart();
}
function bind(){
 $('formChuva').addEventListener('submit',e=>{e.preventDefault(); const talhao=$('talhaoInput').value; const chuva=parseFloat(String($('chuvaInput').value).replace(',','.')); const data=$('dataInput').value; if(!talhao||!data||isNaN(chuva)){showMsg('Preencha talhão, data e chuva.');return} state.lancamentos.push({id:Date.now(),talhao,chuva,data,responsavel:$('responsavelInput').value,obs:$('obsInput').value.trim()}); save(); $('chuvaInput').value=''; $('obsInput').value=''; showMsg('✅ Salvo'); selectTalhao(talhao,false); renderAll();});
 $('filtroTalhao').addEventListener('change',e=>{ if(e.target.value==='todos') verTodos(); else selectTalhao(e.target.value,true); });
 $('busca').addEventListener('input',e=>{ const q=e.target.value.toLowerCase().trim(); const t=state.talhoes.find(x=>x.nome.toLowerCase().includes(q)); if(t) selectTalhao(t.nome,true); });
 $('btnVerTodos').onclick=verTodos; $('btnQuick').onclick=()=>$('chuvaInput').focus(); $('btnExport').onclick=exportCSV; $('btnBackup').onclick=backupJSON;
 $('btnLimpar').onclick=()=>{ if($('chuvaInput')) $('chuvaInput').value=''; if($('obsInput')) $('obsInput').value=''; showMsg('Campos limpos'); };
 $('btnRestore').onclick=()=>$('restoreFile').click(); $('restoreFile').onchange=restoreJSON;
 document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));b.classList.add('active'); const id=b.dataset.page; const el=id==='dashboard'?document.querySelector('.map-card'):$(id); if(el) el.scrollIntoView({behavior:'smooth'});});
}
function showMsg(text){$('msg').textContent=text; setTimeout(()=>$('msg').textContent='',2500)}
function verTodos(){ if($('filtroTalhao')) $('filtroTalhao').value='todos'; const arr=[]; Object.values(state.layers).forEach(l=>arr.push(l.getBounds())); if(arr.length){let b=arr[0]; arr.slice(1).forEach(x=>b.extend(x)); state.map.fitBounds(b,{padding:[30,30]});} state.selected=null; renderSelected(); renderHistorico(); renderResumo(); drawChart(); }
function sums(talhao){ const dia=today(), mes=currentMonth(); const f=state.lancamentos.filter(x=>!talhao||x.talhao===talhao); return {hoje:f.filter(x=>x.data===dia).reduce((a,b)=>a+b.chuva,0), mes:f.filter(x=>x.data.slice(0,7)===mes).reduce((a,b)=>a+b.chuva,0), safra:f.reduce((a,b)=>a+b.chuva,0), ultima:f.sort((a,b)=>b.data.localeCompare(a.data))[0]?.data||''};}
function renderResumo(){ const body=$('resumoTabela').querySelector('tbody'); body.innerHTML=state.talhoes.map(t=>{const s=sums(t.nome); return `<tr onclick="selectTalhao('${t.nome}',true)"><td><span class="pill">${t.nome}</span></td><td>${fmt(s.hoje)}</td><td>${fmt(s.mes)}</td><td>${fmt(s.safra)}</td><td>${brDate(s.ultima)}</td></tr>`}).join(''); }
function renderSelected(){ const el=$('selectedInfo'); if(!state.selected){el.innerHTML='Clique em um talhão no mapa.';return} const t=state.talhoes.find(x=>x.nome===state.selected), s=sums(state.selected); el.innerHTML=`<h3>${state.selected}</h3><p>Área: <b>${fmt(t?.area)} ha</b></p><div class="selected-grid"><div class="metric">Hoje<b>${fmt(s.hoje)} mm</b></div><div class="metric">Mês<b>${fmt(s.mes)} mm</b></div><div class="metric">Safra<b>${fmt(s.safra)} mm</b></div><div class="metric">Última<b>${brDate(s.ultima)}</b></div></div>`;}
function renderHistorico(){ const body=$('histTabela').querySelector('tbody'); let list=[...state.lancamentos].sort((a,b)=>b.data.localeCompare(a.data)||b.id-a.id); if(state.selected) list=list.filter(x=>x.talhao===state.selected); body.innerHTML=list.slice(0,80).map(x=>`<tr><td>${brDate(x.data)}</td><td>${x.talhao}</td><td>${fmt(x.chuva)} mm</td><td>${x.responsavel}</td><td>${x.obs||''}</td><td><button onclick="delLanc(${x.id})">Excluir</button></td></tr>`).join('') || '<tr><td colspan="6">Nenhum lançamento ainda.</td></tr>';}
function delLanc(id){ const x=state.lancamentos.find(r=>r.id===id); const p=prompt(`Digite a senha 1234 para apagar:\n${x?.talhao||''} • ${brDate(x?.data||'')} • ${fmt(x?.chuva||0)} mm`); if(p===null) return; if(p!=='1234'){showMsg('Senha incorreta');return;} if(confirm('Apagar somente este lançamento?')){state.lancamentos=state.lancamentos.filter(x=>x.id!==id);save();renderAll();showMsg('Lançamento apagado');}}
function drawChart(){ const canvas=$('grafico'), ctx=canvas.getContext('2d'); const dpr=window.devicePixelRatio||1; const w=canvas.clientWidth||800,h=canvas.height; canvas.width=w*dpr; canvas.height=h*dpr; ctx.scale(dpr,dpr); ctx.clearRect(0,0,w,h); const data=state.talhoes.map(t=>({n:t.nome,v:sums(t.nome).mes})); const max=Math.max(10,...data.map(x=>x.v)); const pad=36, bw=(w-pad*2)/data.length; ctx.strokeStyle='rgba(255,255,255,.18)'; ctx.fillStyle='#dff8ef'; ctx.font='12px Arial'; for(let i=0;i<=4;i++){const y=pad+(h-pad*2)*i/4;ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(w-pad,y);ctx.stroke();ctx.fillText(fmt(max*(1-i/4)),4,y+4)} data.forEach((x,i)=>{const bar=(h-pad*2)*(x.v/max); const X=pad+i*bw+4,Y=h-pad-bar; ctx.fillStyle='#22c55e';ctx.fillRect(X,Y,bw-8,bar);ctx.fillStyle='#fff';ctx.fillText(x.n,X,h-10); if(x.v>0) ctx.fillText(fmt(x.v),X,Y-5);});}
function exportCSV(){ const rows=[['data','talhao','chuva_mm','responsavel','observacao'],...state.lancamentos.map(x=>[x.data,x.talhao,x.chuva,x.responsavel,x.obs])]; const csv=rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\n'); download('gmv_chuvas.csv',csv,'text/csv');}
function backupJSON(){download('backup_gmv_chuvas.json',JSON.stringify(state.lancamentos,null,2),'application/json')}
function restoreJSON(e){const file=e.target.files[0]; if(!file)return; const r=new FileReader(); r.onload=()=>{try{const data=JSON.parse(r.result); if(Array.isArray(data)){state.lancamentos=data;save();renderAll();alert('Backup restaurado.')}}catch(err){alert('Arquivo inválido.')}}; r.readAsText(file);}
function download(name,content,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
function renderAll(){renderResumo();renderSelected();renderHistorico();drawChart()}
window.selectTalhao=selectTalhao; window.delLanc=delLanc;
document.addEventListener('DOMContentLoaded',init);
