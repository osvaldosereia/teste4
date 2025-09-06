
// direito.love — app.js (MVP limpo, simples, sem frescura)

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

function copiar(texto){ navigator.clipboard.writeText(texto).then(()=>alert("Copiado!")); }
function compartilhar(texto){
  if(navigator.share){ navigator.share({ text: texto }); } else { copiar(texto); }
}
async function getJSON(path){ const r = await fetch(path); return r.json(); }

// ===== Criador de Prompt (index) =====
const FIXAS = [
  "Conceito doutrinário","Fundamentação legal","Jurisprudência relevante",
  "Exemplos práticos","Quadro comparativo","Pontos de atenção",
  "Erros comuns","Checklist de peça","Teses favoráveis","Teses defensivas",
  "Princípios aplicáveis","Rito processual","Pedidos cabíveis","Requisitos","Resumo final"
];

async function buscarRelacionadosPorTema(tema){
  tema = (tema||'').toLowerCase();
  const [artigos, sumulas, jur] = await Promise.all([
    getJSON('kb/artigos.json'),
    getJSON('kb/sumulas.json'),
    getJSON('kb/jurisprudencia.json')
  ]);
  const ret = [];
  (artigos||[]).forEach(a=>{
    const alvo = (a.artigo + ' ' + a.texto + ' ' + a.codigo).toLowerCase();
    if(alvo.includes(tema)) ret.push({tipo:'Artigo', rotulo:`${a.codigo} — ${a.artigo}`, valor:`${a.codigo} — ${a.artigo}: ${a.texto}`});
  });
  (sumulas||[]).forEach(s=>{
    const alvo = (s.numero + ' ' + s.texto + ' ' + s.tribunal).toLowerCase();
    if(alvo.includes(tema)) ret.push({tipo:'Súmula', rotulo:`${s.tribunal} Súmula ${s.numero}`, valor:`${s.tribunal} Súmula ${s.numero}: ${s.texto}`});
  });
  (jur||[]).forEach(j=>{
    const alvo = (j.titulo + ' ' + j.texto + ' ' + j.tribunal).toLowerCase();
    if(alvo.includes(tema)) ret.push({tipo:'Jurisprudência', rotulo:`${j.tribunal} — ${j.titulo}`, valor:`${j.tribunal} — ${j.titulo}: ${j.texto}`});
  });
  return ret.slice(0, 20);
}

function renderOpcoesFixas(){
  const area = $('#lista-fixas');
  area.innerHTML = '';
  FIXAS.forEach((nome,i)=>{
    const id = 'fixa_'+i;
    const label = document.createElement('label'); label.className = 'option';
    label.innerHTML = `<input type="checkbox" name="opcao" value="${nome}"> <span>${nome}</span>`;
    area.appendChild(label);
  });
}

function renderRelacionados(lista){
  const sec = $('#sec-relacionados');
  const area = $('#lista-relacionados');
  area.innerHTML = '';
  if(!lista || !lista.length){ sec.classList.add('hidden'); return; }
  lista.forEach((item,i)=>{
    const label = document.createElement('label'); label.className = 'option';
    label.innerHTML = `<input type="checkbox" name="rel" value="${item.valor}"> <span>${item.rotulo}</span> <span class="badge">${item.tipo}</span>`;
    area.appendChild(label);
  });
  sec.classList.remove('hidden');
}

function buildPromptTexto(tema, opcoes, relacionados){
  const itens = [...opcoes, ...relacionados].filter(Boolean);
  const header = `Tema: ${tema}\nObjetivo: gerar explicação jurídica clara e prática.\n`;
  const blocos = itens.length ? ('\nIncluir:\n- ' + itens.join('\n- ')) : '';
  const fechamento = '\n\nEstilo: linguagem simples, objetiva e didática.';
  return header + blocos + fechamento;
}

function mostrarResultado(tema){
  const opcoes = $$('input[name=opcao]:checked').map(i=>i.value);
  const rel = $$('input[name=rel]:checked').map(i=>i.value);
  // Exibe lista (visível)
  const lista = $('#lista-escolhas');
  lista.innerHTML = '<ul>' + [...opcoes, ...rel].map(x=>`<li>${x}</li>`).join('') + '</ul>';
  // Gera texto completo (oculto em textarea)
  $('#output').value = buildPromptTexto(tema, opcoes, rel);
  $('#sec-resultado').classList.remove('hidden');
  window.scrollTo({ top: document.body.scrollHeight, behavior:'smooth' });
}

function initIndex(){
  // monta as opções fixas (fica pronto mas escondido até clicar em Buscar)
  renderOpcoesFixas();

  // 1) Clique em "Buscar"
  $('#btn-buscar').addEventListener('click', async ()=>{
    const tema = $('#tema').value.trim();
    if(!tema){ 
      alert('Digite um tema.'); 
      return; 
    }

    // mostra a seção de opções
    $('#sec-opcoes').classList.remove('hidden');

    // busca relacionados (JSON)
    const relacionados = await buscarRelacionadosPorTema(tema);

    // só exibe se tiver algum resultado
    renderRelacionados(relacionados);
  });

  // 2) Clique em "Gerar Prompt"
  $('#btn-gerar').addEventListener('click', ()=>{
    const tema = $('#tema').value.trim();
    if(!tema){ 
      alert('Digite um tema.'); 
      return; 
    }
    mostrarResultado(tema);
  });

  // 3) Clique em "Reiniciar"
  $('#btn-limpar').addEventListener('click', ()=>{
    location.reload();
  });

  // 4) Botões do resultado
  $('#btn-copiar').addEventListener('click', ()=> copiar($('#output').value));
  $('#btn-compartilhar').addEventListener('click', ()=> compartilhar($('#output').value));
}


// ===== List helpers (paginação simples por lote) =====
function paginar(arr, offset, limit){ return (arr || []).slice(offset, offset + limit); }
function filtrar(arr, termo, fn){ 
  const t = (termo||'').toLowerCase();
  if(!t) return arr;
  return (arr||[]).filter(o => fn(o).toLowerCase().includes(t));
}
function unique(arr){ return Array.from(new Set(arr)); }

async function initArtigos(){
  const data = await getJSON('kb/artigos.json');
  const codigos = unique(data.map(d=>d.codigo));
  const filtroSel = $('#filtro-codigo');
  filtroSel.innerHTML = '<option value="">Todos</option>' + codigos.map(c=>`<option value="${c}">${c}</option>`).join('');
  let offset = 0, cache = data;

  function render(){
    let items = cache;
    const cod = filtroSel.value;
    if(cod) items = items.filter(i=>i.codigo===cod);
    items = filtrar(items, $('#busca-artigos').value, i=> i.artigo + ' ' + i.texto + ' ' + i.codigo);
    const bloco = paginar(items, offset, 10);
    const area = $('#lista-artigos');
    if(offset === 0) area.innerHTML = '';
    bloco.forEach(it=>{
      const wrap = document.createElement('div');
      wrap.innerHTML = `<strong>${it.artigo}</strong> — ${it.texto}<br/>`;
      const btn = document.createElement('button'); btn.className='btn small'; btn.textContent='Copiar';
     btn.onclick = ()=> copiar(`${it.artigo} — ${it.texto}`);
      wrap.appendChild(btn);
      area.appendChild(wrap);
      area.appendChild(document.createElement('hr'));
    });
    $('#btn-mais-artigos').style.display = (offset + 10) < items.length ? 'inline-block' : 'none';
  }

  $('#busca-artigos').addEventListener('input', ()=>{ offset=0; render(); });
  filtroSel.addEventListener('change', ()=>{ offset=0; render(); });
  $('#btn-mais-artigos').addEventListener('click', ()=>{ offset += 10; render(); });
  render();
}

async function initSumulas(){
  const data = await getJSON('kb/sumulas.json');
  const tribs = unique(data.map(d=>d.tribunal));
  const filtro = $('#filtro-tribunal-sum');
  filtro.innerHTML = '<option value="">Todos</option>' + tribs.map(t=>`<option value="${t}">${t}</option>`).join('');
  let offset = 0;

  function render(){
    let items = data;
    const trib = filtro.value;
    if(trib) items = items.filter(i=>i.tribunal===trib);
    items = filtrar(items, $('#busca-sumulas').value, i=> i.numero + ' ' + i.texto + ' ' + i.tribunal);
    const bloco = paginar(items, offset, 10);
    const area = $('#lista-sumulas');
    if(offset === 0) area.innerHTML = '';
    bloco.forEach(it=>{
      const wrap = document.createElement('div');
      wrap.innerHTML = `<strong>${it.tribunal} Súmula ${it.numero}</strong> — ${it.texto}<br/>`;
      const btn = document.createElement('button'); btn.className='btn small'; btn.textContent='Copiar';
      btn.onclick = ()=> copiar(`${it.tribunal} Súmula ${it.numero} — ${it.texto}`);
      wrap.appendChild(btn);
      area.appendChild(wrap);
      area.appendChild(document.createElement('hr'));
    });
    $('#btn-mais-sumulas').style.display = (offset + 10) < items.length ? 'inline-block' : 'none';
  }
  $('#busca-sumulas').addEventListener('input', ()=>{ offset=0; render(); });
  filtro.addEventListener('change', ()=>{ offset=0; render(); });
  $('#btn-mais-sumulas').addEventListener('click', ()=>{ offset += 10; render(); });
  render();
}

async function initJuris(){
  const data = await getJSON('kb/jurisprudencia.json');
  const tribs = unique(data.map(d=>d.tribunal));
  const filtro = $('#filtro-tribunal-jur');
  filtro.innerHTML = '<option value="">Todos</option>' + tribs.map(t=>`<option value="${t}">${t}</option>`).join('');
  let offset = 0;

  function render(){
    let items = data;
    const trib = filtro.value;
    if(trib) items = items.filter(i=>i.tribunal===trib);
    items = filtrar(items, $('#busca-jur').value, i=> i.titulo + ' ' + i.texto + ' ' + i.tribunal);
    const bloco = paginar(items, offset, 10);
    const area = $('#lista-jur');
    if(offset === 0) area.innerHTML = '';
    bloco.forEach(it=>{
      const wrap = document.createElement('div');
      wrap.innerHTML = `<strong>${it.tribunal} — ${it.titulo}</strong><br/>${it.texto}<br/>`;
      const btn = document.createElement('button'); btn.className='btn small'; btn.textContent='Copiar';
      btn.onclick = ()=> copiar(`${it.tribunal} — ${it.titulo}: ${it.texto}`);
      wrap.appendChild(btn);
      area.appendChild(wrap);
      area.appendChild(document.createElement('hr'));
    });
    $('#btn-mais-jur').style.display = (offset + 10) < items.length ? 'inline-block' : 'none';
  }
  $('#busca-jur').addEventListener('input', ()=>{ offset=0; render(); });
  filtro.addEventListener('change', ()=>{ offset=0; render(); });
  $('#btn-mais-jur').addEventListener('click', ()=>{ offset += 10; render(); });
  render();
}

async function initLivros(){
  const data = await getJSON('kb/livros.json');
  const cats = unique(data.map(d=>d.categoria));
  const filtro = $('#filtro-categoria-livro');
  filtro.innerHTML = '<option value="">Todas</option>' + cats.map(c=>`<option value="${c}">${c}</option>`).join('');
  let offset = 0;

  function render(){
    let items = data;
    const cat = filtro.value;
    if(cat) items = items.filter(i=>i.categoria===cat);
    items = filtrar(items, $('#busca-livros').value, i=> i.titulo + ' ' + i.site);
    const bloco = paginar(items, offset, 10);
    const area = $('#lista-livros');
    if(offset === 0) area.innerHTML = '';
    bloco.forEach(it=>{
      const wrap = document.createElement('div');
      wrap.innerHTML = `<strong>“${it.titulo}”</strong> — Site: ${it.site} <br/>`;
      const btn = document.createElement('button'); btn.className='btn small'; btn.textContent='Abrir';
      btn.onclick = ()=> window.open(it.link, '_blank');
      wrap.appendChild(btn);
      area.appendChild(wrap);
      area.appendChild(document.createElement('hr'));
    });
    $('#btn-mais-livros').style.display = (offset + 10) < items.length ? 'inline-block' : 'none';
  }
  $('#busca-livros').addEventListener('input', ()=>{ offset=0; render(); });
  filtro.addEventListener('change', ()=>{ offset=0; render(); });
  $('#btn-mais-livros').addEventListener('click', ()=>{ offset += 10; render(); });
  render();
}

async function initVideos(){
  const data = await getJSON('kb/videos.json');
  const canais = unique(data.map(d=>d.canal));
  const filtro = $('#filtro-canal-video');
  filtro.innerHTML = '<option value="">Todos</option>' + canais.map(c=>`<option value="${c}">${c}</option>`).join('');
  let offset = 0;

  function render(){
    let items = data;
    const can = filtro.value;
    if(can) items = items.filter(i=>i.canal===can);
    items = filtrar(items, $('#busca-videos').value, i=> i.titulo + ' ' + i.canal);
    const bloco = paginar(items, offset, 10);
    const area = $('#lista-videos');
    if(offset === 0) area.innerHTML = '';
    bloco.forEach(it=>{
      const wrap = document.createElement('div');
      wrap.innerHTML = `<strong>“${it.titulo}”</strong> — Canal: ${it.canal} <br/>`;
      const btn = document.createElement('button'); btn.className='btn small'; btn.textContent='Abrir';
      btn.onclick = ()=> window.open(it.link, '_blank');
      wrap.appendChild(btn);
      area.appendChild(wrap);
      area.appendChild(document.createElement('hr'));
    });
    $('#btn-mais-videos').style.display = (offset + 10) < items.length ? 'inline-block' : 'none';
  }
  $('#busca-videos').addEventListener('input', ()=>{ offset=0; render(); });
  filtro.addEventListener('change', ()=>{ offset=0; render(); });
  $('#btn-mais-videos').addEventListener('click', ()=>{ offset += 10; render(); });
  render();
}

async function initNoticias(){
  const data = await getJSON('kb/noticias.json');
  const fontes = unique(data.map(d=>d.fonte));
  const filtro = $('#filtro-fonte-not');
  filtro.innerHTML = '<option value="">Todas</option>' + fontes.map(f=>`<option value="${f}">${f}</option>`).join('');
  let offset = 0;

  function render(){
    let items = data;
    const f = filtro.value;
    if(f) items = items.filter(i=>i.fonte===f);
    items = filtrar(items, $('#busca-noticias').value, i=> i.titulo + ' ' + i.fonte);
    const bloco = paginar(items, offset, 10);
    const area = $('#lista-noticias');
    if(offset === 0) area.innerHTML = '';
    bloco.forEach(it=>{
      const wrap = document.createElement('div');
      wrap.innerHTML = `<strong>${it.titulo}</strong> — ${it.fonte} — ${it.data}<br/>`;
      const btn = document.createElement('button'); btn.className='btn small'; btn.textContent='Abrir';
      btn.onclick = ()=> window.open(it.link, '_blank');
      wrap.appendChild(btn);
      area.appendChild(wrap);
      area.appendChild(document.createElement('hr'));
    });
    $('#btn-mais-noticias').style.display = (offset + 10) < items.length ? 'inline-block' : 'none';
  }
  $('#busca-noticias').addEventListener('input', ()=>{ offset=0; render(); });
  filtro.addEventListener('change', ()=>{ offset=0; render(); });
  $('#btn-mais-noticias').addEventListener('click', ()=>{ offset += 10; render(); });
  render();
}

// ===== Router =====
function initPage(){
  const page = document.body.dataset.page;
  if(page==='index') initIndex();
  if(page==='artigos') initArtigos();
  if(page==='sumulas') initSumulas();
  if(page==='jurisprudencia') initJuris();
  if(page==='livros') initLivros();
  if(page==='videos') initVideos();
  if(page==='noticias') initNoticias();
}

document.addEventListener('DOMContentLoaded', ()=>{
  initPage();
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('service-worker.js'); }
});
