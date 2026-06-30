(() => {
  const $ = (id) => document.getElementById(id);
  const STORAGE = 'gmv_chuvas_lancamentos_v1';
  const talhoes = (window.GMV_TALHOES?.features || []).map(f => ({
    nome: f.properties.talhao,
    area: Number(f.properties.area_ha || 0),
    feature: f
  })).sort((a,b)=>ordem(a.nome)-ordem(b.nome));
  function ordem(n){const o=['Sede','1A','1B','1C','2A','2B','3A','3B','4A','4B','4C']; return o.indexOf(n)>=0?o.indexOf(n):99}
  let lancamentos = carregar();
  let selected = talhoes[0]?.nome || '';
  let map, geoLayer;

  document.addEventListener('DOMContentLoaded', init);

  function init(){
    setToday();
    popularTalhoes();
    initNav();
    initMap();
    bindActions();
    atualizarTudo();
    toast('Sistema limpo carregado com '+talhoes.length+' talhões');
  }
  function setToday(){ $('dataInput').value = new Date().toISOString().slice(0,10); }
  function carregar(){ try { return JSON.parse(localStorage.getItem(STORAGE) || '[]') } catch { return [] } }
  function persistir(){ localStorage.setItem(STORAGE, JSON.stringify(lancamentos)); }
  function brDate(iso){ if(!iso) return '-'; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; }
  function isoMonth(){ return new Date().toISOString().slice(0,7); }
  function todayIso(){ return new Date().toISOString().slice(0,10); }

  function popularTalhoes(){
    const opts = talhoes.map(t=>`<option value="${t.nome}">${t.nome}</option>`).join('');
    $('talhaoInput').innerHTML = opts;
    $('talhaoFiltro').innerHTML = '<option value="todos">Todos os talhões</option>'+opts;
    if(selected) $('talhaoInput').value = selected;
  }

  function initNav(){
    document.querySelectorAll('.nav').forEach(btn=>btn.addEventListener('click',()=>{
      document.querySelectorAll('.nav').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
      btn.classList.add('active');
      $(btn.dataset.view).classList.add('active');
      setTimeout(()=>{ if(map) map.invalidateSize(); desenharGrafico(); },100);
    }));
  }

  function initMap(){
    map = L.map('map', { zoomControl:true });
    const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom:20, attribution:'Tiles © Esri' });
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19, attribution:'© OpenStreetMap' });
    sat.addTo(map);
    L.control.layers({'Satélite':sat,'Mapa':osm}).addTo(map);
    geoLayer = L.geoJSON(window.GMV_TALHOES, {
      style: f => estilo(f.properties.talhao),
      onEachFeature: (feature, layer) => {
        const nome = feature.properties.talhao;
        const area = Number(feature.properties.area_ha || 0).toFixed(1);
        layer.bindTooltip(`${nome}<br>${area} ha`, {permanent:true, direction:'center', className:'talhao-label'});
        layer.bindPopup(`<b>${nome}</b><br>Área: ${area} ha<br><button onclick="window.GMVSelecionar('${nome}', true)">Lançar chuva</button>`);
        layer.on('click', () => selecionarTalhao(nome, true));
      }
    }).addTo(map);
    if(geoLayer.getBounds().isValid()) map.fitBounds(geoLayer.getBounds(), {padding:[20,20]}); else map.setView([-10.72,-52.74], 13);
    window.GMVSelecionar = selecionarTalhao;
  }

  function estilo(nome){
    const colors = { 'Sede':'#14b8a6','1A':'#22c55e','1B':'#84cc16','1C':'#eab308','2A':'#f97316','2B':'#f59e0b','3A':'#3b82f6','3B':'#06b6d4','4A':'#a855f7','4B':'#ef4444','4C':'#ec4899' };
    return { color:'#ffffff', weight:2.5, fillColor:colors[nome]||'#22c55e', fillOpacity:0.45 };
  }

  function selecionarTalhao(nome, openForm=false){
    selected = nome;
    $('talhaoInput').value = nome;
    $('talhaoFiltro').value = nome;
    atualizarTudo();
    if(openForm){ $('chuvaInput').focus(); }
    geoLayer.eachLayer(l => l.setStyle(estilo(l.feature.properties.talhao)));
    geoLayer.eachLayer(l => { if(l.feature.properties.talhao===nome){ l.setStyle({weight:5, fillOpacity:.65}); map.fitBounds(l.getBounds(), {padding:[30,30]}); } });
  }

  function bindActions(){
    $('btnSalvar').addEventListener('click', salvarChuva);
    $('btnOpenForm').addEventListener('click', () => { $('chuvaInput').focus(); });
    $('btnCentralizar').addEventListener('click', () => { $('talhaoFiltro').value='todos'; if(geoLayer.getBounds().isValid()) map.fitBounds(geoLayer.getBounds(), {padding:[20,20]}); });
    $('talhaoFiltro').addEventListener('change', e => { if(e.target.value==='todos'){ if(geoLayer.getBounds().isValid()) map.fitBounds(geoLayer.getBounds(), {padding:[20,20]}); } else selecionarTalhao(e.target.value); });
    $('talhaoInput').addEventListener('change', e => selecionarTalhao(e.target.value));
    $('buscaTalhao').addEventListener('input', e => {
      const q=e.target.value.trim().toUpperCase();
      const t=talhoes.find(x=>x.nome.toUpperCase().includes(q));
      if(q && t) selecionarTalhao(t.nome);
    });
    $('btnExport').addEventListener('click', exportCSV);
    $('btnBackup').addEventListener('click', backupJSON);
    $('btnRestore').addEventListener('click', ()=>$('restoreFile').click());
    $('restoreFile').addEventListener('change', restoreJSON);
    $('btnClear').addEventListener('click', () => { if(confirm('Apagar todos os lançamentos?')){ lancamentos=[]; persistir(); atualizarTudo(); toast('Dados apagados'); } });
  }

  function salvarChuva(){
    const talhao = $('talhaoInput').value;
    const data = $('dataInput').value;
    const chuva = Number(String($('chuvaInput').value).replace(',', '.'));
    const responsavel = $('respInput').value;
    const obs = $('obsInput').value.trim();
    if(!talhao) return toast('Escolha um talhão');
    if(!data) return toast('Informe a data');
    if(!chuva || chuva <= 0) return toast('Informe a chuva em mm');
    lancamentos.push({ id: Date.now(), talhao, data, chuva, responsavel, obs });
    persistir();
    $('chuvaInput').value=''; $('obsInput').value=''; $('status').textContent='✅ Salvo: '+talhao+' • '+chuva+' mm';
    selecionarTalhao(talhao);
    atualizarTudo();
    toast('Chuva salva com sucesso');
  }

  function atualizarTudo(){ renderResumo(); renderHistorico(); renderSelecionado(); desenharGrafico(); }
  function somas(nome){
    const hoje=todayIso(), mes=isoMonth();
    const arr=lancamentos.filter(l=>l.talhao===nome);
    const soma=(xs)=>xs.reduce((a,b)=>a+Number(b.chuva||0),0);
    const hojeV=soma(arr.filter(l=>l.data===hoje));
    const mesV=soma(arr.filter(l=>String(l.data).slice(0,7)===mes));
    const safra=soma(arr);
    const ultima=arr.length?arr.slice().sort((a,b)=>String(b.data).localeCompare(String(a.data)))[0].data:'';
    return {hojeV, mesV, safra, ultima};
  }
  function renderResumo(){
    $('resumoTable').querySelector('tbody').innerHTML = talhoes.map(t=>{
      const s=somas(t.nome);
      return `<tr onclick="window.GMVSelecionar('${t.nome}', true)"><td><span class="tag">${t.nome}</span></td><td>${s.hojeV.toFixed(1)}</td><td>${s.mesV.toFixed(1)}</td><td>${s.safra.toFixed(1)}</td><td>${brDate(s.ultima)}</td></tr>`;
    }).join('');
  }
  function renderSelecionado(){
    const t=talhoes.find(x=>x.nome===selected); if(!t) return;
    const s=somas(t.nome);
    $('selectedInfo').innerHTML = `<h3>${t.nome} • ${t.area.toFixed(1)} ha</h3><div class="stats"><div class="stat">Hoje<br><b>${s.hojeV.toFixed(1)}</b> mm</div><div class="stat">Mês<br><b>${s.mesV.toFixed(1)}</b> mm</div><div class="stat">Safra<br><b>${s.safra.toFixed(1)}</b> mm</div><div class="stat">Última<br><b>${brDate(s.ultima)}</b></div></div>`;
  }
  function renderHistorico(){
    const rows = lancamentos.slice().sort((a,b)=>String(b.data).localeCompare(String(a.data))).map(l=>`<tr><td>${brDate(l.data)}</td><td>${l.talhao}</td><td>${Number(l.chuva).toFixed(1)} mm</td><td>${l.responsavel}</td><td>${l.obs||''}</td><td><button onclick="window.GMVExcluir(${l.id})">Excluir</button></td></tr>`).join('');
    $('histTable').querySelector('tbody').innerHTML = rows || '<tr><td colspan="6">Nenhum lançamento ainda.</td></tr>';
  }
  window.GMVExcluir = (id) => { if(confirm('Excluir lançamento?')){ lancamentos = lancamentos.filter(l=>l.id!==id); persistir(); atualizarTudo(); toast('Lançamento excluído'); } };

  function desenharGrafico(){
    const c=$('chart'); if(!c) return; const ctx=c.getContext('2d');
    ctx.clearRect(0,0,c.width,c.height); ctx.fillStyle='#eafff3'; ctx.font='18px Arial'; ctx.fillText('Acumulado da safra por talhão', 20, 30);
    const vals=talhoes.map(t=>({nome:t.nome, valor:somas(t.nome).safra}));
    const max=Math.max(10,...vals.map(v=>v.valor)); const left=60, top=55, w=c.width-100, h=c.height-110; const bw=w/vals.length*0.65;
    ctx.strokeStyle='rgba(255,255,255,.25)'; ctx.beginPath(); ctx.moveTo(left,top); ctx.lineTo(left,top+h); ctx.lineTo(left+w,top+h); ctx.stroke();
    vals.forEach((v,i)=>{ const x=left+i*(w/vals.length)+12; const bh=(v.valor/max)*h; ctx.fillStyle='#22c55e'; ctx.fillRect(x, top+h-bh, bw, bh); ctx.fillStyle='#fff'; ctx.font='12px Arial'; ctx.fillText(v.nome, x, top+h+18); ctx.fillText(v.valor.toFixed(0), x, top+h-bh-6); });
  }

  function exportCSV(){
    const header='data,talhao,chuva_mm,responsavel,observacao\n';
    const rows=lancamentos.map(l=>[l.data,l.talhao,l.chuva,l.responsavel,(l.obs||'').replaceAll(';',',')].join(';')).join('\n');
    download('gmv_chuvas.csv', header+rows, 'text/csv;charset=utf-8');
  }
  function backupJSON(){ download('backup_gmv_chuvas.json', JSON.stringify(lancamentos,null,2), 'application/json'); }
  function restoreJSON(e){ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ try{ lancamentos=JSON.parse(r.result); persistir(); atualizarTudo(); toast('Backup restaurado'); }catch{ toast('Backup inválido'); } }; r.readAsText(f); }
  function download(name, content, type){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([content],{type})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
  function toast(msg){ const el=document.createElement('div'); el.className='toast'; el.textContent=msg; document.body.appendChild(el); setTimeout(()=>el.remove(),3000); }
})();