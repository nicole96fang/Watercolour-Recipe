/* =========================================
   app.js · 食谱天下 v2
   - 单页应用（hash 路由）
   - 首页：分类卡片（无 sidebar）
   - 搜索 / 备份恢复 / 收藏 / A4 打印 / PDF 分享
   ========================================= */

(function(){
  "use strict";

  // ============ 分类元数据 ============
  const CATEGORIES = [
    { id:"chicken",  name:"鸡肉",   emoji:"🍗", bg:"linear-gradient(160deg,#fde7ec,#fff5e7)" },
    { id:"pork",     name:"猪肉",   emoji:"🥩", bg:"linear-gradient(160deg,#fde7ec,#e6f5fb)" },
    { id:"fish",     name:"鱼肉",   emoji:"🐟", bg:"linear-gradient(160deg,#e2f0fb,#d6f0e6)" },
    { id:"shrimp",   name:"虾类",   emoji:"🦐", bg:"linear-gradient(160deg,#fde7ec,#fff5e7)" },
    { id:"squid",    name:"鱿鱼",   emoji:"🦑", bg:"linear-gradient(160deg,#dfeafd,#fde7ec)" },
    { id:"crab",     name:"螃蟹",   emoji:"🦀", bg:"linear-gradient(160deg,#fde7ec,#fff0e0)" },
    { id:"clam",     name:"蚌类",   emoji:"🦪", bg:"linear-gradient(160deg,#e2f0fb,#fde7ec)" },
    { id:"veg",      name:"蔬菜",   emoji:"🥬", bg:"linear-gradient(160deg,#e2f6e2,#fff5e7)" },
    { id:"tofu",     name:"豆腐",   emoji:"🧈", bg:"linear-gradient(160deg,#fff5e7,#e2f0fb)" },
    { id:"egg",      name:"鸡蛋",   emoji:"🥚", bg:"linear-gradient(160deg,#fff5e7,#fde7ec)" },
    { id:"dessert",  name:"甜点",   emoji:"🍰", bg:"linear-gradient(160deg,#fde7ec,#fff0e9)" },
    { id:"bakery",   name:"烘培",   emoji:"🥐", bg:"linear-gradient(160deg,#fde9d3,#fde7ec)" },
    { id:"coffee",   name:"咖啡",   emoji:"☕", bg:"linear-gradient(160deg,#f3e6d7,#fde7ec)" },
    { id:"drink",    name:"饮料",   emoji:"🥤", bg:"linear-gradient(160deg,#e2f0fb,#fde7ec)" },
    { id:"noodle",   name:"面食",   emoji:"🍜", bg:"linear-gradient(160deg,#fff5e7,#e2f0fb)" },
    { id:"other",    name:"其它",   emoji:"🍯", bg:"linear-gradient(160deg,#fde7ec,#fff5e7)" },
  ];
  const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

  // ============ 工具 ============
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const view = $("#view");

  function toast(msg){
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(()=> t.hidden = true, 1800);
  }
  function escapeHTML(s){
    if (s==null) return "";
    return String(s).replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
    }[c]));
  }
  function fmtDate(ts){
    if(!ts) return "";
    const d = new Date(ts);
    const p = n => String(n).padStart(2,"0");
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  function debounce(fn, ms=180){
    let id;
    return (...a) => { clearTimeout(id); id = setTimeout(()=>fn(...a), ms); };
  }

  function fileToDataURL(file, max=1280, q=0.82){
    return new Promise((resolve, reject) => {
      if(!file) return resolve(null);
      if(!/^image\//.test(file.type)) return reject(new Error("不是图片"));
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          let {width:w, height:h} = img;
          const ratio = Math.min(1, max/Math.max(w,h));
          const nw = Math.round(w*ratio), nh = Math.round(h*ratio);
          const c = document.createElement("canvas");
          c.width = nw; c.height = nh;
          const ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0, nw, nh);
          resolve(c.toDataURL("image/jpeg", q));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  window.fileToDataURL = fileToDataURL;

  // ============ 路由 ============
  function go(hash){ location.hash = hash; }
  function parseHash(){
    const h = location.hash.replace(/^#/, "") || "/";
    return h.split("/").filter(Boolean);
  }
  function route(){
    const p = parseHash();
    if (p.length === 0) return renderHome();
    if (p[0] === "cat" && p[1]) return renderCategory(p[1]);
    if (p[0] === "r"   && p[1]) return renderRecipe(p[1]);
    if (p[0] === "edit"&& p[1]) return renderEditor(p[1]);
    if (p[0] === "new" && p[1]) return renderEditor(null, p[1]);
    renderHome();
  }
  window.addEventListener("hashchange", route);

  // ============ 首页：分类卡 ============
  async function renderHome(){
    const stats = await RecipeDB.stats();
    view.innerHTML = `
      <section class="page-home">
        <div class="hero">
          <div class="deco-emoji">🍓</div>
          <h2>把喜欢的味道，<br/>好好收藏 ✨</h2>
          <p>照片、材料、步骤与灵感，都留在自己的小小食谱书里。</p>
          <div class="stats">
            <span>📚 共 ${stats.total} 个食谱</span>
            <span>❤️ 收藏 ${stats.fav}</span>
            <span>💾 本机保存</span>
          </div>
        </div>

        <div class="cat-title">
          <h3>美味分类</h3>
          <div class="deco"></div>
          <span class="pill">${stats.total} 份食谱</span>
        </div>

        <div class="cat-grid">
          ${CATEGORIES.map(c => `
            <button class="cat-card" data-go="cat/${c.id}" style="--card-bg:${c.bg}">
              <div class="cat-emoji">${c.emoji}</div>
              <div class="cat-name">${c.name}</div>
              <span class="cat-count">📖 ${stats.byCat[c.id] || 0} 份</span>
            </button>
          `).join("")}
        </div>
      </section>
    `;
    $$(".cat-card", view).forEach(b => b.addEventListener("click", () => go(b.dataset.go)));
  }

  // ============ 分类页 ============
  async function renderCategory(catId){
    const cat = CAT_MAP[catId] || { id:catId, name:catId, emoji:"🍽️", bg:"#eee" };
    const list = await RecipeDB.listByCategory(cat.id);
    list.sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));

    view.innerHTML = `
      <section>
        <div class="cat-header">
          <button class="back-btn" onclick="history.back()">←</button>
          <span class="cat-emoji-big">${cat.emoji}</span>
          <h2>${cat.name} · 食谱库</h2>
        </div>

        <button class="add-btn" id="newRecipeBtn">＋ 加入新食谱</button>

        ${list.length === 0 ? `
          <div class="empty">
            <div class="big-emoji">🍯</div>
            <p>还没有食谱，点上方按钮开启第一篇吧～</p>
          </div>
        ` : `
          <div class="cat-title"><h3>我的${cat.name}食谱</h3><div class="deco"></div><span class="pill">${list.length} 篇</span></div>
          <div class="recipe-list">
            ${list.map(r => recipeRow(r, cat)).join("")}
          </div>
        `}
      </section>
    `;

    $("#newRecipeBtn").addEventListener("click", () => go(`new/${cat.id}`));
    $$(".recipe-item", view).forEach(b => {
      b.addEventListener("click", () => go(`r/${b.dataset.id}`));
    });
  }

  function recipeRow(r, cat){
    const cover = (r.photos && r.photos[0])
      ? `<div class="recipe-thumb"><img src="${r.photos[0]}" alt=""></div>`
      : `<div class="recipe-thumb">${cat?.emoji || "🍴"}</div>`;
    const heart = r.favorite ? "❤️" : "🤍";
    const meta = `${cat?.name || r.category} · 更新 ${fmtDate(r.updatedAt)}`;
    return `
      <button class="recipe-item" data-id="${r.id}">
        ${cover}
        <div>
          <p class="recipe-name">${escapeHTML(r.name || "未命名食谱")}</p>
          <div class="recipe-meta">${meta}</div>
        </div>
        <span class="recipe-heart">${heart}</span>
      </button>
    `;
  }

  // ============ 食谱详情 ============
  async function renderRecipe(id){
    const r = await RecipeDB.get(id);
    if(!r){ toast("食谱不存在"); go(""); return; }
    const cat = CAT_MAP[r.category] || { name:r.category, emoji:"🍽️" };

    const ings = (r.ingredients||[]).map(i => `
      <div class="ing">
        <span class="dot"></span>
        <span class="name">${escapeHTML(i.name)}</span>
        <span class="qty">${escapeHTML(i.qty||"")}</span>
      </div>
    `).join("");

    const steps = (r.steps||[]).map(s => `
      <div class="step"><span class="num"></span><span class="text">${escapeHTML(s)}</span></div>
    `).join("");

    const photos = (r.photos||[]).map((p, idx) => `
      <div class="ph"><img src="${p}" alt=""></div>
    `).join("");

    view.innerHTML = `
      <section class="recipe-page">
        <div class="detail-head">
          <div class="detail-cover">${ (r.photos && r.photos[0]) ? `<img src="${r.photos[0]}" alt="">` : cat.emoji }</div>
          <div class="detail-title">
            <h1>${escapeHTML(r.name || "未命名食谱")}</h1>
            <button class="heart-btn ${r.favorite?"is-fav":""}" id="favBtn">${r.favorite?"❤️":"🤍"}</button>
          </div>
          <div class="detail-meta">
            <span>${cat.emoji} ${escapeHTML(cat.name)}</span>
            ${r.servings?`<span>🍽️ ${escapeHTML(r.servings)}</span>`:""}
            ${r.prepTime?`<span>⏱ 备料 ${escapeHTML(r.prepTime)}</span>`:""}
            ${r.cookTime?`<span>🔥 烹饪 ${escapeHTML(r.cookTime)}</span>`:""}
            <span>🗓 ${fmtDate(r.updatedAt)}</span>
          </div>
          <div class="detail-actions">
            <button class="big-btn pink" id="shareBtn">📤 分享/PDF</button>
            <button class="big-btn blue" id="printBtn">🖨 A4 打印</button>
            <button class="big-btn ghost" id="editBtn">✏️ 编辑</button>
            <button class="big-btn danger" id="delBtn">🗑️ 删除</button>
          </div>
        </div>

        ${ (r.photos && r.photos.length>1) ? `
          <div class="section">
            <h2>🖼 已保存照片 <span class="pill">${r.photos.length} 张</span></h2>
            <div class="gallery">${photos}</div>
          </div>
        ` : "" }

        ${ (r.ingredients && r.ingredients.length) ? `
          <div class="section">
            <h2>🥣 食材 <span class="pill">${r.ingredients.length}</span></h2>
            <div class="ing-list">${ings}</div>
          </div>
        ` : "" }

        ${ (r.steps && r.steps.length) ? `
          <div class="section">
            <h2>👩🏻‍🍳 步骤 <span class="pill">${r.steps.length} 步</span></h2>
            <div class="step-list">${steps}</div>
          </div>
        ` : "" }

        ${ (r.notes) ? `
          <div class="section">
            <h2>📝 小贴士</h2>
            <div style="white-space:pre-wrap; line-height:1.8; color:var(--ink-soft); font-family:'ZCOOL XiaoWei', serif; font-size:15px;">${escapeHTML(r.notes)}</div>
          </div>
        ` : "" }
      </section>
    `;

    $("#favBtn").addEventListener("click", async () => {
      r.favorite = !r.favorite;
      r.updatedAt = Date.now();
      await RecipeDB.put(r);
      toast(r.favorite ? "已加入收藏 ❤️" : "已取消收藏");
      renderRecipe(id);
    });
    $("#editBtn").addEventListener("click", () => go(`edit/${r.id}`));
    $("#delBtn").addEventListener("click", async () => {
      if (!confirm(`确定删除「${r.name||"未命名"}」吗？此操作不可撤销。`)) return;
      await RecipeDB.remove(r.id);
      toast("已删除");
      go(`cat/${r.category}`);
    });
    $("#printBtn").addEventListener("click", () => printRecipe(r));
    $("#shareBtn").addEventListener("click", () => shareRecipePDF(r));
  }

  // ============ 编辑 / 新增 ============
  async function renderEditor(id, presetCat){
    let r = id ? await RecipeDB.get(id) : null;
    if (id && !r){ toast("食谱不存在"); go(""); return; }
    r = r || {
      id: uid(),
      category: presetCat || "other",
      name:"",
      ingredients:[], steps:[], photos:[],
      favorite:false, servings:"", prepTime:"", cookTime:"",
      notes:"", createdAt: Date.now(), updatedAt: Date.now(),
    };
    const cat = CAT_MAP[r.category] || CAT_MAP.other;

    view.innerHTML = `
      <section>
        <div class="cat-header">
          <button class="back-btn" id="cancelBtn">←</button>
          <span class="cat-emoji-big">${cat.emoji}</span>
          <h2>${id? "✏️ 编辑食谱":"＋ 新食谱"}</h2>
        </div>

        <div class="form" style="padding: 0 4px;">

          <div>
            <label>📂 选择分类</label>
            <div class="chips" id="catChips">
              ${CATEGORIES.map(c => `
                <span class="chip ${c.id===r.category?"active":""}" data-cat="${c.id}">${c.emoji} ${c.name}</span>
              `).join("")}
            </div>
          </div>

          <div>
            <label>🍯 食谱名称</label>
            <input id="f_name" placeholder="例：番茄炒蛋" value="${escapeHTML(r.name)}"/>
          </div>

          <div class="row-line">
            <div>
              <label>🍽 份量</label>
              <input id="f_servings" placeholder="2 人份" value="${escapeHTML(r.servings||"")}"/>
            </div>
            <div>
              <label>⏱ 备料</label>
              <input id="f_prep" placeholder="10 分钟" value="${escapeHTML(r.prepTime||"")}"/>
            </div>
            <div>
              <label>🔥 烹饪</label>
              <input id="f_cook" placeholder="15 分钟" value="${escapeHTML(r.cookTime||"")}"/>
            </div>
          </div>

          <div>
            <label>🥣 食材</label>
            <div id="ingBox"></div>
          </div>

          <div>
            <label>👩🏻‍🍳 步骤</label>
            <div id="stepBox"></div>
          </div>

          <div>
            <label>📷 照片（可多张，自动压缩）</label>
            <label class="upload-area" id="uploadArea">
              <div style="font-size: 16px; color: var(--primary-deep);">🖼 点这里选择照片 · 或把照片拖进来</div>
              <div style="margin-top:6px; font-size:12px;">支持一次性多选 · JPG/PNG · 本机保存</div>
              <input type="file" id="photoInput" accept="image/*" multiple hidden />
            </label>
            <div class="gallery" id="gallery" style="margin-top:10px;"></div>
          </div>

          <div>
            <label>📝 小贴士（可选）</label>
            <textarea id="f_notes" placeholder="这道菜的关键、注意事项…">${escapeHTML(r.notes||"")}</textarea>
          </div>

          <div class="detail-actions" style="padding:0">
            <button class="big-btn ghost" id="cancelBtn2">取消</button>
            <button class="big-btn blue" id="saveBtn">💾 保存食谱</button>
          </div>
        </div>
      </section>
    `;

    $$("#catChips .chip").forEach(c => c.addEventListener("click", () => {
      r.category = c.dataset.cat;
      $$("#catChips .chip").forEach(x => x.classList.toggle("active", x===c));
    }));

    const ingBox = $("#ingBox");
    function renderIngs(){
      ingBox.innerHTML = (r.ingredients||[]).map((i, idx) => ingRow(i, idx)).join("") + `
        <button class="big-btn ghost" id="addIng" style="margin-top:10px;">＋ 添加食材</button>
      `;
      $$(".ing-row").forEach(row => {
        const idx = +row.dataset.idx;
        row.querySelector(".ing-name").addEventListener("input", e => r.ingredients[idx].name = e.target.value);
        row.querySelector(".ing-qty").addEventListener("input",  e => r.ingredients[idx].qty  = e.target.value);
        row.querySelector(".ing-del").addEventListener("click", () => {
          r.ingredients.splice(idx,1); renderIngs();
        });
      });
      $("#addIng").addEventListener("click", () => {
        r.ingredients.push({ name:"", qty:"" });
        renderIngs();
        const rows = $$(".ing-row");
        const last = rows[rows.length-1];
        last && last.querySelector(".ing-name") && last.querySelector(".ing-name").focus();
      });
    }
    function ingRow(i, idx){
      return `
        <div class="row-line ing-row" data-idx="${idx}" style="margin-bottom:8px;">
          <input class="ing-name" placeholder="食材名" value="${escapeHTML(i.name||"")}"/>
          <input class="ing-qty"  placeholder="份量" value="${escapeHTML(i.qty||"")}"/>
          <button class="big-btn ghost ing-del" style="flex:0 0 auto; padding:10px 12px;">🗑</button>
        </div>
      `;
    }
    renderIngs();

    const stepBox = $("#stepBox");
    function renderSteps(){
      stepBox.innerHTML = (r.steps||[]).map((s, idx) => stepRow(s, idx)).join("") + `
        <button class="big-btn ghost" id="addStep" style="margin-top:10px;">＋ 添加步骤</button>
      `;
      $$(".step-row").forEach(row => {
        const idx = +row.dataset.idx;
        row.querySelector(".step-text").addEventListener("input", e => r.steps[idx] = e.target.value);
        row.querySelector(".step-del").addEventListener("click", () => {
          r.steps.splice(idx,1); renderSteps();
        });
      });
      $("#addStep").addEventListener("click", () => {
        r.steps.push("");
        renderSteps();
        const rows = $$(".step-row");
        const last = rows[rows.length-1];
        last && last.querySelector(".step-text") && last.querySelector(".step-text").focus();
      });
    }
    function stepRow(s, idx){
      const n = String(idx+1).padStart(2,"0");
      return `
        <div class="row-line step-row" data-idx="${idx}" style="margin-bottom:8px; align-items:flex-start;">
          <div style="flex:0 0 40px; height:46px; border-radius:16px; display:grid; place-items:center;
                      background:linear-gradient(135deg,var(--primary),var(--pink-deep)); color:#fff; font-weight:700; font-family:var(--font-script); font-size:18px;">
            ${n}
          </div>
          <textarea class="step-text" rows="2" placeholder="第 ${idx+1} 步…">${escapeHTML(s||"")}</textarea>
          <button class="big-btn ghost step-del" style="flex:0 0 auto; padding:10px 12px;">🗑</button>
        </div>
      `;
    }
    renderSteps();

    const photoInput = $("#photoInput");
    const uploadArea = $("#uploadArea");
    const gallery = $("#gallery");
    function renderPhotos(){
      gallery.innerHTML = (r.photos||[]).map((p, idx) => `
        <div class="ph">
          <img src="${p}" alt="">
          <button class="del" data-idx="${idx}">✕</button>
        </div>
      `).join("") + `
        <label class="ph" style="cursor:pointer; background:linear-gradient(135deg,#ffd7df,#cfe9f4);">
          <div style="font-size:32px;">＋</div>
          <input type="file" accept="image/*" multiple id="addMorePhotos" style="display:none"/>
        </label>
      `;
      $$(".ph .del", gallery).forEach(b => b.addEventListener("click", e => {
        e.preventDefault();
        const i = +b.dataset.idx;
        r.photos.splice(i,1); renderPhotos();
      }));
      const more = $("#addMorePhotos");
      if (more) more.addEventListener("change", async e => {
        await handlePhotos(e.target.files);
        more.value = "";
      });
    }
    async function handlePhotos(files){
      const arr = Array.from(files||[]);
      if (!arr.length) return;
      toast(`正在保存 ${arr.length} 张照片…`);
      for (const f of arr){
        try{
          const data = await fileToDataURL(f);
          if (data) r.photos.push(data);
        }catch(err){ console.warn(err); }
      }
      renderPhotos();
      toast("照片已保存到本机 ✨");
    }
    photoInput.addEventListener("change", async e => {
      await handlePhotos(e.target.files);
      e.target.value = "";
    });
    uploadArea.addEventListener("dragover", e => { e.preventDefault(); uploadArea.style.background="#fff"; });
    uploadArea.addEventListener("dragleave", e => { e.preventDefault(); uploadArea.style.background=""; });
    uploadArea.addEventListener("drop", async e => {
      e.preventDefault(); uploadArea.style.background="";
      await handlePhotos(e.dataTransfer.files);
    });
    renderPhotos();

    function collectText(){
      r.name = $("#f_name").value.trim();
      r.servings = $("#f_servings").value.trim();
      r.prepTime = $("#f_prep").value.trim();
      r.cookTime = $("#f_cook").value.trim();
      r.notes = $("#f_notes").value.trim();
      r.ingredients = (r.ingredients||[]).filter(i => (i.name||"").trim() || (i.qty||"").trim())
                                          .map(i => ({ name:(i.name||"").trim(), qty:(i.qty||"").trim() }));
      r.steps = (r.steps||[]).map(s => (s||"").trim()).filter(Boolean);
      r.updatedAt = Date.now();
    }
    $("#saveBtn").addEventListener("click", async () => {
      collectText();
      if (!r.name){ toast("请填写食谱名称 ✏️"); $("#f_name").focus(); return; }
      await RecipeDB.put(r);
      toast("已保存 💾");
      go(`r/${r.id}`);
    });
    function cancel(){ go(id ? `r/${id}` : `cat/${r.category}`); }
    $("#cancelBtn").addEventListener("click", cancel);
    $("#cancelBtn2").addEventListener("click", cancel);
  }

  // ============ A4 打印 ============
  function buildPrintHTML(r){
    const cat = CAT_MAP[r.category] || { name: r.category, emoji:"🍴" };
    const photos = (r.photos||[]);
    const cover = photos[0] ? `<img src="${photos[0]}" style="width:100%; max-height:90mm; object-fit:cover; border-radius:6mm;">` : "";
    const restPhotos = photos.slice(1);
    const ings = (r.ingredients||[]).map(i => `
      <div class="ing">${escapeHTML(i.name)} ${i.qty? "· "+escapeHTML(i.qty):""}</div>
    `).join("");
    const steps = (r.steps||[]).map((s, i) => `
      <div class="step">
        <div class="num">${i+1}</div>
        <div class="text">${escapeHTML(s)}</div>
      </div>
    `).join("");
    return `
      <div class="sheet">
        <h1>${escapeHTML(r.name||"未命名食谱")} ${cat.emoji}</h1>
        <div class="print-meta">
          分类：${escapeHTML(cat.name)} ·
          ${r.servings?"份量 "+escapeHTML(r.servings)+" · ":""}
          ${r.prepTime?"备料 "+escapeHTML(r.prepTime)+" · ":""}
          ${r.cookTime?"烹饪 "+escapeHTML(r.cookTime)+" · ":""}
          收录于 ${fmtDate(r.createdAt)} · 最后更新 ${fmtDate(r.updatedAt)}
        </div>
        ${cover}
        ${restPhotos.length? `
          <div class="print-section">
            <h2>照片</h2>
            <div class="print-photos">
              ${restPhotos.map(p => `<img src="${p}">`).join("")}
            </div>
          </div>` : ""
        }
        <div class="print-section">
          <h2>🥣 食材</h2>
          <div class="print-ings">${ings || "<i>未填写</i>"}</div>
        </div>
        <div class="print-section print-steps">
          <h2>👩🏻‍🍳 步骤</h2>
          ${steps || "<i>未填写</i>"}
        </div>
        ${r.notes? `
          <div class="print-section">
            <h2>小贴士</h2>
            <div style="white-space:pre-wrap;">${escapeHTML(r.notes)}</div>
          </div>` : ""
        }
        <div style="margin-top:10mm; text-align:center; color:#888; font-size:10pt;">
          —— 由「食谱天下 · Watercolour Recipe」制作 ——
        </div>
      </div>
    `;
  }
  function printRecipe(r){
    const area = $("#printArea");
    area.innerHTML = buildPrintHTML(r);
    area.style.display = "block";
    const imgs = $$("img", area);
    const wait = imgs.length ? Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(res => { img.onload = img.onerror = res; }))) : Promise.resolve();
    wait.then(() => {
      window.print();
      setTimeout(()=> { area.style.display = "none"; }, 300);
    });
  }

  async function shareRecipePDF(r){
    const area = $("#printArea");
    area.innerHTML = buildPrintHTML(r);
    area.style.display = "block";
    const imgs = $$("img", area);
    const wait = imgs.length ? Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(res => { img.onload = img.onerror = res; }))) : Promise.resolve();
    await wait;
    toast("选「另存为 PDF」即可分享 🍯");
    setTimeout(()=>{
      window.print();
      setTimeout(()=> { area.style.display = "none"; }, 300);
    }, 100);
  }

  // ============ 搜索 ============
  function setupSearch(){
    const modal = $("#searchModal");
    const input = $("#searchInput");
    const results = $("#searchResults");
    function open(){
      modal.hidden = false;
      input.value = "";
      results.innerHTML = `<div style="color:var(--ink-soft); padding:14px; font-family:var(--font-script); font-size:18px;">输入关键词搜索 ✨</div>`;
      setTimeout(()=> input.focus(), 30);
    }
    function close(){ modal.hidden = true; }
    $("#openSearchBtn").addEventListener("click", open);
    modal.addEventListener("click", e => {
      if (e.target.matches("[data-close], .modal-mask")) close();
    });
    const run = debounce(async () => {
      const q = input.value.trim().toLowerCase();
      if(!q){ results.innerHTML = ""; return; }
      const all = await RecipeDB.listAll();
      const hit = all.filter(r => {
        const txt = (r.name + " " + r.category + " " + (r.ingredients||[]).map(i=>i.name).join(" ") + " " + (r.steps||[]).join(" ")).toLowerCase();
        return txt.includes(q);
      });
      if (!hit.length){
        results.innerHTML = `<div style="color:var(--ink-soft); padding:18px; text-align:center; font-family:'ZCOOL XiaoWei',serif;">没有找到，试试别的词 🍯</div>`;
        return;
      }
      results.innerHTML = hit.slice(0, 50).map(r => {
        const cat = CAT_MAP[r.category] || { name:r.category, emoji:"🍴" };
        const thumb = (r.photos && r.photos[0])
          ? `<div class="thumb"><img src="${r.photos[0]}"></div>`
          : `<div class="thumb">${cat.emoji}</div>`;
        return `
          <button class="row" data-id="${r.id}">
            ${thumb}
            <div style="flex:1;">
              <div class="name">${escapeHTML(r.name)}</div>
              <div style="font-size:12px; color:var(--ink-soft); font-family:'ZCOOL XiaoWei',serif;">${cat.emoji} ${escapeHTML(cat.name)} · ${fmtDate(r.updatedAt)}</div>
            </div>
            <div>${r.favorite?"❤️":"🤍"}</div>
          </button>
        `;
      }).join("");
      $$(".row", results).forEach(b => b.addEventListener("click", () => {
        close(); go(`r/${b.dataset.id}`);
      }));
    }, 160);
    input.addEventListener("input", run);
  }

  // ============ 备份 / 恢复 ============
  function setupBackup(){
    const modal = $("#backupModal");
    function open(){ modal.hidden = false; }
    function close(){ modal.hidden = true; }
    $("#openBackupBtn").addEventListener("click", open);
    modal.addEventListener("click", e => {
      if (e.target.matches("[data-close], .modal-mask")) close();
    });
    $("#exportBackupBtn").addEventListener("click", async () => {
      const list = await RecipeDB.listAll();
      const payload = {
        app: "食谱天下 · Watercolour Recipe",
        version: 1,
        exportedAt: new Date().toISOString(),
        count: list.length,
        recipes: list,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().replace(/[:.]/g,"-");
      a.href = url; a.download = `recipes-backup-${ts}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=> URL.revokeObjectURL(url), 1000);
      toast(`已备份 ${list.length} 个食谱（含照片）📦`);
    });
    $("#importBackupInput").addEventListener("change", async e => {
      const f = e.target.files[0];
      if (!f) return;
      if (!confirm("导入将合并到现有食谱中（ID 相同则覆盖）。确定继续？")) { e.target.value = ""; return; }
      try{
        const text = await f.text();
        const data = JSON.parse(text);
        const arr = Array.isArray(data) ? data : (data.recipes || []);
        if (!Array.isArray(arr)) throw new Error("格式不对");
        let added = 0;
        for (const r of arr){
          if (!r || !r.id) continue;
          if (!r.photos) r.photos = [];
          if (!r.ingredients) r.ingredients = [];
          if (!r.steps) r.steps = [];
          await RecipeDB.put(r); added++;
        }
        toast(`已恢复 ${added} 个食谱 ✨`);
        close(); route();
      }catch(err){
        alert("导入失败：" + err.message);
      }finally{
        e.target.value = "";
      }
    });
    $("#clearAllBtn").addEventListener("click", async () => {
      if (!confirm("⚠️ 这会清空所有本地食谱（含照片），不可撤销！建议先备份。继续吗？")) return;
      if (!confirm("再次确认：真的要全部删除吗？")) return;
      await RecipeDB.clear();
      toast("已清空 🧹");
      close(); route();
    });
  }

  // ============ 启动 ============
  function start(){
    setupSearch();
    setupBackup();
    route();
    (async () => {
      const all = await RecipeDB.listAll();
      if (all.length === 0){
        const demo = {
          id: uid(),
          category: "chicken",
          name: "示例 · 蜜汁烤鸡腿",
          servings: "2 人份",
          prepTime: "10 分钟",
          cookTime: "25 分钟",
          favorite: true,
          notes: "把鸡腿提前腌制 1 小时更入味。",
          ingredients: [
            { name:"鸡腿", qty:"2 只" },
            { name:"蜂蜜", qty:"2 汤匙" },
            { name:"生抽", qty:"1 汤匙" },
            { name:"蒜末", qty:"1 茶匙" },
            { name:"黑胡椒", qty:"少许" },
          ],
          steps: [
            "鸡腿洗净沥干，用叉子在表面戳几个小孔方便入味。",
            "将蜂蜜、生抽、蒜末、黑胡椒混合调成腌汁，涂抹在鸡腿上，冷藏腌 30 分钟以上。",
            "烤箱预热 200℃，把鸡腿放在铺了锡纸的烤盘上。",
            "送入烤箱中层烤 20 分钟，取出刷一层剩余腌汁，再烤 5 分钟至表面焦糖化。",
            "出炉静置 3 分钟再切，装盘撒上葱花即可。",
          ],
          photos: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await RecipeDB.put(demo);
      }
    })();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
