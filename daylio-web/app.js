(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const assets = 'assets/';
  const todayLabel = new Date().toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric', timeZone:'Asia/Jakarta' });
  let role = 'owner';
  let page = 'home';
  const safe = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const phoneContent = $('#phoneContent');
  const demoDescription = $('#demoDescription');
  const roleContent = {
    parent: {
      eyebrow:'UNTUK ORANG TUA',title:'Tetap dekat dengan si kecil, walau sedang bekerja.',summary:'Orang tua mendapatkan gambaran aktivitas anak tanpa perlu terus-menerus menghubungi pengasuh.',
      points:[['Live CCTV yang terkontrol','Lihat area bersama melalui akses yang disetujui.'],['Aktivitas setiap hari','Makan, bermain, tidur, dan catatan penting tersusun menjadi satu timeline.'],['Bertanya kepada LEO','Jawaban dari catatan pengasuh yang tersedia dan diizinkan.']]
    },
    caregiver: {
      eyebrow:'UNTUK PENGASUH',title:'Mencatat kegiatan anak bisa sepraktis ini.',summary:'Semakin sedikit waktu mencatat, semakin banyak perhatian untuk anak.',
      points:[['Pilih anak yang diasuh','Lihat anak dan kelas yang menjadi tanggung jawab Anda.'],['Catat dalam beberapa klik','Pilih makan, tidur, atau bermain dan tulis catatan singkat.'],['Satu catatan, tersambung ke orang tua','Laporan kegiatan tersusun dalam timeline orang tua.']]
    },
    owner: {
      eyebrow:'UNTUK PENGELOLA',title:'Bangun kepercayaan orang tua sambil mengelola daycare lebih praktis.',summary:'Pantau kehadiran, kegiatan pengasuh, dan laporan agar operasional lebih mudah dikelola.',
      points:[['Satu ringkasan harian','Kehadiran dan aktivitas terdata dalam satu dashboard.'],['Review kegiatan tim','Lihat catatan yang dibuat pengasuh dalam satu tempat.'],['Bantu calon orang tua lebih yakin','Tunjukkan pengalaman aplikasi saat calon keluarga mengunjungi daycare.']]
    }
  };
  function renderPhone(){
    const labels={owner:'Ringkasan daycare',parent:'Kabar si kecil',caregiver:'Catat kegiatan anak'};
    phoneContent.innerHTML=`<div class="screen-pad"><div class="screen-header"><div class="screen-brand">Daylio</div></div><h3>${labels[role]}</h3><p>Masuk untuk mengakses catatan dan layanan daycare sesuai izin Anda.</p><a class="screen-primary" href="/workspace">Masuk ke Daylio →</a><div class="screen-demo-label">Akses pribadi untuk pengelola, pengasuh, dan wali yang terhubung.</div></div>`;
    let d=roleContent[role];
    demoDescription.innerHTML=`<div class="eyebrow">${d.eyebrow}</div><h3>${d.title}</h3><p>${d.summary}</p><div class="demo-points">${d.points.map(([h,p])=>`<div><span class="demo-point-icon">✓</span><div><strong>${h}</strong><p>${p}</p></div></div>`).join('')}</div><button class="btn btn-coral" data-demo>Jadwalkan Demo Daylio →</button>`;
  }
  function changeRole(r){role=r;page='home';$$('.role-tab').forEach(t=>{let on=t.dataset.role===r;t.classList.toggle('active',on);t.setAttribute('aria-selected',String(on))});renderPhone()}
  document.addEventListener('click', ev=>{
    let roleBtn=ev.target.closest('[data-role]');if(roleBtn){changeRole(roleBtn.dataset.role);return}
    let feature=ev.target.closest('[data-feature]');if(feature){changeRole(feature.dataset.feature==='owner'?'owner':'parent');$('#aplikasi').scrollIntoView({behavior:'smooth'});return}
    if(ev.target.closest('[data-demo]'))openModal();
  });
  const modal=$('#demoModal');function openModal(){modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';modal.querySelector('input')?.focus()}function closeModal(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.style.overflow=''}
  $$('[data-demo]').forEach(b=>b.addEventListener('click',openModal));$('#closeModal').addEventListener('click',closeModal);modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))closeModal()});
  $('#demoForm').addEventListener('submit',async ev=>{
    ev.preventDefault();const form=ev.target;const button=form.querySelector('[type=submit]');const status=$('#demoStatus');const fd=new FormData(form);button.disabled=true;status.textContent='Menyimpan permintaan…';
    try{const response=await fetch('/api/v1/public/demo-requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:fd.get('name'),daycare:fd.get('daycare'),contact:fd.get('contact'),children:fd.get('children'),cctv:fd.get('cctv'),consent:fd.get('consent')==='on',website:fd.get('website')||''})});const result=await response.json();if(!response.ok)throw new Error(result.error?.message||'Permintaan gagal.');
    status.textContent='Permintaan tersimpan. Buka WhatsApp untuk mengirim pesan konsultasi.';
    const msg=`Halo tim Elenio, saya ingin menjadwalkan demo Daylio. Nama: ${fd.get('name')}. Daycare: ${fd.get('daycare')}. Jumlah anak: ${fd.get('children')}. CCTV: ${fd.get('cctv')}.`;
    const link=document.createElement('a');link.href=`https://wa.me/6281933328899?text=${encodeURIComponent(msg)}`;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Buka WhatsApp →';status.append(document.createElement('br'),link);
    }catch(error){status.textContent=navigator.onLine?error.message:'Anda sedang offline. Sambungkan internet dan coba lagi.';}finally{button.disabled=false;}
  });
  $$('[data-owner-demo]').forEach(b=>b.addEventListener('click',()=>{changeRole('owner');$('#aplikasi').scrollIntoView({behavior:'smooth'})}));
  $('#showExperience').addEventListener('click',()=>$('#cara-kerja').scrollIntoView({behavior:'smooth'}));
  const menu=$('#mobileNav');$('#menuToggle').addEventListener('click',()=>{let open=menu.classList.toggle('open');$('#menuToggle').setAttribute('aria-expanded',String(open))});menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.classList.remove('open');$('#menuToggle').setAttribute('aria-expanded','false')}));
  const navObserver=new IntersectionObserver(entries=>{let e=entries.find(x=>x.isIntersecting);if(!e)return;$$('.nav-link').forEach(a=>a.classList.toggle('active',a.getAttribute('href')===`#${e.target.id}`))},{rootMargin:'-22% 0px -65% 0px',threshold:0});$$('section[id]').forEach(el=>navObserver.observe(el));
  renderPhone();
})();
