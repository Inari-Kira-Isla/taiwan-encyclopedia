/* Taiwan browse UI: immutable F2 search slots, collapsed browse pages, transactional render. */
(()=>{'use strict';
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)],U=window.EcoURL;
const grid=$('#article-grid'),state=$('#index-state'),count=$('#result-count'),pager=$('.pagination'),input=$('#site-search'),search=$('.search');
const initial=JSON.parse($('#page-context').textContent);
const labels={food:'食',see:'遊',play:'玩',buy:'買',stay:'住',move:'行',wellness:'身心','life-biz':'生活與商業'};
const icons={food:'food',see:'see',play:'play',buy:'buy',stay:'stay',move:'move',wellness:'well','life-biz':'biz'};
const cities=initial.cities,categories=['all',...Object.keys(labels)],cityKeys=['keelung','taipei','hsinchu','taichung','chiayi','tainan','kaohsiung','yilan','hualien','taitung'];
let current={city:'',category:initial.category,page:initial.page,q:''},pending={...current},sequence=0;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=k=>'<svg class="i" aria-hidden="true"><use href="/_eco/icons.svg#i-'+k+'"></use></svg>';
const policy={lens:['',...cities],category:categories,page:{max:Number.MAX_SAFE_INTEGER},q:{max:200}};
function parse(value,defaults=current){const h=U.safeHash(value,policy),has=new URLSearchParams(String(value).replace(/^[#?]/,'')).has('category');return {city:h.lens,category:has?h.category:defaults.category,page:h.page,q:h.q};}
function level(a){const r=a.verification_record;return r&&Number.isInteger(r.level)&&r.level>=1&&r.level<=4&&r.source_url&&r.method&&r.verified_at&&(r.level<3||r.verifier)?r.level:0;}
function card(a){const path=U.safePath(a.url,['/articles/']);if(!path)return null;
 const l=level(a),names=['','有引用','來源可追溯','人工核實','官方紀錄'];
 const tag=a.cluster_count?'<span class="stack-tag">'+icon('stack')+'同題 '+a.cluster_count+' 篇</span>':'';
 const badge=l?'<span class="trust" data-l="'+l+'" data-level="L'+l+'">'+icon('shield')+'L'+l+' '+names[l]+'</span>':'';
 const anomaly=a.display_flag==='slug_title'?'<span class="title-note">標題待修正</span>':'';
 const body='<a class="card" data-id="'+escape(a.id)+'" href="'+escape(path)+'"><div class="card-top"><span class="cat"><span class="ico">'+icon(icons[a.cat]||'see')+'</span>'+escape(labels[a.cat]||'未分類')+'</span>'+tag+'</div><h3>'+escape(a.title)+'</h3>'+anomaly+'<div class="meta"><span>'+escape(a.display_city||a.city||'台灣')+'</span><time datetime="'+escape(a.date)+'">發布 '+escape(a.date)+'</time></div><div class="card-foot">'+badge+'</div></a>';
 if(!a.cluster_count)return '<div class="stackgroup">'+body+'</div>';
 if(!/^\/idx\/cluster\/\d+\.json$/.test(a.cluster_path)||!Number.isInteger(a.cluster_count))return null;
 return '<div class="stackgroup" data-cluster="'+escape(a.cluster_key)+'">'+body+'<details class="cluster-details" data-cluster-path="'+a.cluster_path+'"><summary>展開同題 '+a.cluster_count+' 篇</summary><ul></ul></details></div>';
}
function show(kind,message=''){
 state.hidden=kind==='ready';state.className='state '+({loading:'loading',error:'err',empty:'empty',partial:'partial'}[kind]||'');
 state.setAttribute('role',kind==='error'?'alert':'status');grid.setAttribute('aria-busy',String(kind==='loading'));
 if(kind==='ready'){state.replaceChildren();return;}
 if(kind==='loading'){state.innerHTML='<p class="loading-note"><span class="spinner" aria-hidden="true"></span>載入緊第 '+pending.page+' 頁（每頁 24 張卡）…</p><div class="loading-skeletons" aria-hidden="true">'+('<div class="sk"><span class="h"></span><span class="h2"></span><span></span><span class="s"></span></div>').repeat(3)+'</div>';return;}
 state.innerHTML='<div class="big">'+icon(kind==='error'?'alert':'search')+'</div><div><h3>'+(kind==='error'?'索引載入失敗——唔係冇文章':kind==='partial'?'部分結果，縮窄條件':'條件太窄／本站冇符合條件嘅文章')+'</h3><p>'+escape(message)+'</p><div class="row">'+(kind==='error'?'<button class="btn" data-retry type="button">再試一次</button><a class="btn sec" href="/c/food/1/">去分類頁</a>':'<button class="btn" data-clear type="button">清除篩選</button><a class="btn sec" href="https://world-encyclopedia.vercel.app/">去世界總圖跨站搜</a>')+'</div></div>';
}
async function fetchJSON(path){const r=await fetch(path,{redirect:'error'});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
function path(s,n=s.page){const key=s.city?cityKeys[cities.indexOf(s.city)]:'all';return '/idx/view/'+key+'/'+s.category+'/'+n+'.json';}
function href(s,n){const base=s.category==='all'&&n===1?'/':'/c/'+s.category+'/'+n+'/';const h=new URLSearchParams();if(s.city)h.set('lens',s.city);if(s.category!=='all')h.set('category',s.category);if(n>1)h.set('page',n);return base+(h.size?'#'+h:'');}
function pagination(s,pages){return (s.page>1?'<a class="btn sec" data-page="'+(s.page-1)+'" href="'+href(s,s.page-1)+'">上一頁</a>':'')+'<span>第 '+s.page+' 頁，共 '+pages+' 頁</span>'+(s.page<pages?'<a class="btn sec" data-page="'+(s.page+1)+'" href="'+href(s,s.page+1)+'">下一頁</a>':'');}
function selection(){all('[data-category]').forEach(a=>a.setAttribute('aria-current',String(a.dataset.category===current.category)));all('[data-lens]').forEach(a=>a.setAttribute('aria-pressed',String(a.dataset.lens===current.city)));}
function remember(){const h=new URLSearchParams();if(current.city)h.set('lens',current.city);if(current.category!=='all')h.set('category',current.category);if(current.page>1)h.set('page',current.page);if(current.q)h.set('q',current.q);history.replaceState(null,'',location.pathname+location.search+(h.size?'#'+h:''));try{localStorage.setItem('eco-taiwan-city',current.city);}catch(e){$('#lens-note').textContent='城市選擇只喺呢個分頁有效。';}}
const client=EcoSearch.createClient({prefetchPopular:false,reserve:9000});
const clusterMaps=new Map();
async function collapseSearch(rows){
 const enriched=[];let bytes=0,partial=false;
 for(const a of rows){if(!Number.isInteger(a.id)||a.id<0)throw Error('Article id');const n=Math.floor(a.id/24)+1;
  if(!clusterMaps.has(n)){if(bytes+initial.cluster_map_bound>3000){partial=true;break;}const r=await fetch('/idx/cluster-map/'+n+'.json',{redirect:'error'});if(!r.ok)throw Error('Cluster map fetch');const raw=await r.text(),size=(await new Response(new Response(raw).body.pipeThrough(new CompressionStream('gzip'))).arrayBuffer()).byteLength;bytes+=size;if(bytes>3000){partial=true;break;}clusterMaps.set(n,JSON.parse(raw));}
  enriched.push({...a,...clusterMaps.get(n)[a.id]});
 }
 const seen=new Set(),out=[];
 for(const a of enriched){const key=a.cluster_key||'id:'+a.id;if(seen.has(key))continue;seen.add(key);const rep=enriched.find(b=>b.id===a.representative_id)||a;out.push(rep);}
 return {articles:out,partial,loaded:enriched.length};
}
async function load(request=pending,focus=false){const ticket=++sequence;pending={...request};selection();show('loading');try{
 const s=parse(new URLSearchParams({lens:request.city,category:request.category,page:String(request.page),q:request.q||''}).toString());
 let data,kind='ready',message='';
 if(s.q){const result=await client.search(s.q,96);if(result.state==='error')throw Error(result.error);const articles=result.articles.filter(a=>(!s.city||a.city===s.city)&&(s.category==='all'||a.cat===s.category));
  const grouped=await collapseSearch(articles);data={articles:grouped.articles.slice(0,24),total:grouped.loaded,pages:1,page:1};s.page=1;kind=result.state==='partial'||grouped.partial?'partial':data.total?'ready':'empty';message=kind==='partial'?'搜尋讀取預算已用盡；可縮窄搜尋字或按城市同分類閱讀。':'';
 }else{data=await fetchJSON(path(s,1));if(!Number.isInteger(data.pages)||data.pages<1)throw Error('Invalid pages');if(s.page>data.pages)s.page=1;if(s.page!==1)data=await fetchJSON(path(s));}
 if(ticket!==sequence)return;
 if(!Array.isArray(data.articles)||!Number.isInteger(data.total)||data.total<0||data.page!==s.page||(!s.q&&(data.kind!=='page'||data.site!=='taiwan'||data.category!==s.category||data.city!==s.city))||data.total>0&&!data.articles.length&&!s.q)throw Error('Invalid index');
 const cards=data.articles.map(card);if(cards.some(c=>c===null))throw Error('Invalid article path');
 const html=cards.join(''),navigation=pagination(s,data.pages),text=s.q?'搜尋：顯示 '+data.articles.length+' 組讀物（已載入 '+data.total.toLocaleString()+' 篇）':(s.city?s.city+'：':'')+'共 '+data.total.toLocaleString()+' 篇';
 // Commit only after every card and navigation link is successfully rendered.
 grid.innerHTML=html;pager.innerHTML=navigation;count.textContent=text;current=s;pending={...s};selection();remember();
 show(kind==='ready'&&!data.total?'empty':kind,message);if(focus)$('#results-heading').focus();
 }catch(e){if(ticket!==sequence)return;selection();show('error');console.error('Taiwan index load failed:',e.message);}}
function apply(change){return load({...current,...change,page:change.page||1},true);}
function clear(){input.value='';search.__ecoSearch?.close();return load({city:'',category:'all',page:1,q:''},true);}
EcoSearch.mount(search,{client,prefetchPopular:false,onSubmit(query,facet){if(facet)apply({city:facet.city,category:facet.cat,q:''});else apply({q:U.safeHash(new URLSearchParams({q:query}).toString(),{q:{max:200}}).q});},onClear:clear});
// Capture lens clicks so shared motion cannot commit a hash/pressed state before rendering.
document.addEventListener('click',e=>{const b=e.target.closest('.lens-chip');if(!b)return;e.preventDefault();e.stopImmediatePropagation();if(cities.includes(b.dataset.lens))apply({city:current.city===b.dataset.lens?'':b.dataset.lens,q:''});},true);
document.addEventListener('click',e=>{if(e.target.closest('footer [data-motion-toggle]')){const value=document.documentElement.dataset.motion!=='reduce';document.documentElement.dataset.motion=value?'reduce':'full';all('[data-motion-toggle]').forEach(b=>{b.setAttribute('aria-pressed',String(value));b.textContent=value?'恢復動態':'減少動態';});try{localStorage.setItem('eco-motion',value?'reduce':'full');}catch(_){}return;}const a=e.target.closest('[data-category],[data-page],[data-retry],[data-clear]');if(!a)return;if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
 if(a.matches('[data-category]')){e.preventDefault();if(categories.includes(a.dataset.category))apply({category:a.dataset.category,q:''});}
 if(a.matches('[data-page]')){e.preventDefault();apply({page:Number(a.dataset.page)});}
 if(a.matches('[data-retry]'))load(pending,true);if(a.matches('[data-clear]'))clear();
});
document.addEventListener('eco:lens',e=>{if(location.hash==='#trust-method')return;if(cities.includes(e.detail.value)||e.detail.value==='')apply({city:e.detail.value,q:''});});
document.addEventListener('toggle',async e=>{const d=e.target;if(!d.matches?.('details.cluster-details')||!d.open||d.dataset.loaded)return;const list=d.querySelector('ul');try{
 const p=d.dataset.clusterPath;if(!/^\/idx\/cluster\/\d+\.json$/.test(p))throw Error('Cluster path');const result=await fetchJSON(p);if(result.kind!=='cluster'||result.site!=='taiwan'||!Array.isArray(result.articles))throw Error('Cluster');
 const links=result.articles.map(a=>{const url=U.safePath(a.url,['/articles/']);if(!url)throw Error('Article path');return '<li><a href="'+escape(url)+'">'+escape(a.title)+'</a></li>';});list.innerHTML=links.join('');d.dataset.loaded='true';
 }catch(error){list.innerHTML='<li role="alert">同題索引載入失敗；重新展開可再試。</li>';console.error('Taiwan cluster load failed:',error.message);}},true);
window.addEventListener('hashchange',()=>{if(location.hash==='#trust-method')return;load(parse(location.hash),true)});window.addEventListener('online',()=>load());
// Expand a trust target (or a details ancestor) before the browser scrolls to it.
function openTrust(hash){if(hash!=='#trust-method')return;const target=document.getElementById('trust-method');let el=target;while(el){if(el.tagName==='DETAILS')el.open=true;el=el.parentElement;}}
document.addEventListener('click',e=>{const a=e.target.closest('.trust-note a');if(a)openTrust(a.getAttribute('href'));});
window.addEventListener('hashchange',()=>openTrust(location.hash));openTrust(location.hash);
let start=parse(location.hash,initial),h=new URLSearchParams(location.hash.slice(1));
try{if(!h.has('lens'))start.city=U.safeHash(new URLSearchParams({lens:localStorage.getItem('eco-taiwan-city')||''}).toString(),policy).lens;}catch(e){$('#lens-note').textContent='城市選擇只喺呢個分頁有效。';}
if(!h.has('page'))start.page=initial.page;
const query=U.safeHash(location.search,{q:{max:200}}).q;if(!start.q&&query)start.q=query;input.value=start.q;
load(start);
})();
