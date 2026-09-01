(() => {
  // Dashboard bindings are top-level lexical variables, not window properties.
  const S = typeof _supabase !== 'undefined' ? _supabase : window._supabase;
  const currentUniversity = () => typeof userUniversity !== 'undefined' ? userUniversity : window.userUniversity || '';
  const currentUser = () => typeof currentUserId !== 'undefined' ? currentUserId : window.currentUserId || '';
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];

  function injectStyle() {
    if ($('#icos-enhancement-style')) return;
    const style = document.createElement('style');
    style.id = 'icos-enhancement-style';
    style.textContent = `
      :root{--icos-green:#22c55e;--icos-green-soft:#4ade80;--icos-green-deep:#15803d;--icos-ink:#05070c;--icos-panel:rgba(15,23,42,.58);--icos-soft-panel:rgba(15,23,42,.38);--icos-glow:rgba(34,197,94,.18)}
      body{background:radial-gradient(760px 420px at 50% -10%,rgba(34,197,94,.10),transparent 62%),radial-gradient(600px 360px at 95% 18%,rgba(16,185,129,.05),transparent 65%),radial-gradient(480px 260px at 10% 18%,rgba(52,211,153,.05),transparent 65%),#05070c!important}
      body:before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.12;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:52px 52px;mask-image:radial-gradient(circle at 50% 15%,#000,transparent 76%)}
      body:after{content:"";position:fixed;inset:-12% -10% auto auto;width:min(46vw,540px);height:min(46vw,540px);border-radius:50%;background:radial-gradient(circle,rgba(34,197,94,.18),rgba(34,197,94,0) 62%);filter:blur(90px);pointer-events:none;z-index:0;opacity:.9}
      nav{border-bottom:1px solid rgba(74,222,128,.12)!important;box-shadow:0 12px 40px rgba(0,0,0,.18)}
      main{position:relative;z-index:1}
      .nav-glass{background:linear-gradient(180deg,rgba(8,12,18,.86),rgba(8,12,18,.72))!important;border:1px solid rgba(74,222,128,.1)!important;box-shadow:0 18px 55px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.03)!important}
      .glass-card,.study-card,.study-search,.study-stat,.study-resource,.orbit-composer-card,.orbit-post,.whisper-card,.profile-setting-row,.chat-panel,.chat-workspace{background:linear-gradient(180deg,rgba(15,23,42,.54),rgba(15,23,42,.36))!important;border:1px solid rgba(148,163,184,.08);box-shadow:0 18px 60px rgba(0,0,0,.12),inset 0 1px 0 rgba(255,255,255,.02);transition:transform .22s cubic-bezier(.22,1,.36,1),border-color .22s ease,box-shadow .22s ease,background .22s ease}
      .glass-card,.study-card,.study-search,.study-stat,.study-resource,.orbit-composer-card,.orbit-post,.whisper-card,.profile-setting-row,.chat-panel,.chat-workspace{position:relative;overflow:hidden}
      .glass-card:before,.study-card:before,.profile-setting-row:before,.chat-panel:before,.whisper-card:before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(135deg,rgba(255,255,255,.04),transparent 40%);opacity:.9}
      @media(hover:hover){.glass-card:hover,.study-card:hover,.study-resource:hover,.orbit-post:hover,.profile-setting-row:hover,.chat-conversation-item:hover,.chat-search-result:hover{transform:translateY(-2px);border-color:rgba(74,222,128,.18)!important;box-shadow:0 24px 70px rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.03)}}
      .icos-brand{display:inline-flex;align-items:baseline;gap:.14em;letter-spacing:-.055em}.icos-brand .uni{color:#fff}.icos-brand .verse{color:#22c55e}.icos-brand .icos{color:#fff;font-size:.62em;letter-spacing:.08em;margin-left:.18em}
      .icos-brand-mark{font-weight:900}
      .scholar-gradient,.chat-primary-btn,.study-btn.primary,.whisper-submit,.orbit-submit,.tribe-btn.primary{background:linear-gradient(135deg,#34d399 0%,#22c55e 30%,#15803d 100%)!important;border:1px solid rgba(74,222,128,.28)!important;box-shadow:0 18px 28px -18px rgba(34,197,94,.7),0 10px 30px rgba(34,197,94,.18)!important}
      .scholar-gradient,.chat-primary-btn,.study-btn.primary,.whisper-submit,.orbit-submit,.tribe-btn.primary{transition:transform .2s ease, box-shadow .2s ease, filter .2s ease}
      @media(hover:hover){.scholar-gradient:hover,.chat-primary-btn:hover,.study-btn.primary:hover,.whisper-submit:hover,.orbit-submit:hover,.tribe-btn.primary:hover{transform:translateY(-1px);filter:saturate(1.04)}}
      .profile-setting-row{padding:14px 16px;border-radius:18px;background:rgba(15,23,42,.5);border:1px solid rgba(148,163,184,.08)}
      .profile-setting-row-danger{background:linear-gradient(90deg,rgba(127,29,29,.18),rgba(15,23,42,.56));border-color:rgba(248,113,113,.15)}
      .tribe-card{border:1px solid rgba(74,222,128,.12);background:linear-gradient(145deg,rgba(34,197,94,.08),rgba(255,255,255,.025));border-radius:20px;padding:14px;cursor:pointer;transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease;box-shadow:0 12px 30px rgba(15,23,42,.12)}
      .tribe-card:hover{border-color:rgba(74,222,128,.3);background:linear-gradient(145deg,rgba(34,197,94,.12),rgba(255,255,255,.035));transform:translateY(-1px)}
      .tribe-pill{display:inline-flex;align-items:center;gap:5px;padding:5px 8px;border-radius:999px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.13);color:#86efac;font-size:9px;font-weight:800}
      .tribe-modal-backdrop{position:fixed;inset:0;z-index:500;display:flex;align-items:flex-end;justify-content:center;padding:12px;background:rgba(1,4,8,.82);backdrop-filter:blur(12px)}
      .tribe-modal{width:min(100%,720px);max-height:92dvh;overflow:auto;border:1px solid rgba(74,222,128,.14);border-radius:28px;background:linear-gradient(180deg,#091019,#0c1423);box-shadow:0 35px 120px rgba(0,0,0,.55);padding:18px}
      .tribe-input{width:100%;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.035);color:#fff;padding:12px;outline:none}.tribe-input:focus{border-color:rgba(34,197,94,.5);box-shadow:0 0 0 3px rgba(34,197,94,.08)}
      .tribe-btn{min-height:40px;border-radius:13px;padding:9px 13px;font-size:11px;font-weight:900;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:#cbd5e1}.tribe-btn.primary{background:#22c55e;color:#052e16;border-color:#22c55e}.tribe-btn:disabled{opacity:.5}
      .tribe-resource{display:flex;align-items:center;gap:10px;padding:11px;border:1px solid rgba(255,255,255,.06);border-radius:14px;background:rgba(255,255,255,.025)}
      .tribe-file{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:rgba(34,197,94,.08);color:#4ade80}
      @media(max-width:640px){.tribe-modal-backdrop{align-items:flex-end;padding:8px}.tribe-modal{border-radius:24px 24px 12px 12px}.icos-brand .icos{font-size:.58em}}
    `;
    document.head.appendChild(style);
  }

  function brandNode(node) {
    if (node.nodeType !== Node.TEXT_NODE || !node.nodeValue || !/Uni\s*Verse(?:\s+ICOS)?/i.test(node.nodeValue)) return;
    if (node.parentElement?.closest('.icos-brand')) return;
    const text = node.nodeValue;
    if (!/Uni\s*Verse(?:\s+ICOS)?/i.test(text)) return;
    const frag = document.createDocumentFragment();
    const parts = text.split(/(Uni\s*Verse(?:\s+ICOS)?)/gi);
    parts.forEach(part => {
      if (/^Uni\s*Verse(?:\s+ICOS)?$/i.test(part)) {
        const m = document.createElement('span');
        m.className='icos-brand';
        m.innerHTML='<span class="uni">Uni</span><span class="verse">Verse</span><span class="icos">ICOS</span>';
        frag.appendChild(m);
      } else if (part) frag.appendChild(document.createTextNode(part));
    });
    node.replaceWith(frag);
  }

  function applyBrand(root=document.body) {
    if (root === document.body) {
      const nextTitle = document.title.replace(/Uni\s*Verse(?:\s*ICOS)?/gi, 'UniVerse ICOS');
      document.title = nextTitle;
    }
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(brandNode);
  }

  function modal(html) {
    const old=$('#icosTribeModal'); old?.remove();
    const wrap=document.createElement('div');wrap.id='icosTribeModal';wrap.className='tribe-modal-backdrop';wrap.innerHTML=`<div class="tribe-modal">${html}</div>`;document.body.appendChild(wrap);
    wrap.addEventListener('click',e=>{if(e.target===wrap)wrap.remove()});return wrap;
  }
  const esc=v=>{const d=document.createElement('div');d.textContent=v??'';return d.innerHTML};

  async function tribeCounts(ids){
    if(!ids.length)return new Map();
    const {data,error}=await S.from('tribe_members').select('tribe_id').in('tribe_id',ids);if(error)throw error;
    const m=new Map();(data||[]).forEach(x=>m.set(x.tribe_id,(m.get(x.tribe_id)||0)+1));return m;
  }

  async function loadTribes(){
    if(!S||!currentUniversity())return [];
    const {data,error}=await S.from('tribes').select('id,name,description,university,course_code,department,level,category,creator_id,created_at').eq('university',currentUniversity()).order('created_at',{ascending:false}).limit(30);
    if(error)throw error;
    const counts=await tribeCounts((data||[]).map(x=>x.id));return (data||[]).map(x=>({...x,member_count:counts.get(x.id)||0}));
  }

  function tribesSection(){
    const state=$('#studyTribesState'); if(!state)return;
    const card=state.closest('.study-card'); if(!card)return;
    let action=$('#icosCreateTribeBtn');
    if(!action){
      action=document.createElement('button');action.id='icosCreateTribeBtn';action.className='study-btn primary';action.innerHTML='<i class="fas fa-users"></i> Create Tribe';action.onclick=openCreateTribe;
      card.querySelector('.study-section-head')?.appendChild(action);
    }
    return state;
  }

  async function renderTribes(){
    const state=tribesSection();if(!state)return;
    if (renderTribes.loading) return;
    renderTribes.loading=true;
    state.innerHTML='<span class="study-note">Loading campus tribes…</span>';
    try{
      const tribes=await loadTribes();
      if(!tribes.length){state.innerHTML='<div class="study-empty" style="padding:18px"><div class="study-empty-icon"><i class="fas fa-users"></i></div><h4>No Study Tribes yet</h4><p>Create the first tribe for your campus.</p></div>';return;}
      state.innerHTML=`<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">${tribes.map(t=>`<article class="tribe-card" data-tribe="${esc(t.id)}"><div class="flex items-start justify-between gap-2"><div><div class="study-course-code">${esc(t.course_code||'CAMPUS TRIBE')}</div><h4 class="text-sm font-bold text-white mt-1">${esc(t.name)}</h4></div><i class="fas fa-arrow-up-right-from-square text-slate-600"></i></div><p class="text-[10px] text-slate-500 mt-2 line-clamp-2">${esc(t.description||'A student-led study community.')}</p><div class="flex flex-wrap gap-1 mt-3"><span class="tribe-pill"><i class="fas fa-user-group"></i>${t.member_count} member${t.member_count===1?'':'s'}</span>${t.level?`<span class="tribe-pill">${esc(t.level)}</span>`:''}</div></article>`).join('')}</div>`;
      $$('.tribe-card',state).forEach(el=>el.onclick=()=>openTribe(el.dataset.tribe));
    }catch(e){console.error(e);state.innerHTML='<span class="study-note text-red-400">Could not load Study Tribes. Check your connection or permissions and try again.</span>'}
    finally { renderTribes.loading=false; }
  }

  function openCreateTribe(){
    const wrap=modal(`<div class="flex items-start justify-between gap-3"><div><div class="study-kicker">STUDY TRIBE</div><h3 class="text-xl font-bold text-white mt-1">Create your study tribe</h3><p class="text-xs text-slate-500 mt-1">Build a focused campus group around a course, department or goal.</p></div><button class="tribe-btn" data-close><i class="fas fa-times"></i></button></div><form id="tribeCreateForm" class="space-y-3 mt-5"><input id="tribeName" class="tribe-input" maxlength="80" required placeholder="Tribe name • e.g. CSC 301 Mastery"><textarea id="tribeDesc" class="tribe-input" maxlength="500" rows="3" placeholder="What is this tribe for?"></textarea><div class="grid grid-cols-1 sm:grid-cols-2 gap-2"><input id="tribeCourse" class="tribe-input" maxlength="40" placeholder="Course code • e.g. CSC301"><input id="tribeLevel" class="tribe-input" maxlength="40" placeholder="Level • e.g. 300 Level"></div><select id="tribeCategory" class="tribe-input"><option value="course">Course</option><option value="department">Department</option><option value="exam">Exam Prep</option><option value="project">Project</option><option value="general">General Study</option></select><div id="tribeCreateStatus" class="text-[10px] text-red-400 min-h-[14px]"></div><div class="flex gap-2"><button type="button" class="tribe-btn flex-1" data-close>Cancel</button><button class="tribe-btn primary flex-1" id="tribeCreateSubmit"><i class="fas fa-plus"></i> Create Tribe</button></div></form>`);
    $$('[data-close]',wrap).forEach(b=>b.onclick=()=>wrap.remove());
    $('#tribeCreateForm',wrap).onsubmit=async e=>{e.preventDefault();const b=$('#tribeCreateSubmit',wrap),status=$('#tribeCreateStatus',wrap);b.disabled=true;status.textContent='Creating tribe…';try{const payload={name:$('#tribeName',wrap).value.trim(),description:$('#tribeDesc',wrap).value.trim()||null,university:currentUniversity(),course_code:$('#tribeCourse',wrap).value.trim()||null,level:$('#tribeLevel',wrap).value.trim()||null,category:$('#tribeCategory',wrap).value,creator_id:currentUser()};if(!payload.name)throw new Error('Give the tribe a name.');const {data,error}=await S.from('tribes').insert(payload).select('*').single();if(error)throw error;const {error:memberError}=await S.from('tribe_members').insert({tribe_id:data.id,user_id:currentUser(),role:'owner'});if(memberError)throw memberError;wrap.remove();await renderTribes();openTribe(data.id)}catch(err){console.error(err);status.textContent='Could not create the tribe. Check your campus profile and try again.';b.disabled=false}};
  }

  async function openTribe(id){
    const wrap=modal('<div class="study-empty"><div class="study-empty-icon"><i class="fas fa-spinner fa-spin"></i></div><h4>Opening tribe…</h4></div>');
    try{
      const {data:tribe,error}=await S.from('tribes').select('*').eq('id',id).single();if(error)throw error;
      const {data:members}=await S.from('tribe_members').select('user_id,role').eq('tribe_id',id);
      const {data:resources,error:resErr}=await S.from('study_resources').select('id,title,description,file_type,mime_type,course_code,resource_type,academic_year,semester,storage_path,original_filename,file_size_bytes,uploader_id,created_at').eq('tribe_id',id).order('created_at',{ascending:false}).limit(30);if(resErr)throw resErr;
      const joined=(members||[]).some(m=>m.user_id===currentUser());
      wrap.querySelector('.tribe-modal').innerHTML=`<div class="flex items-start justify-between gap-3"><div><div class="study-kicker">${esc(tribe.course_code||'STUDY TRIBE')}</div><h3 class="text-xl font-bold text-white mt-1">${esc(tribe.name)}</h3><p class="text-xs text-slate-500 mt-1">${esc(tribe.description||'Student-led study community.')}</p></div><button class="tribe-btn" data-close><i class="fas fa-times"></i></button></div><div class="flex flex-wrap gap-2 mt-4"><span class="tribe-pill"><i class="fas fa-users"></i>${(members||[]).length} members</span>${tribe.level?`<span class="tribe-pill">${esc(tribe.level)}</span>`:''}</div><div class="flex gap-2 mt-5"><button class="tribe-btn primary" id="tribeUploadBtn"><i class="fas fa-cloud-arrow-up"></i> Upload Document</button>${joined?'':'<button class="tribe-btn" id="tribeJoinBtn"><i class="fas fa-user-plus"></i> Join Tribe</button>'}</div><div class="mt-5"><div class="flex items-center justify-between"><h4 class="text-sm font-bold text-white">Shared documents</h4><span class="study-note">${(resources||[]).length} files</span></div><div id="tribeResourceList" class="space-y-2 mt-3">${resources?.length?resources.map(r=>`<div class="tribe-resource"><div class="tribe-file"><i class="fas fa-file-lines"></i></div><div class="min-w-0 flex-1"><div class="text-xs font-bold text-white truncate">${esc(r.title)}</div><div class="text-[9px] text-slate-500">${esc(r.file_type||'Document')} ${r.academic_year?'• '+r.academic_year:''}</div></div><button class="tribe-btn" data-resource="${esc(r.id)}"><i class="fas fa-eye"></i> View</button></div>`).join(''):'<div class="study-empty" style="padding:20px"><div class="study-empty-icon"><i class="fas fa-file-arrow-up"></i></div><h4>No documents yet</h4><p>Upload the first material for this tribe.</p></div>'}</div></div>`;
      $$('[data-close]',wrap).forEach(b=>b.onclick=()=>wrap.remove());
      $('#tribeJoinBtn',wrap)?.addEventListener('click',async e=>{e.currentTarget.disabled=true;const {error}=await S.from('tribe_members').insert({tribe_id:id,user_id:currentUser(),role:'member'});if(error){alert('Could not join this tribe.');e.currentTarget.disabled=false}else{e.currentTarget.remove();await renderTribes()}});
      $('#tribeUploadBtn',wrap).onclick=()=>openTribeUpload(id,wrap);
      $$('[data-resource]',wrap).forEach(b=>b.onclick=()=>openTribeResource(b.dataset.resource,wrap));
    }catch(e){console.error(e);wrap.querySelector('.tribe-modal').innerHTML='<div class="study-empty"><div class="study-empty-icon"><i class="fas fa-triangle-exclamation"></i></div><h4>Could not open tribe</h4><p>Please try again.</p><button class="tribe-btn primary" data-close>Close</button></div>';wrap.querySelector('[data-close]').onclick=()=>wrap.remove()}
  }

  function openTribeUpload(id,parent){
    const box=document.createElement('div');box.className='fixed inset-0 z-[520] flex items-end sm:items-center justify-center p-3 bg-black/60 backdrop-blur-sm';box.innerHTML=`<div class="tribe-modal max-w-lg"><div class="flex justify-between"><div><div class="study-kicker">TRIBE DOCUMENT</div><h3 class="text-lg font-bold text-white">Upload to this tribe</h3></div><button class="tribe-btn" data-x><i class="fas fa-times"></i></button></div><form id="tribeUploadForm" class="space-y-3 mt-4"><input id="tribeFileTitle" class="tribe-input" maxlength="160" required placeholder="Document title"><textarea id="tribeFileDesc" class="tribe-input" rows="2" maxlength="500" placeholder="Short description"></textarea><input id="tribeFile" class="tribe-input" type="file" accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain" required><div id="tribeUploadStatus" class="text-[10px] text-slate-500"></div><button class="tribe-btn primary w-full" id="tribeUploadSubmit"><i class="fas fa-upload"></i> Upload document</button></form></div>`;document.body.appendChild(box);box.querySelector('[data-x]').onclick=()=>box.remove();box.onclick=e=>{if(e.target===box)box.remove()};box.querySelector('#tribeUploadForm').onsubmit=async e=>{e.preventDefault();const f=$('#tribeFile',box).files?.[0],b=$('#tribeUploadSubmit',box),st=$('#tribeUploadStatus',box);if(!f)return;if(f.size>50*1024*1024){st.textContent='Maximum file size is 50 MB.';return}b.disabled=true;st.textContent='Uploading securely…';const safe=f.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-160);const path=`${currentUniversity()}/${currentUser()}/${crypto.randomUUID()}_${safe}`;try{const up=await S.storage.from('study-resources').upload(path,f,{contentType:f.type||'application/octet-stream'});if(up.error)throw up.error;const ins=await S.from('study_resources').insert({title:$('#tribeFileTitle',box).value.trim(),description:$('#tribeFileDesc',box).value.trim()||null,file_url:path,file_type:f.name.split('.').pop()?.toUpperCase()||null,mime_type:f.type||null,university:currentUniversity(),tribe_id:id,uploader_id:currentUser(),storage_path:path,original_filename:f.name,file_size_bytes:f.size,category:'Study Tribe',resource_type:'material'}).select('id').single();if(ins.error)throw ins.error;st.textContent='Uploaded. Refreshing tribe…';box.remove();parent.remove();openTribe(id)}catch(err){console.error(err);st.textContent='Upload failed. You may not have upload permission yet.';try{await S.storage.from('study-resources').remove([path])}catch(_){}b.disabled=false}};
  }

  async function openTribeResource(id,parent){
    try{const {data:r,error}=await S.from('study_resources').select('id,title,description,file_type,mime_type,course_code,academic_year,semester,storage_path,original_filename,file_size_bytes').eq('id',id).single();if(error)throw error;const {data,error:fnErr}=await S.functions.invoke('study-resource-access',{body:{resource_id:id,download:false}});if(fnErr||!data?.url)throw fnErr||new Error('No access URL');const w=modal(`<div class="flex justify-between items-start"><div><div class="study-kicker">DOCUMENT</div><h3 class="text-lg font-bold text-white">${esc(r.title)}</h3></div><button class="tribe-btn" data-close><i class="fas fa-times"></i></button></div><p class="text-xs text-slate-500 mt-2">${esc(r.description||r.original_filename||'Study document')}</p><iframe class="study-viewer mt-4" src="${esc(data.url)}" title="${esc(r.title)}"></iframe><div class="flex gap-2 mt-3"><button class="tribe-btn primary" id="tribeDownload"><i class="fas fa-download"></i> Download</button></div>`);w.querySelector('[data-close]').onclick=()=>w.remove();w.querySelector('#tribeDownload').onclick=async()=>{const x=await S.functions.invoke('study-resource-access',{body:{resource_id:id,download:true}});if(x.data?.url)window.open(x.data.url,'_blank','noopener,noreferrer')}}catch(e){console.error(e);alert('This document could not be opened.')}
  }

  function boot(){
    injectStyle();
    applyBrand();
    if(location.pathname.endsWith('dashboard.html')||$('#studyPage')) {
      setTimeout(renderTribes,1200);
      setTimeout(renderTribes,3000);
      document.querySelectorAll('[onclick="showPage(\'study\')"]').forEach(el=>el.addEventListener('click',()=>setTimeout(renderTribes,350)));
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
