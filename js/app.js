(function () {
  "use strict";

  const defaultTheme = {
    bg: "#fbf7f3",
    panel: "#ffffff",
    panelSoft: "#f8ece9",
    text: "#25313a",
    muted: "#74808a",
    line: "#eadfda",
    accent: "#6f9f9a",
    accent2: "#d98b8b",
    accent3: "#8aa6c1",
    buttonHover: "#5d8e89",
    tableHead: "#f8ece9",
    noteBg: "#fff8f4",
    chipBg: "#f8ece9",
    fontFamily: "system",
    radius: "7",
    density: "comfortable"
  };

  const fontOptions = {
    system: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    songti: '"Noto Serif SC", "Songti SC", SimSun, serif',
    yuanti: '"Yuanti SC", "PingFang SC", "Microsoft YaHei", sans-serif',
    mono: '"SFMono-Regular", Consolas, "Liberation Mono", monospace'
  };

  const state = {
    papers: [],
    basePapers: [],
    roadmaps: null,
    theme: { ...defaultTheme },
    selectedPaperId: "",
    editCategory: "",
    editQuery: "",
    roadmapCategory: "",
    materialQuery: "",
    workbenchMessage: "",
    generatedPapers: [],
    importWarnings: [],
    githubConfig: {
      owner: "yhluo57",
      repo: "phd-literature-notes",
      branch: "main",
      path: "data/papers.json",
      themePath: "data/theme.json",
      token: "",
      autoSync: false
    },
    filters: {
      q: "",
      category: "",
      year: "",
      tag: "",
      status: ""
    }
  };

  const app = document.getElementById("app");

  function esc(value) {
    const div = document.createElement("div");
    div.textContent = value == null ? "" : String(value);
    return div.innerHTML;
  }

  function uniq(values) {
    return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "zh-CN"));
  }

  function asArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      return value.split(/[,;，；、\n]/).map((item) => item.trim()).filter(Boolean);
    }
    return [];
  }

  function localDraftKey() {
    return "spintronics-literature-papers-draft";
  }

  function githubConfigKey() {
    return "spintronics-literature-github-config";
  }

  function themeDraftKey() {
    return "spintronics-literature-theme-draft";
  }

  function normalizeTheme(theme) {
    return { ...defaultTheme, ...(theme || {}) };
  }

  function loadThemeDraft(fetchedTheme) {
    try {
      const draft = JSON.parse(localStorage.getItem(themeDraftKey()) || "null");
      return normalizeTheme(draft || fetchedTheme);
    } catch (error) {
      state.workbenchMessage = `主题草稿读取失败，已使用默认主题：${error.message}`;
      return normalizeTheme(fetchedTheme);
    }
  }

  function applyTheme() {
    const theme = normalizeTheme(state.theme);
    const root = document.documentElement;
    const varMap = {
      bg: "--bg",
      panel: "--panel",
      panelSoft: "--panel-soft",
      text: "--text",
      muted: "--muted",
      line: "--line",
      accent: "--accent",
      accent2: "--accent-2",
      accent3: "--accent-3",
      buttonHover: "--button-hover",
      tableHead: "--table-head",
      noteBg: "--note-bg",
      chipBg: "--chip-bg"
    };
    Object.entries(varMap).forEach(([key, cssVar]) => root.style.setProperty(cssVar, theme[key]));
    root.style.setProperty("--font-body", fontOptions[theme.fontFamily] || fontOptions.system);
    root.style.setProperty("--radius", `${theme.radius || defaultTheme.radius}px`);
    root.style.setProperty("--control-min-height", theme.density === "compact" ? "34px" : "40px");
    root.style.setProperty("--block-padding", theme.density === "compact" ? "18px" : "22px");
  }

  function saveThemeDraft() {
    localStorage.setItem(themeDraftKey(), JSON.stringify(state.theme, null, 2));
    applyTheme();
  }

  function loadGithubConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem(githubConfigKey()) || "{}");
      state.githubConfig = {
        ...state.githubConfig,
        ...saved,
        token: sessionStorage.getItem("spintronics-literature-github-token") || ""
      };
    } catch (error) {
      state.workbenchMessage = `读取 GitHub 配置失败：${error.message}`;
    }
  }

  function persistGithubConfig() {
    const { token, ...safeConfig } = state.githubConfig;
    localStorage.setItem(githubConfigKey(), JSON.stringify(safeConfig));
    if (token) sessionStorage.setItem("spintronics-literature-github-token", token);
  }

  function loadDraftPapers(fetchedPapers) {
    try {
      const draft = JSON.parse(localStorage.getItem(localDraftKey()) || "null");
      return Array.isArray(draft) && draft.length ? draft : fetchedPapers;
    } catch (error) {
      state.workbenchMessage = `本地草稿读取失败，已使用线上数据：${error.message}`;
      return fetchedPapers;
    }
  }

  function saveDraftPapers() {
    localStorage.setItem(localDraftKey(), JSON.stringify(state.papers, null, 2));
  }

  function hasUnsyncedChanges() {
    return JSON.stringify(state.papers) !== JSON.stringify(state.basePapers);
  }

  function syncStatusBlock() {
    const dirty = hasUnsyncedChanges();
    const tokenReady = Boolean(state.githubConfig.token);
    const statusText = dirty ? "有未同步修改" : "无未同步修改";
    const detail = dirty
      ? "你的修改已自动保存在当前浏览器中，点击同步后才会正式写回 GitHub。"
      : "当前浏览器中的文献数据与上次读取/保存到 GitHub 的版本一致。";
    return `
      <div class="sync-panel ${dirty ? "dirty" : "clean"}">
        <div>
          <strong>${esc(statusText)}</strong>
          <span>${esc(detail)}</span>
        </div>
        <div class="sync-actions">
          <label class="toggle-row">
            <input id="auto-sync" type="checkbox"${state.githubConfig.autoSync ? " checked" : ""}>
            <span>自动同步模式</span>
          </label>
          <button id="sync-now" type="button"${dirty && tokenReady ? "" : " disabled"} title="${esc(syncButtonHint(dirty, tokenReady))}">同步到 GitHub</button>
        </div>
      </div>
    `;
  }

  function syncButtonHint(dirty, tokenReady) {
    if (!dirty) return "当前没有需要同步的修改";
    if (!tokenReady) return "请先在下方 GitHub 同步设置中填写 token";
    return "把当前文献库写回 GitHub";
  }

  function themeField(label, key, type = "color") {
    const value = state.theme[key] ?? defaultTheme[key];
    if (type === "select") {
      return `
        <label>${esc(label)}
          <select id="theme-${esc(key)}">
            <option value="system"${value === "system" ? " selected" : ""}>现代无衬线</option>
            <option value="songti"${value === "songti" ? " selected" : ""}>宋体/论文感</option>
            <option value="yuanti"${value === "yuanti" ? " selected" : ""}>圆体/柔和感</option>
            <option value="mono"${value === "mono" ? " selected" : ""}>等宽/数据感</option>
          </select>
        </label>
      `;
    }
    if (type === "density") {
      return `
        <label>${esc(label)}
          <select id="theme-${esc(key)}">
            <option value="comfortable"${value === "comfortable" ? " selected" : ""}>舒展</option>
            <option value="compact"${value === "compact" ? " selected" : ""}>紧凑</option>
          </select>
        </label>
      `;
    }
    if (type === "range") {
      return `
        <label>${esc(label)}
          <input id="theme-${esc(key)}" type="range" min="2" max="12" value="${esc(value)}">
        </label>
      `;
    }
    return `
      <label>${esc(label)}
        <span class="color-control">
          <input id="theme-${esc(key)}" type="color" value="${esc(value)}">
          <input id="theme-${esc(key)}-text" value="${esc(value)}" spellcheck="false">
        </span>
      </label>
    `;
  }

  function renderThemeEditor() {
    return `
      <div class="method-block">
        <h2>主题设置</h2>
        <p>这里可以自己调整配色、字体和界面疏密。点击“应用到当前浏览器”会立刻预览且不会增加 GitHub 部署次数；确认喜欢后再点击“保存主题到 GitHub”。</p>
        <div class="theme-preview">
          <div>
            <strong>雾粉杏 · 鼠尾草绿 · 温柔墨蓝</strong>
            <span>背景、重点色和参数 chip 会跟随这里的颜色变化。</span>
          </div>
          <div class="theme-swatches">
            ${["bg", "accent", "accent2", "accent3", "panelSoft"].map((key) => `<span style="background:${esc(state.theme[key])}"></span>`).join("")}
          </div>
        </div>
        <div class="form-grid four theme-grid">
          ${themeField("背景", "bg")}
          ${themeField("卡片", "panel")}
          ${themeField("柔和底色", "panelSoft")}
          ${themeField("主文字", "text")}
          ${themeField("次级文字", "muted")}
          ${themeField("边框", "line")}
          ${themeField("主色", "accent")}
          ${themeField("玫瑰强调", "accent2")}
          ${themeField("蓝灰强调", "accent3")}
          ${themeField("按钮悬停", "buttonHover")}
          ${themeField("表头底色", "tableHead")}
          ${themeField("笔记底色", "noteBg")}
          ${themeField("标签底色", "chipBg")}
          ${themeField("字体", "fontFamily", "select")}
          ${themeField("卡片圆角", "radius", "range")}
          ${themeField("界面密度", "density", "density")}
        </div>
        <div class="button-row">
          <button id="apply-theme" type="button">应用到当前浏览器</button>
          <button id="save-theme-github" type="button">保存主题到 GitHub</button>
          <button id="reset-theme" type="button">恢复默认主题</button>
        </div>
      </div>
    `;
  }

  function afterPapersChanged(message) {
    saveDraftPapers();
    if (state.githubConfig.autoSync && state.githubConfig.token) {
      state.workbenchMessage = `${message} 正在自动同步到 GitHub...`;
      renderWorkbench();
      window.setTimeout(() => pushPapersToGithub({ fromAutoSync: true }), 0);
      return;
    }
    state.workbenchMessage = state.githubConfig.autoSync && !state.githubConfig.token
      ? `${message} 自动同步需要先填写 GitHub token。`
      : message;
    renderWorkbench();
  }

  function resetDraftPapers() {
    state.papers = structuredClone(state.basePapers);
    localStorage.removeItem(localDraftKey());
    state.workbenchMessage = "已恢复为 GitHub 上的原始数据。";
  }

  function nextPaperId() {
    const maxId = state.papers.reduce((max, paper) => {
      const number = Number.parseInt(paper.id, 10);
      return Number.isFinite(number) ? Math.max(max, number) : max;
    }, 0);
    return String(maxId + 1).padStart(3, "0");
  }

  function normalizePaper(paper) {
    return {
      id: paper.id || nextPaperId(),
      title: paper.title || "Untitled paper",
      title_zh: paper.title_zh || "",
      year: paper.year || "",
      venue: paper.venue || "",
      category: paper.category || "待分组",
      topic: paper.topic || "",
      source_folder: paper.source_folder || "",
      local_path: paper.local_path || "",
      doi: paper.doi || "",
      url: paper.url || "",
      authors: paper.authors || "",
      material_system: paper.material_system || "",
      device_structure: paper.device_structure || "",
      physical_mechanisms: asArray(paper.physical_mechanisms),
      key_metrics: paper.key_metrics || {},
      experimental_conditions: paper.experimental_conditions || {},
      research_question: paper.research_question || "",
      main_contribution: paper.main_contribution || "",
      evidence_chain: Array.isArray(paper.evidence_chain) ? paper.evidence_chain : [],
      figures: Array.isArray(paper.figures) ? paper.figures : [],
      figure_cards: Array.isArray(paper.figure_cards) ? paper.figure_cards : [],
      my_notes: paper.my_notes || "",
      relevance_to_my_project: paper.relevance_to_my_project || "",
      status: paper.status || "新导入待整理",
      tags: asArray(paper.tags)
    };
  }

  function countBy(items, getter) {
    const counts = {};
    items.forEach((item) => {
      const key = getter(item) || "未标注";
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }

  function filteredPapers() {
    const q = state.filters.q.trim().toLowerCase();
    return state.papers.filter((paper) => {
      if (state.filters.category && paper.category !== state.filters.category) return false;
      if (state.filters.year && String(paper.year || "") !== state.filters.year) return false;
      if (state.filters.status && paper.status !== state.filters.status) return false;
      if (state.filters.tag && !(paper.tags || []).includes(state.filters.tag)) return false;
      if (q) {
        const haystack = [
          paper.title,
          paper.title_zh,
          paper.venue,
          paper.material_system,
          paper.device_structure,
          paper.category,
          paper.topic,
          (paper.tags || []).join(" ")
        ].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }

  function statCard(value, label) {
    return `<div class="stat-card"><span class="stat-value">${esc(value)}</span><span class="stat-label">${esc(label)}</span></div>`;
  }

  function buildBars(items, getter) {
    const counts = countBy(items, getter);
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const max = Math.max(...entries.map((entry) => entry[1]), 1);
    return entries.map(([name, count]) => {
      const width = Math.max(6, Math.round((count / max) * 100));
      return `<div class="bar-row"><span>${esc(name)}</span><div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div><b>${count}</b></div>`;
    }).join("");
  }

  function chip(tag, hot) {
    return `<span class="chip${hot ? " hot" : ""}">${esc(tag)}</span>`;
  }

  function renderOptions(values, current, label) {
    return `<option value="">${esc(label)}</option>` + values.map((value) => {
      const selected = String(value) === String(current) ? " selected" : "";
      return `<option value="${esc(value)}"${selected}>${esc(value)}</option>`;
    }).join("");
  }

  function renderOptionsWithNew(values, current, label) {
    const hasCurrent = values.includes(current);
    return `<option value="">${esc(label)}</option>` + values.map((value) => {
      const selected = String(value) === String(current) ? " selected" : "";
      return `<option value="${esc(value)}"${selected}>${esc(value)}</option>`;
    }).join("") + `<option value="__new__"${current && !hasCurrent ? " selected" : ""}>新建...</option>`;
  }

  function selectOrNew(selectId, inputId, fallback = "") {
    const selected = valueOf(selectId);
    if (selected === "__new__") return valueOf(inputId) || fallback;
    return selected || fallback;
  }

  function newValueInput(id, current, values, placeholder) {
    const show = current && !values.includes(current);
    return `<input id="${esc(id)}" class="${show ? "" : "new-value"}" value="${show ? esc(current) : ""}" placeholder="${esc(placeholder)}">`;
  }

  function allFieldValues(field) {
    return uniq(state.papers.map((paper) => paper[field]).filter(Boolean));
  }

  function allArrayValues(field) {
    return uniq(state.papers.flatMap((paper) => paper[field] || []));
  }

  function formatMetricKey(key) {
    const labels = {
      tmr: "TMR",
      tmr_300k: "TMR 300K",
      max_tmr_300k: "最大 TMR 300K",
      max_tmr_10k: "最大 TMR 10K",
      ra: "RA",
      pma: "PMA",
      pma_field: "PMA field",
      ms: "Ms",
      ku: "Ku",
      switching_current_density: "开关电流密度",
      switching_current_density_ta: "Ta 开关电流密度",
      experimental_jc: "实验 Jc",
      experimental_jc_coga: "CoGa 实验 Jc",
      vcma_coefficient: "VCMA coefficient",
      annealing_stability: "退火稳定性",
      annealing_window: "退火窗口"
    };
    return labels[key] || formatKey(key);
  }

  function metricSummary(paper, maxItems = 4) {
    const entries = Object.entries(paper.key_metrics || {}).filter(([, value]) => value != null && value !== "");
    if (!entries.length) return "";
    return entries.slice(0, maxItems).map(([key, value]) => `${formatMetricKey(key)}: ${value}`).join("；");
  }

  function renderOverview() {
    const papers = filteredPapers();
    const categories = uniq(state.papers.map((p) => p.category));
    const years = uniq(state.papers.map((p) => p.year)).sort((a, b) => b - a);
    const tags = uniq(state.papers.flatMap((p) => p.tags || []));
    const statuses = uniq(state.papers.map((p) => p.status));
    const materialCount = uniq(state.papers.map((p) => p.material_system).filter(Boolean)).length;
    const importantCount = state.papers.filter((p) => p.status && p.status.includes("重点")).length;

    app.innerHTML = `
      <section class="hero">
        <div class="intro">
          <p class="eyebrow">Spintronics Literature Workbench</p>
          <h1>面向 MRAM、MnGa/MnAl 与微磁模拟的文献整理网页</h1>
          <p>第一版先把你已经读过的本地文献整理成可筛选的研究工作台。相比原 ISSCC 页面，这里把重点从芯片工艺/能效改成材料体系、器件结构、物理机制、实验条件、关键证据和与你课题的关系。</p>
        </div>
        <div class="stat-grid">
          ${statCard(state.papers.length, "已导入文献")}
          ${statCard(categories.length, "研究分组")}
          ${statCard(materialCount, "材料/结构线索")}
          ${statCard(importantCount, "文件名标记重点")}
        </div>
      </section>

      <section class="toolbar">
        <input id="q" type="search" placeholder="搜索标题、材料、机制、标签..." value="${esc(state.filters.q)}">
        <select id="category">${renderOptions(categories, state.filters.category, "全部分组")}</select>
        <select id="year">${renderOptions(years, state.filters.year, "全部年份")}</select>
        <select id="tag">${renderOptions(tags, state.filters.tag, "全部标签")}</select>
        <select id="status">${renderOptions(statuses, state.filters.status, "全部状态")}</select>
      </section>

      <section class="dashboard">
        <aside class="panel">
          <h2>分布概览</h2>
          ${buildBars(state.papers, (p) => p.category)}
          <h2 style="margin-top:22px;">高频标签</h2>
          <div class="tag-cloud">
            ${Object.entries(countBy(state.papers.flatMap((p) => p.tags || []), (x) => x))
              .sort((a, b) => b[1] - a[1])
              .slice(0, 18)
              .map(([name, count]) => chip(`${name} ${count}`, count >= 5))
              .join("")}
          </div>
        </aside>

        <section class="table-shell">
          <div class="table-meta">
            <span>显示 ${papers.length} / ${state.papers.length} 篇</span>
            <span>点击任意行进入单篇笔记页</span>
          </div>
          <div class="paper-table">
            <div class="th">编号</div>
            <div class="th">年份</div>
            <div class="th">分组</div>
            <div class="th">论文</div>
            <div class="th">材料/结构</div>
            <div class="th">机制标签</div>
            <div class="th">状态</div>
            ${papers.map(renderRow).join("")}
          </div>
        </section>
      </section>
    `;

    bindOverviewEvents();
  }

  function renderRow(paper) {
    const mechanisms = paper.physical_mechanisms && paper.physical_mechanisms.length
      ? paper.physical_mechanisms
      : (paper.tags || []).slice(0, 3);
    return `
      <div class="row" data-id="${esc(paper.id)}">
        <div class="td">${esc(paper.id)}</div>
        <div class="td">${esc(paper.year || "-")}</div>
        <div class="td">${esc(paper.category)}</div>
        <div class="td">
          <span class="title-main">${esc(paper.title)}</span>
          <span class="title-sub">${esc(paper.venue || "期刊/会议待核对")}</span>
        </div>
        <div class="td">${esc(paper.material_system || "-")}</div>
        <div class="td"><div class="tags">${mechanisms.map((tag) => chip(tag)).join("")}</div></div>
        <div class="td">${chip(paper.status || "待整理", paper.status && paper.status.includes("重点"))}</div>
      </div>
    `;
  }

  function bindOverviewEvents() {
    ["q", "category", "year", "tag", "status"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener(id === "q" ? "input" : "change", () => {
        state.filters[id] = el.value;
        renderOverview();
      });
    });
    document.querySelector(".paper-table").addEventListener("click", (event) => {
      const row = event.target.closest(".row");
      if (row) window.location.hash = `#paper/${row.dataset.id}`;
    });
  }

  function renderDetail(id) {
    const paper = state.papers.find((item) => item.id === id);
    if (!paper) {
      app.innerHTML = `<div class="empty"><a class="back-link" href="#overview">返回总览</a><p>没有找到这篇文献。</p></div>`;
      return;
    }
    const prevNext = adjacent(id);
    app.innerHTML = `
      <section class="detail-layout">
        <aside class="sidebar">
          ${state.papers.map((p) => `<a class="side-item${p.id === id ? " active" : ""}" href="#paper/${esc(p.id)}">${esc(p.id)} · ${esc(p.title.slice(0, 42))}</a>`).join("")}
        </aside>
        <article class="detail-main">
          <a class="back-link" href="#overview">← 返回总览</a>
          <h1 class="detail-title">${esc(paper.title)}</h1>
          <div class="detail-meta">
            ${chip(paper.category, true)}
            ${chip(paper.year || "年份待核对")}
            ${chip(paper.venue || "期刊/会议待核对")}
            ${chip(paper.status || "待整理")}
          </div>

          <section class="section">
            <h2>文献信息</h2>
            <div class="kv-grid">
              ${kv("中文题名", paper.title_zh || "待补充")}
              ${kv("作者", paper.authors || "待补充")}
              ${kv("DOI", paper.doi || "待补充")}
              ${kv("材料体系", paper.material_system || "待补充")}
              ${kv("器件结构", paper.device_structure || "待补充")}
              ${kv("研究主题", paper.topic || "待补充")}
              ${kv("物理机制", (paper.physical_mechanisms || []).join(" / ") || "待补充")}
              ${kv("本地来源", paper.source_folder || "待补充")}
              ${kv("文件路径", paper.local_path || "待补充")}
            </div>
          </section>

          <section class="section">
            <h2>研究问题 · 核心贡献 · 证据链</h2>
            ${paper.abstract ? `<div class="note-box"><strong>摘要整理：</strong>${esc(paper.abstract)}</div>` : ""}
            <div class="kv-grid" style="margin-top:10px;">
              ${kv("研究问题", paper.research_question || "待精整理")}
              ${kv("核心贡献", paper.main_contribution || "待精整理")}
              ${kv("与我课题的关系", paper.relevance_to_my_project || "待精整理")}
            </div>
            ${renderEvidence(paper.evidence_chain)}
          </section>

          <section class="section">
            <h2>关键指标</h2>
            ${renderObjectGrid(paper.key_metrics, "关键指标待补充")}
          </section>

          <section class="section">
            <h2>关键图谱卡片</h2>
            ${renderFigureCards(paper.figure_cards)}
          </section>

          <section class="section">
            <h2>实验条件</h2>
            ${renderObjectGrid(paper.experimental_conditions, "实验条件待补充")}
          </section>

          <section class="section">
            <h2>我的笔记</h2>
            <div class="note-box">${esc(paper.my_notes || "待加入你的个人判断、组会备注和后续实验/模拟启发。")}</div>
          </section>

          <section class="section">
            <h2>标签</h2>
            <div class="tags">${(paper.tags || []).map((tag) => chip(tag)).join("")}</div>
          </section>

          <section class="section">
            <h2>导航</h2>
            <div class="detail-meta">
              ${prevNext.prev ? `<a class="chip" href="#paper/${esc(prevNext.prev)}">← 上一篇 ${esc(prevNext.prev)}</a>` : ""}
              ${prevNext.next ? `<a class="chip" href="#paper/${esc(prevNext.next)}">下一篇 ${esc(prevNext.next)} →</a>` : ""}
            </div>
          </section>
        </article>
      </section>
    `;
  }

  function kv(label, value) {
    return `<div class="kv"><label>${esc(label)}</label><strong>${esc(value)}</strong></div>`;
  }

  function renderObjectGrid(obj, fallback) {
    const entries = Object.entries(obj || {}).filter(([, value]) => value != null && value !== "");
    if (!entries.length) {
      return `<div class="note-box">${esc(fallback)}</div>`;
    }
    return `<div class="kv-grid">${entries.map(([key, value]) => kv(formatKey(key), value)).join("")}</div>`;
  }

  function renderEvidence(items) {
    if (!items || !items.length) return "";
    return `
      <div style="margin-top:16px;">
        <h2>关键证据</h2>
        <div class="kv-grid">
          ${items.map((item) => kv(item.label || "证据", item.text || "")).join("")}
        </div>
      </div>
    `;
  }

  function renderFigureCards(items) {
    if (!items || !items.length) {
      return `<div class="note-box">第三阶段会把这篇的关键图、读图要点、证明链条和可引用位置补进来。</div>`;
    }
    return `
      <div class="figure-card-grid">
        ${items.map((item) => `
          <div class="reading-card">
            <div class="figure-chip">${esc(item.fig || "Figure")}</div>
            <h3>${esc(item.claim || "")}</h3>
            <p><strong>读图：</strong>${esc(item.what_to_read || "")}</p>
            <p><strong>意义：</strong>${esc(item.why_it_matters || "")}</p>
            <p><strong>用途：</strong>${esc(item.use_for || "")}</p>
          </div>
        `).join("")}
      </div>
    `;
  }

  function formatKey(key) {
    return String(key)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase());
  }

  function adjacent(id) {
    const index = state.papers.findIndex((paper) => paper.id === id);
    return {
      prev: index > 0 ? state.papers[index - 1].id : null,
      next: index >= 0 && index < state.papers.length - 1 ? state.papers[index + 1].id : null
    };
  }

  function renderMethod() {
    app.innerHTML = `
      <section class="method-page">
        <div class="method-block">
          <a class="back-link" href="#overview">← 返回总览</a>
          <h1>为什么这样改</h1>
          <p>原 ISSCC 页面服务于集成电路会议论文比较，所以强调工艺节点、面积、功耗、能效和目标模型。你的研究更接近材料、磁性物理、器件和仿真之间的交叉，因此第一版把文献组织改成了“材料体系、器件结构、物理机制、实验条件、关键证据、课题相关性”。</p>
        </div>
        <div class="method-block">
          <h2>适合你的核心字段</h2>
          <ul>
            <li>MRAM/MTJ 论文重点记录 TMR、RA、PMA、热稳定性、MgO界面、插层和退火条件。</li>
            <li>MnGa/MnAl 论文重点记录 L10 相、垂直磁各向异性、AHE、界面层、种子层和电流诱导翻转行为。</li>
            <li>微磁模拟相关论文重点记录 Ms、Ku、Aex、DMI、阻尼、网格尺寸、边界条件和模拟目标。</li>
            <li>VCMA 与 ML/MBE 文献作为方法分支，用来服务器件调控和材料生长优化。</li>
          </ul>
        </div>
        <div class="method-block">
          <h2>后续分阶段整理方式</h2>
          <ul>
            <li>阶段 1：先完成网页框架和 37 篇文献的基本目录。</li>
            <li>阶段 2：优先精整理文件名带重点标记的论文，补摘要、研究问题和关键指标。</li>
            <li>阶段 3：为每篇加入关键图谱卡片，把图的结论、证据力度和可引用位置写清楚。</li>
            <li>阶段 4：再加个人笔记、组会引用、论文写作引用位置和实验/模拟启发。</li>
          </ul>
        </div>
      </section>
    `;
  }

  function renderWorkbench() {
    const categories = uniq(state.papers.map((p) => p.category));
    const statuses = allFieldValues("status");
    const materials = allFieldValues("material_system");
    const devices = allFieldValues("device_structure");
    const topics = allFieldValues("topic");
    const mechanisms = allArrayValues("physical_mechanisms");
    const tags = allArrayValues("tags");
    const currentPaper = state.papers.find((paper) => paper.id === state.selectedPaperId);
    const editCategory = state.editCategory || (currentPaper && currentPaper.category) || categories[0] || "";
    const editQuery = state.editQuery || "";
    const categoryPapers = state.papers.filter((paper) => !editCategory || paper.category === editCategory);
    const selectablePapers = categoryPapers.filter((paper) => paperMatchesQuery(paper, editQuery));
    const visiblePapers = selectablePapers.length ? selectablePapers : categoryPapers;
    const selected = selectablePapers.find((paper) => paper.id === state.selectedPaperId)
      || categoryPapers.find((paper) => paper.id === state.selectedPaperId)
      || selectablePapers[0]
      || categoryPapers[0]
      || state.papers[0]
      || normalizePaper({});
    state.selectedPaperId = selected.id;
    state.editCategory = selected.category || editCategory;
    app.innerHTML = `
      <section class="method-page">
        <div class="method-block">
          <a class="back-link" href="#overview">← 返回总览</a>
          <p class="eyebrow">Literature Maintenance</p>
          <h1>文献工作台</h1>
          <p>这里负责新文献导入、半在线编辑、JSON 自动生成、DOI 补全、重点图谱升级和 GitHub 同步。编辑时会先自动保存在当前浏览器中；你可以手动同步，也可以打开自动同步模式。</p>
          ${syncStatusBlock()}
          ${state.workbenchMessage ? `<div class="status-message">${esc(state.workbenchMessage)}</div>` : ""}
        </div>

        <div class="workbench-grid">
          <div class="method-block">
            <h2>从 PDF 文件名批量生成条目</h2>
            <textarea id="filename-input" rows="9" placeholder="每行一个 PDF 文件名，或直接选择 PDF 文件。"></textarea>
            <div class="form-grid">
              <label>默认分组<select id="filename-category">${renderOptionsWithNew(categories, categories[0] || "待分组", "选择分组")}</select>${newValueInput("filename-category-new", "", categories, "新分组名称")}</label>
              <label>默认来源文件夹<input id="filename-folder" placeholder="例如 MnGa/02 MTJ"></label>
              <label>默认状态<select id="filename-status">${renderOptionsWithNew(statuses, "新导入待整理", "选择状态")}</select>${newValueInput("filename-status-new", "新导入待整理", statuses, "新状态名称")}</label>
              <label>选择 PDF 文件<input id="pdf-picker" type="file" accept="application/pdf,.pdf" multiple></label>
            </div>
            <div class="button-row">
              <button id="generate-from-filenames" type="button">生成条目</button>
              <button id="append-generated" type="button">加入文献库</button>
            </div>
            ${renderImportWarnings()}
            <pre id="generated-preview" class="json-preview">${esc(JSON.stringify(state.generatedPapers, null, 2))}</pre>
          </div>

          <div class="method-block">
            <h2>从 DOI 新建文献</h2>
            <div class="form-grid two">
              <label>DOI<input id="doi-input" placeholder="10.xxxx/xxxxx"></label>
              <label>导入到分组<select id="doi-category">${renderOptionsWithNew(categories, selected.category || "待分组", "选择分组")}</select>${newValueInput("doi-category-new", selected.category || "待分组", categories, "新分组名称")}</label>
            </div>
            <div class="button-row">
              <button id="fetch-doi" type="button">生成新条目预览</button>
            </div>
            <div id="doi-preview" class="note-box">这里用于从 DOI 直接生成一篇新文献。若要补全已有文献，请在下方编辑区选择那篇文献后使用“用 DOI 补全当前文献”。</div>
          </div>
        </div>

        <div class="method-block">
          <h2>在线/半在线编辑</h2>
          <div class="form-grid three">
            <label>先选分组<select id="edit-category-filter">${categories.map((category) => `<option value="${esc(category)}"${category === state.editCategory ? " selected" : ""}>${esc(category)}</option>`).join("")}</select></label>
            <label>再搜文献<input id="paper-search" type="search" value="${esc(editQuery)}" placeholder="标题、编号、作者、DOI..."></label>
            <label>当前范围<input readonly value="${esc(selectablePapers.length)} / ${esc(categoryPapers.length)} 篇"></label>
          </div>
          <div class="form-grid three">
            <label>选择文献<select id="paper-select">${visiblePapers.map((paper) => `<option value="${esc(paper.id)}"${paper.id === selected.id ? " selected" : ""}>${esc(paper.id)} · ${esc(paper.title.slice(0, 72))}</option>`).join("")}</select></label>
            <label>编号<input id="edit-id" value="${esc(selected.id)}"></label>
            <label>年份<input id="edit-year" value="${esc(selected.year || "")}"></label>
            <label>标题<input id="edit-title" value="${esc(selected.title || "")}"></label>
            <label>中文题名<input id="edit-title-zh" value="${esc(selected.title_zh || "")}"></label>
            <label>期刊/会议<input id="edit-venue" value="${esc(selected.venue || "")}"></label>
            <label>分组<select id="edit-category">${renderOptionsWithNew(categories, selected.category || "", "选择分组")}</select>${newValueInput("edit-category-new", selected.category || "", categories, "新分组名称")}</label>
            <label>主题<select id="edit-topic">${renderOptionsWithNew(topics, selected.topic || "", "选择主题")}</select>${newValueInput("edit-topic-new", selected.topic || "", topics, "新主题名称")}</label>
            <label>DOI<input id="edit-doi" value="${esc(selected.doi || "")}" placeholder="10.xxxx/xxxxx"></label>
            <label>作者<input id="edit-authors" value="${esc(selected.authors || "")}"></label>
            <label>材料体系<select id="edit-material">${renderOptionsWithNew(materials, selected.material_system || "", "选择材料体系")}</select>${newValueInput("edit-material-new", selected.material_system || "", materials, "新材料体系")}</label>
            <label>器件结构<select id="edit-device">${renderOptionsWithNew(devices, selected.device_structure || "", "选择器件结构")}</select>${newValueInput("edit-device-new", selected.device_structure || "", devices, "新器件结构")}</label>
            <label>物理机制<select id="edit-mechanism-add">${renderOptionsWithNew(mechanisms, "", "添加机制")}</select>${newValueInput("edit-mechanism-new", "", mechanisms, "新机制名称")}<button class="small-button" id="add-mechanism" type="button">加入机制</button><input id="edit-mechanisms" value="${esc((selected.physical_mechanisms || []).join("，"))}"></label>
            <label>标签<select id="edit-tag-add">${renderOptionsWithNew(tags, "", "添加标签")}</select>${newValueInput("edit-tag-new", "", tags, "新标签名称")}<button class="small-button" id="add-tag" type="button">加入标签</button><input id="edit-tags" value="${esc((selected.tags || []).join("，"))}"></label>
            <label>状态<select id="edit-status">${renderOptionsWithNew(statuses, selected.status || "", "选择状态")}</select>${newValueInput("edit-status-new", selected.status || "", statuses, "新状态名称")}</label>
            <label>本地路径<input id="edit-local-path" value="${esc(selected.local_path || "")}"></label>
          </div>
          <div class="form-grid two notes">
            <label>研究问题<textarea id="edit-question" rows="4">${esc(selected.research_question || "")}</textarea></label>
            <label>核心贡献<textarea id="edit-contribution" rows="4">${esc(selected.main_contribution || "")}</textarea></label>
            <label>与我课题的关系<textarea id="edit-relevance" rows="4">${esc(selected.relevance_to_my_project || "")}</textarea></label>
            <label>我的笔记<textarea id="edit-notes" rows="4">${esc(selected.my_notes || "")}</textarea></label>
          </div>
          <div class="button-row">
            <button id="save-selected" type="button">保存到本地草稿</button>
            <button id="apply-doi-to-selected" type="button">用 DOI 补全当前文献</button>
            <button id="new-paper" type="button">新建空白条目</button>
            <button id="upgrade-atlas" type="button">升级为重点图谱</button>
            <button id="reset-draft" type="button">放弃本地草稿</button>
          </div>
        </div>

        <div class="workbench-grid">
          <div class="method-block">
            <h2>JSON 自动生成</h2>
            <p>当前 JSON 会由页面中的文献库实时生成，可用于手动备份、代码审阅或替换 data/papers.json。</p>
            <div class="button-row">
              <button id="copy-json" type="button">复制 JSON</button>
              <button id="download-json" type="button">下载 JSON</button>
            </div>
            <pre class="json-preview">${esc(JSON.stringify(state.papers, null, 2).slice(0, 6000))}${state.papers.length ? "\n..." : ""}</pre>
          </div>

          <div class="method-block">
            <h2>GitHub 同步设置</h2>
            <p>这部分只需要偶尔设置。Branch 默认用 <code>main</code>，意思是保存到仓库的主分支；Token 不是 Deploy key，而是 GitHub 生成的一串网页授权码，用来允许这个页面更新 <code>data/papers.json</code>。</p>
            <details class="guide-box">
              <summary>第一次使用：如何生成 token</summary>
              <ol>
                <li>打开 GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens。</li>
                <li>选择仓库 <code>yhluo57/phd-literature-notes</code>。</li>
                <li>Repository permissions 里只给 Contents 选择 Read and write。</li>
                <li>生成后复制 token，粘贴到这里。关闭浏览器后需要重新粘贴一次。</li>
              </ol>
            </details>
            <div class="form-grid two">
              <label>Owner<input id="gh-owner" value="${esc(state.githubConfig.owner)}"></label>
              <label>Repo<input id="gh-repo" value="${esc(state.githubConfig.repo)}"></label>
              <label>Branch<input id="gh-branch" value="${esc(state.githubConfig.branch)}"></label>
              <label>文件路径<input id="gh-path" value="${esc(state.githubConfig.path)}"></label>
              <label>主题路径<input id="gh-theme-path" value="${esc(state.githubConfig.themePath)}"></label>
              <label class="wide">Token<input id="gh-token" type="password" placeholder="Fine-grained token: Contents read/write"></label>
            </div>
            <div class="button-row">
              <button id="save-gh-config" type="button">保存配置</button>
            </div>
            <div class="note-box">顶部“同步到 GitHub”是正式保存按钮；这里负责填写保存按钮需要的地址和授权。你通常保持 Owner、Repo、Branch、文件路径不变，只在需要同步时填写 Token。</div>
          </div>
        </div>

        ${renderThemeEditor()}

        <div class="method-block">
          <h2>批量编辑</h2>
          <p>批量编辑会作用于当前筛选出的文献。建议先选分组和搜索关键词，确认“当前范围”数量正确后再应用。</p>
          <div class="form-grid four">
            <label>修改字段<select id="batch-field">
              <option value="status">状态</option>
              <option value="category">分组</option>
              <option value="material_system">材料体系</option>
              <option value="device_structure">器件结构</option>
              <option value="add_tag">添加标签</option>
              <option value="add_mechanism">添加物理机制</option>
            </select></label>
            <label>已有值<select id="batch-value">${renderOptionsWithNew(uniq([...statuses, ...categories, ...materials, ...devices, ...tags, ...mechanisms]), "", "选择已有值")}</select>${newValueInput("batch-value-new", "", [], "新建值")}</label>
            <label>作用范围<input readonly value="${esc(selectablePapers.length)} 篇"></label>
            <label>确认<input id="batch-confirm" placeholder="输入 APPLY"></label>
          </div>
          <div class="button-row">
            <button id="apply-batch" type="button">应用批量编辑</button>
          </div>
        </div>
      </section>
    `;
    bindWorkbenchEvents();
  }

  function bindWorkbenchEvents() {
    document.getElementById("auto-sync")?.addEventListener("change", (event) => {
      state.githubConfig.autoSync = event.target.checked;
      persistGithubConfig();
      state.workbenchMessage = state.githubConfig.autoSync
        ? "自动同步模式已打开。之后保存文献时会尝试直接同步到 GitHub。"
        : "自动同步模式已关闭。之后修改会先留在本地，手动点击同步再写回 GitHub。";
      renderWorkbench();
    });
    document.getElementById("sync-now")?.addEventListener("click", () => pushPapersToGithub());
    document.getElementById("edit-category-filter")?.addEventListener("change", (event) => {
      state.editCategory = event.target.value;
      state.editQuery = "";
      state.selectedPaperId = "";
      state.workbenchMessage = "";
      renderWorkbench();
    });
    document.getElementById("paper-search")?.addEventListener("input", (event) => {
      state.editQuery = event.target.value;
      renderWorkbench();
    });
    document.getElementById("paper-select")?.addEventListener("change", (event) => {
      state.selectedPaperId = event.target.value;
      const paper = state.papers.find((item) => item.id === state.selectedPaperId);
      if (paper) state.editCategory = paper.category || state.editCategory;
      state.workbenchMessage = "";
      renderWorkbench();
    });
    document.getElementById("pdf-picker")?.addEventListener("change", (event) => {
      const names = [...event.target.files].map((file) => file.name).join("\n");
      document.getElementById("filename-input").value = names;
    });
    document.getElementById("generate-from-filenames")?.addEventListener("click", () => {
      const names = document.getElementById("filename-input").value.split(/\n+/).map((name) => name.trim()).filter(Boolean);
      const category = selectOrNew("filename-category", "filename-category-new", "待分组");
      const folder = document.getElementById("filename-folder").value.trim();
      const status = selectOrNew("filename-status", "filename-status-new", "新导入待整理");
      state.generatedPapers = names.map((name, index) => paperFromFilename(name, { category, folder, status, offset: index }));
      state.importWarnings = detectImportDuplicates(state.generatedPapers).warnings;
      state.workbenchMessage = `已从 ${state.generatedPapers.length} 个文件名生成 JSON 条目。${state.importWarnings.length ? "请先查看重复提示。" : ""}`;
      renderWorkbench();
    });
    document.getElementById("append-generated")?.addEventListener("click", () => {
      if (!state.generatedPapers.length) {
        state.workbenchMessage = "还没有可加入的生成条目。";
        renderWorkbench();
      } else {
        const report = detectImportDuplicates(state.generatedPapers);
        const safePapers = state.generatedPapers.filter((paper, index) => !report.blockedIndexes.has(index));
        if (!safePapers.length) {
          state.importWarnings = report.warnings;
          state.workbenchMessage = "检测到这些条目都已经存在或在本批次内重复，未加入文献库。";
          renderWorkbench();
          return;
        }
        state.papers = [...state.papers, ...safePapers.map(normalizePaper)];
        state.selectedPaperId = safePapers[0].id;
        state.generatedPapers = [];
        state.importWarnings = [];
        afterPapersChanged(`已加入 ${safePapers.length} 篇文献；${report.blockedIndexes.size ? `跳过 ${report.blockedIndexes.size} 个强重复条目。` : ""}`);
      }
    });
    document.getElementById("fetch-doi")?.addEventListener("click", fetchDoiIntoPreview);
    document.getElementById("apply-doi-to-selected")?.addEventListener("click", applyDoiToSelected);
    document.getElementById("save-selected")?.addEventListener("click", saveSelectedFromForm);
    document.getElementById("new-paper")?.addEventListener("click", () => {
      const paper = normalizePaper({ id: nextPaperId(), category: "待分组" });
      state.papers.push(paper);
      state.selectedPaperId = paper.id;
      afterPapersChanged("已新建空白条目。");
    });
    document.getElementById("upgrade-atlas")?.addEventListener("click", upgradeSelectedToAtlas);
    document.getElementById("reset-draft")?.addEventListener("click", () => {
      resetDraftPapers();
      renderWorkbench();
    });
    document.getElementById("copy-json")?.addEventListener("click", copyCurrentJson);
    document.getElementById("download-json")?.addEventListener("click", downloadCurrentJson);
    document.getElementById("save-gh-config")?.addEventListener("click", saveGithubConfigFromForm);
    document.getElementById("apply-theme")?.addEventListener("click", applyThemeFromForm);
    document.getElementById("save-theme-github")?.addEventListener("click", pushThemeToGithub);
    document.getElementById("reset-theme")?.addEventListener("click", resetTheme);
    bindThemeColorInputs();
    document.getElementById("edit-mechanism-add")?.addEventListener("change", () => {
      if (valueOf("edit-mechanism-add") !== "__new__") addValueToList("edit-mechanism-add", "edit-mechanism-new", "edit-mechanisms");
    });
    document.getElementById("edit-tag-add")?.addEventListener("change", () => {
      if (valueOf("edit-tag-add") !== "__new__") addValueToList("edit-tag-add", "edit-tag-new", "edit-tags");
    });
    document.getElementById("add-mechanism")?.addEventListener("click", () => addValueToList("edit-mechanism-add", "edit-mechanism-new", "edit-mechanisms"));
    document.getElementById("add-tag")?.addEventListener("click", () => addValueToList("edit-tag-add", "edit-tag-new", "edit-tags"));
    document.getElementById("apply-batch")?.addEventListener("click", applyBatchEdit);
    setupNewValueToggles();
  }

  function bindThemeColorInputs() {
    Object.keys(defaultTheme).forEach((key) => {
      const picker = document.getElementById(`theme-${key}`);
      const text = document.getElementById(`theme-${key}-text`);
      if (!picker || !text) return;
      picker.addEventListener("input", () => {
        text.value = picker.value;
      });
      text.addEventListener("input", () => {
        if (/^#[0-9a-f]{6}$/i.test(text.value.trim())) picker.value = text.value.trim();
      });
    });
  }

  function collectThemeFromForm() {
    const nextTheme = { ...state.theme };
    Object.keys(defaultTheme).forEach((key) => {
      const textInput = document.getElementById(`theme-${key}-text`);
      const input = textInput || document.getElementById(`theme-${key}`);
      if (!input) return;
      nextTheme[key] = input.value.trim() || defaultTheme[key];
    });
    nextTheme.radius = String(Math.max(2, Math.min(12, Number(nextTheme.radius) || Number(defaultTheme.radius))));
    return normalizeTheme(nextTheme);
  }

  function applyThemeFromForm() {
    state.theme = collectThemeFromForm();
    saveThemeDraft();
    state.workbenchMessage = "主题已应用到当前浏览器。确认满意后，可以保存主题到 GitHub。";
    renderWorkbench();
  }

  function resetTheme() {
    state.theme = { ...defaultTheme };
    localStorage.removeItem(themeDraftKey());
    applyTheme();
    state.workbenchMessage = "已恢复默认主题。";
    renderWorkbench();
  }

  function setupNewValueToggles() {
    [
      ["filename-category", "filename-category-new"],
      ["filename-status", "filename-status-new"],
      ["doi-category", "doi-category-new"],
      ["edit-category", "edit-category-new"],
      ["edit-topic", "edit-topic-new"],
      ["edit-material", "edit-material-new"],
      ["edit-device", "edit-device-new"],
      ["edit-mechanism-add", "edit-mechanism-new"],
      ["edit-tag-add", "edit-tag-new"],
      ["edit-status", "edit-status-new"],
      ["batch-value", "batch-value-new"]
    ].forEach(([selectId, inputId]) => {
      const select = document.getElementById(selectId);
      const input = document.getElementById(inputId);
      if (!select || !input) return;
      const sync = () => input.classList.toggle("new-value", select.value !== "__new__");
      select.addEventListener("change", sync);
      sync();
    });
  }

  function addValueToList(selectId, newInputId, targetId) {
    const value = selectOrNew(selectId, newInputId);
    if (!value) return;
    const target = document.getElementById(targetId);
    const values = uniq([...asArray(target.value), value]);
    target.value = values.join("，");
  }

  function currentWorkbenchSelection() {
    const category = state.editCategory || "";
    const query = state.editQuery || "";
    return state.papers.filter((paper) => (!category || paper.category === category) && paperMatchesQuery(paper, query));
  }

  function applyBatchEdit() {
    const targets = currentWorkbenchSelection();
    const field = valueOf("batch-field");
    const value = selectOrNew("batch-value", "batch-value-new");
    const confirmed = valueOf("batch-confirm") === "APPLY";
    if (!targets.length) {
      state.workbenchMessage = "当前筛选范围没有文献，未执行批量编辑。";
      renderWorkbench();
      return;
    }
    if (!value || !confirmed) {
      state.workbenchMessage = "请填写批量编辑值，并在确认框输入 APPLY。";
      renderWorkbench();
      return;
    }
    const ids = new Set(targets.map((paper) => paper.id));
    state.papers = state.papers.map((paper) => {
      if (!ids.has(paper.id)) return paper;
      const updated = { ...paper };
      if (field === "add_tag") {
        updated.tags = uniq([...(updated.tags || []), value]);
      } else if (field === "add_mechanism") {
        updated.physical_mechanisms = uniq([...(updated.physical_mechanisms || []), value]);
      } else {
        updated[field] = value;
      }
      return normalizePaper(updated);
    });
    afterPapersChanged(`已批量更新 ${targets.length} 篇文献。`);
  }

  function renderImportWarnings() {
    if (!state.importWarnings.length) return "";
    return `
      <div class="duplicate-panel">
        <h3>重复检测</h3>
        ${state.importWarnings.map((warning) => `
          <div class="duplicate-item ${warning.level}">
            <strong>${esc(warning.label)}</strong>
            <span>${esc(warning.message)}</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  function detectImportDuplicates(candidates) {
    const warnings = [];
    const blockedIndexes = new Set();
    const existingDoi = new Map();
    const existingTitle = new Map();
    state.papers.forEach((paper) => {
      const doi = normalizeDoi(paper.doi);
      const title = normalizeTitle(paper.title);
      if (doi) existingDoi.set(doi, paper);
      if (title) existingTitle.set(title, paper);
    });
    const batchDoi = new Map();
    const batchTitle = new Map();
    candidates.forEach((paper, index) => {
      const doi = normalizeDoi(paper.doi);
      const title = normalizeTitle(paper.title);
      if (doi && existingDoi.has(doi)) {
        const matched = existingDoi.get(doi);
        warnings.push({
          level: "strong",
          label: `${paper.id} 强重复`,
          message: `DOI 与已有文献 ${matched.id} 相同，默认跳过。`
        });
        blockedIndexes.add(index);
      }
      if (title && existingTitle.has(title)) {
        const matched = existingTitle.get(title);
        warnings.push({
          level: "strong",
          label: `${paper.id} 强重复`,
          message: `标题与已有文献 ${matched.id} 基本相同，默认跳过。`
        });
        blockedIndexes.add(index);
      }
      if (doi && batchDoi.has(doi)) {
        warnings.push({
          level: "strong",
          label: `${paper.id} 批次内重复`,
          message: `DOI 与本批次 ${batchDoi.get(doi)} 相同，默认跳过后出现的条目。`
        });
        blockedIndexes.add(index);
      } else if (doi) {
        batchDoi.set(doi, paper.id);
      }
      if (title && batchTitle.has(title)) {
        warnings.push({
          level: "strong",
          label: `${paper.id} 批次内重复`,
          message: `标题与本批次 ${batchTitle.get(title)} 基本相同，默认跳过后出现的条目。`
        });
        blockedIndexes.add(index);
      } else if (title) {
        batchTitle.set(title, paper.id);
      }
      const similar = findSimilarExistingTitle(paper);
      if (similar && !blockedIndexes.has(index)) {
        warnings.push({
          level: "soft",
          label: `${paper.id} 疑似重复`,
          message: `标题与已有文献 ${similar.id} 相似，加入前建议核对。`
        });
      }
    });
    return { warnings, blockedIndexes };
  }

  function normalizeDoi(value) {
    return String(value || "").trim().toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, "");
  }

  function normalizeTitle(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\.pdf$/i, "")
      .replace(/\b(19|20)\d{2}\b/g, "")
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  function findSimilarExistingTitle(candidate) {
    const candidateTitle = normalizeTitle(candidate.title);
    if (!candidateTitle || candidateTitle.length < 18) return null;
    const candidateWords = new Set(candidateTitle.split(" ").filter((word) => word.length > 3));
    if (candidateWords.size < 4) return null;
    return state.papers.find((paper) => {
      const title = normalizeTitle(paper.title);
      const words = new Set(title.split(" ").filter((word) => word.length > 3));
      const overlap = [...candidateWords].filter((word) => words.has(word)).length;
      return overlap / Math.max(candidateWords.size, 1) >= 0.72;
    }) || null;
  }

  function paperMatchesQuery(paper, query) {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const haystack = [
      paper.id,
      paper.title,
      paper.title_zh,
      paper.authors,
      paper.doi,
      paper.venue,
      paper.topic,
      paper.material_system,
      paper.device_structure,
      (paper.tags || []).join(" ")
    ].join(" ").toLowerCase();
    return haystack.includes(q);
  }

  function renderRoadmap() {
    const categories = uniq(state.papers.map((paper) => paper.category));
    const selectedCategory = state.roadmapCategory || categories[0] || "";
    state.roadmapCategory = selectedCategory;
    const papers = state.papers
      .filter((paper) => !selectedCategory || paper.category === selectedCategory)
      .sort((a, b) => Number(a.year || 9999) - Number(b.year || 9999) || String(a.id).localeCompare(String(b.id)));
    app.innerHTML = `
      <section class="method-page">
        <div class="method-block">
          <a class="back-link" href="#overview">← 返回总览</a>
          <p class="eyebrow">Research Map</p>
          <h1>分组文献路线图</h1>
          <p>先选择一个研究分组，再查看该分组内全部文献形成的时间线。这里不只显示重点图谱文献，所有已导入文献都会参与路线图；重点文献会通过状态标签单独标出来。</p>
          <div class="category-picker">
            ${categories.map((category) => {
              const count = state.papers.filter((paper) => paper.category === category).length;
              return `<button class="category-button${category === selectedCategory ? " active" : ""}" data-category="${esc(category)}" type="button">${esc(category)}<span>${count} 篇</span></button>`;
            }).join("")}
          </div>
        </div>
        ${renderDynamicRoadmap(selectedCategory, papers)}
        ${renderMetricTable(selectedCategory, papers)}
        ${renderDynamicComparison(selectedCategory, papers)}
      </section>
    `;
    bindRoadmapEvents();
  }

  function bindRoadmapEvents() {
    document.querySelectorAll(".category-button").forEach((button) => {
      button.addEventListener("click", () => {
        state.roadmapCategory = button.dataset.category;
        renderRoadmap();
      });
    });
  }

  function renderDynamicRoadmap(category, papers) {
    if (!papers.length) {
      return `<div class="method-block"><h2>${esc(category || "未选择分组")}</h2><p>这个分组下还没有文献。</p></div>`;
    }
    return `
      <div class="method-block">
        <h2>${esc(category)} · 全部文献路线图</h2>
        <p>按年份排序，共 ${papers.length} 篇。点击任意文献可进入单篇笔记页。</p>
        <div class="timeline">
          ${papers.map((paper) => `
            <a class="timeline-item" href="#paper/${esc(paper.id)}">
              <span class="timeline-year">${esc(paper.year || "待定")}</span>
              <div>
                <h3>${esc(paper.id)} · ${esc(paper.title_zh || paper.title)}</h3>
                <div class="detail-meta compact">
                  ${chip(paper.status || "待整理", paper.status && paper.status.includes("重点"))}
                  ${paper.venue ? chip(paper.venue) : ""}
                  ${paper.topic ? chip(paper.topic) : ""}
                </div>
                <p><strong>研究对象：</strong>${esc([paper.material_system, paper.device_structure].filter(Boolean).join(" / ") || "待补充")}</p>
                <p><strong>关键参数：</strong>${esc(metricSummary(paper) || "待补充")}</p>
                <p><strong>主要线索：</strong>${esc(paper.main_contribution || paper.research_question || paper.abstract || "待精整理")}</p>
                <p><strong>课题关系：</strong>${esc(paper.relevance_to_my_project || "待补充")}</p>
              </div>
            </a>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderMetricTable(category, papers) {
    return `
      <div class="method-block">
        <h2>${esc(category)} · 关键参数汇总</h2>
        <p>自动读取每篇文献的 key_metrics 字段。还没整理参数的文献会标为“待补充”，方便后续补齐。</p>
        <div class="compare-table metric-table">
          <div class="compare-row compare-head">
            <div>编号</div>
            <div>年份</div>
            <div>论文</div>
            <div>关键参数</div>
          </div>
          ${papers.map((paper) => {
            const metrics = Object.entries(paper.key_metrics || {}).filter(([, value]) => value != null && value !== "");
            return `
              <div class="compare-row">
                <div><a href="#paper/${esc(paper.id)}">${esc(paper.id)}</a></div>
                <div>${esc(paper.year || "-")}</div>
                <div>${esc(paper.title_zh || paper.title)}</div>
                <div>${metrics.length ? metrics.map(([key, value]) => `<span class="metric-chip">${esc(formatMetricKey(key))}: ${esc(value)}</span>`).join("") : `<span class="metric-missing">待补充</span>`}</div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function renderDynamicComparison(category, papers) {
    if (!papers.length) return "";
    return `
      <div class="method-block">
        <h2>${esc(category)} · 全量对照表</h2>
        <div class="compare-table all-papers">
          <div class="compare-row compare-head">
            <div>编号</div>
            <div>年份</div>
            <div>论文</div>
            <div>材料/结构</div>
            <div>状态</div>
          </div>
          ${papers.map((paper) => `
            <div class="compare-row">
              <div><a href="#paper/${esc(paper.id)}">${esc(paper.id)}</a></div>
              <div>${esc(paper.year || "-")}</div>
              <div>${esc(paper.title_zh || paper.title)}</div>
              <div>${esc([paper.material_system, paper.device_structure].filter(Boolean).join(" / ") || "-")}</div>
              <div>${esc(paper.status || "待整理")}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderRoadmapBranch(key, tableTitle) {
    const map = state.roadmaps && state.roadmaps[key];
    if (!map) return "";
    const table = state.roadmaps.comparison_tables && state.roadmaps.comparison_tables[key];
    return `${renderRoadmapBlock(map)}${renderTableBlock(tableTitle, table)}`;
  }

  function renderRoadmapBlock(map) {
    return `
      <div class="method-block">
        <h2>${esc(map.title)}</h2>
        <p>${esc(map.subtitle)}</p>
        <div class="timeline">
          ${map.stages.map((stage) => {
            const paper = state.papers.find((p) => p.id === stage.paper_id);
            return `
              <a class="timeline-item" href="#paper/${esc(stage.paper_id)}">
                <span class="timeline-year">${esc(stage.year)}</span>
                <div>
                  <h3>${esc(stage.paper_id)} · ${esc(paper ? (paper.title_zh || paper.title) : stage.paper_id)}</h3>
                  <p><strong>问题：</strong>${esc(stage.problem)}</p>
                  <p><strong>策略：</strong>${esc(stage.strategy)}</p>
                  <p><strong>结果：</strong>${esc(stage.result)}</p>
                  <p><strong>读法：</strong>${esc(stage.lesson)}</p>
                </div>
              </a>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function renderTableBlock(title, rows) {
    if (!rows || !rows.length) return "";
    const [head, ...body] = rows;
    return `
      <div class="method-block">
        <h2>${esc(title)}</h2>
        <div class="compare-table">
          <div class="compare-row compare-head">
            ${head.map((cell) => `<div>${esc(cell)}</div>`).join("")}
          </div>
          ${body.map((row) => `
            <div class="compare-row">
              ${row.map((cell, idx) => idx === 0
                ? `<div><a href="#paper/${esc(cell)}">${esc(cell)}</a></div>`
                : `<div>${esc(cell)}</div>`).join("")}
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderMaterialsIndex() {
    const query = state.materialQuery.trim().toLowerCase();
    const materialMap = new Map();
    state.papers.forEach((paper) => {
      splitMaterialNames(paper.material_system || "未标注材料体系").forEach((material) => {
        if (!materialMap.has(material)) materialMap.set(material, []);
        materialMap.get(material).push(paper);
      });
    });
    const entries = [...materialMap.entries()]
      .filter(([material]) => !query || material.toLowerCase().includes(query))
      .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], "zh-CN"));
    app.innerHTML = `
      <section class="method-page">
        <div class="method-block">
          <a class="back-link" href="#overview">← 返回总览</a>
          <p class="eyebrow">Material Index</p>
          <h1>材料体系索引</h1>
          <p>按材料体系聚合文献，适合快速查 MnGa、MnAl、CoGa、Ta、Pt、MgO、CoMnFe 等材料线索。</p>
          <div class="toolbar single">
            <input id="material-search" type="search" value="${esc(state.materialQuery)}" placeholder="搜索材料体系...">
          </div>
        </div>
        <div class="material-grid">
          ${entries.map(([material, papers]) => `
            <div class="material-card">
              <h2>${esc(material)}</h2>
              <p>${papers.length} 篇文献</p>
              <div class="material-paper-list">
                ${papers.slice(0, 8).map((paper) => `<a href="#paper/${esc(paper.id)}">${esc(paper.id)} · ${esc(paper.title_zh || paper.title)}</a>`).join("")}
              </div>
            </div>
          `).join("")}
        </div>
      </section>
    `;
    document.getElementById("material-search")?.addEventListener("input", (event) => {
      state.materialQuery = event.target.value;
      renderMaterialsIndex();
    });
  }

  function splitMaterialNames(value) {
    return uniq(String(value).split(/\s*\/\s*|\s*,\s*|，|、/).map((item) => item.trim()).filter(Boolean));
  }

  function paperFromFilename(filename, options) {
    const cleanName = filename.replace(/\.pdf$/i, "").replace(/[_]+/g, " ").trim();
    const yearMatch = cleanName.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? Number(yearMatch[0]) : "";
    const pieces = cleanName.split("-").map((piece) => piece.trim()).filter(Boolean);
    const venueGuess = guessVenue(cleanName, pieces);
    const title = pieces.length >= 3 ? pieces.slice(2).join(" - ") : cleanName;
    const idNumber = Number.parseInt(nextPaperId(), 10) + (options.offset || 0);
    const id = String(idNumber).padStart(3, "0");
    return normalizePaper({
      id,
      title: title || cleanName,
      year,
      venue: venueGuess,
      category: options.category,
      topic: inferTopic(options.category, title),
      source_folder: options.folder,
      local_path: options.folder ? `${options.folder}/${filename}` : filename,
      status: options.status,
      tags: inferTags(options.category, title)
    });
  }

  function guessVenue(text, pieces) {
    const known = [
      ["nat.", "Nature"],
      ["nature", "Nature"],
      ["sci. rep.", "Scientific Reports"],
      ["scientific reports", "Scientific Reports"],
      ["apl", "Applied Physics Letters"],
      ["prb", "Physical Review B"],
      ["prl", "Physical Review Letters"],
      ["jap", "Journal of Applied Physics"],
      ["ieee", "IEEE"],
      ["acs", "ACS"],
      ["advanced", "Advanced Materials"]
    ];
    const lower = text.toLowerCase();
    const found = known.find(([key]) => lower.includes(key));
    if (found) return found[1];
    return pieces[1] && !/^(19|20)\d{2}$/.test(pieces[1]) ? pieces[1] : "";
  }

  function inferTopic(category, title) {
    const haystack = `${category} ${title}`.toLowerCase();
    if (haystack.includes("vcma") || haystack.includes("voltage")) return "VCMA";
    if (haystack.includes("mbe") || haystack.includes("machine learning")) return "ML/MBE";
    if (haystack.includes("switch") || haystack.includes("current") || haystack.includes("sot")) return "Switching";
    if (haystack.includes("mtj") || haystack.includes("tunnel")) return "MTJ";
    if (haystack.includes("micromagnetic") || haystack.includes("mumax")) return "Micromagnetics";
    return category || "待分组";
  }

  function inferTags(category, title) {
    const haystack = `${category} ${title}`.toLowerCase();
    const tags = [category].filter(Boolean);
    if (haystack.includes("mnga") || haystack.includes("mn-ga")) tags.push("MnGa/Mn-based");
    if (haystack.includes("mnal") || haystack.includes("mn-al")) tags.push("MnAl/Mn-based");
    if (haystack.includes("mtj") || haystack.includes("tunnel")) tags.push("MTJ/TMR");
    if (haystack.includes("vcma") || haystack.includes("voltage")) tags.push("VCMA");
    if (haystack.includes("sot") || haystack.includes("current") || haystack.includes("switch")) tags.push("SOT/Switching");
    if (haystack.includes("mbe")) tags.push("MBE");
    if (haystack.includes("machine learning") || haystack.includes(" ml ")) tags.push("Machine Learning");
    return uniq(tags);
  }

  function collectPaperFromForm() {
    return normalizePaper({
      ...(state.papers.find((paper) => paper.id === state.selectedPaperId) || {}),
      id: valueOf("edit-id"),
      title: valueOf("edit-title"),
      title_zh: valueOf("edit-title-zh"),
      year: Number(valueOf("edit-year")) || valueOf("edit-year"),
      venue: valueOf("edit-venue"),
      category: selectOrNew("edit-category", "edit-category-new", "待分组"),
      topic: selectOrNew("edit-topic", "edit-topic-new"),
      doi: valueOf("edit-doi"),
      authors: valueOf("edit-authors"),
      material_system: selectOrNew("edit-material", "edit-material-new"),
      device_structure: selectOrNew("edit-device", "edit-device-new"),
      physical_mechanisms: asArray(valueOf("edit-mechanisms")),
      tags: asArray(valueOf("edit-tags")),
      status: selectOrNew("edit-status", "edit-status-new", "新导入待整理"),
      local_path: valueOf("edit-local-path"),
      research_question: valueOf("edit-question"),
      main_contribution: valueOf("edit-contribution"),
      relevance_to_my_project: valueOf("edit-relevance"),
      my_notes: valueOf("edit-notes")
    });
  }

  function valueOf(id) {
    return document.getElementById(id)?.value.trim() || "";
  }

  function saveSelectedFromForm() {
    const paper = collectPaperFromForm();
    const index = state.papers.findIndex((item) => item.id === state.selectedPaperId);
    if (index >= 0) {
      state.papers[index] = paper;
    } else {
      state.papers.push(paper);
    }
    state.selectedPaperId = paper.id;
    afterPapersChanged(`已保存 ${paper.id}。`);
  }

  function upgradeSelectedToAtlas() {
    const index = state.papers.findIndex((paper) => paper.id === state.selectedPaperId);
    if (index < 0) return;
    const paper = collectPaperFromForm();
    paper.status = paper.status && paper.status.includes("重点") ? paper.status : "重点图谱-v2";
    paper.research_question = paper.research_question || "这篇文献试图解决什么关键瓶颈？";
    paper.main_contribution = paper.main_contribution || "用一句话写清楚作者的核心贡献、关键结构/方法与最好结果。";
    paper.relevance_to_my_project = paper.relevance_to_my_project || "写明它对 MRAM、MnGa/MnAl、生长优化或微磁模拟参数选择的直接启发。";
    paper.evidence_chain = paper.evidence_chain && paper.evidence_chain.length ? paper.evidence_chain : [
      { label: "结构证据", text: "XRD/TEM/界面或相结构如何支持结论？" },
      { label: "磁性证据", text: "PMA、Ms、Hc、AHE、TMR、RA 或热稳定性如何变化？" },
      { label: "机制证据", text: "作者如何证明机制，而不是只报告现象？" }
    ];
    paper.figure_cards = paper.figure_cards && paper.figure_cards.length ? paper.figure_cards : [
      { fig: "Fig. 1", claim: "样品结构与研究对象", what_to_read: "读清材料堆栈、厚度、退火/生长条件。", why_it_matters: "决定这篇能否与你的样品体系直接比较。", use_for: "背景介绍/实验设计对照" },
      { fig: "Fig. 2", claim: "核心磁性或输运结果", what_to_read: "记录坐标轴、测试条件、峰值/阈值/趋势。", why_it_matters: "这是判断论文贡献强弱的主证据。", use_for: "组会汇报/结果对标" },
      { fig: "Fig. 3", claim: "机制解释或模型", what_to_read: "找出作者用来排除其他解释的证据。", why_it_matters: "帮助你把文献从现象整理升级为机制整理。", use_for: "论文讨论/后续模拟假设" }
    ];
    state.papers[index] = normalizePaper(paper);
    afterPapersChanged(`${paper.id} 已升级为重点图谱模板。`);
  }

  async function fetchDoiIntoPreview() {
    const doi = valueOf("doi-input").replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
    if (!doi) {
      state.workbenchMessage = "请先输入 DOI。";
      renderWorkbench();
      return;
    }
    const preview = document.getElementById("doi-preview");
    preview.textContent = "正在查询 DOI...";
    try {
      const paper = await paperFromDoi(doi, selectOrNew("doi-category", "doi-category-new", "待分组"));
      state.generatedPapers = [paper];
      state.importWarnings = detectImportDuplicates(state.generatedPapers).warnings;
      state.workbenchMessage = `DOI 信息已获取，可作为新条目加入。${state.importWarnings.length ? "但检测到可能重复，请先查看提示。" : ""}`;
      renderWorkbench();
    } catch (error) {
      state.workbenchMessage = `DOI 查询失败：${error.message}`;
      renderWorkbench();
    }
  }

  async function applyDoiToSelected() {
    const doi = valueOf("edit-doi").replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
    const index = state.papers.findIndex((paper) => paper.id === state.selectedPaperId);
    if (!doi || index < 0) {
      state.workbenchMessage = "请先在编辑区 DOI 字段输入 DOI，并选择要补全的文献。";
      renderWorkbench();
      return;
    }
    try {
      const fetched = await paperFromDoi(doi, state.papers[index].category || "待分组");
      state.papers[index] = normalizePaper({ ...state.papers[index], ...fetched, id: state.papers[index].id });
      afterPapersChanged(`${state.papers[index].id} 已用 DOI 信息补全。`);
    } catch (error) {
      state.workbenchMessage = `DOI 补全失败：${error.message}`;
      renderWorkbench();
    }
  }

  async function paperFromDoi(doi, category) {
    const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
    if (!response.ok) throw new Error(`Crossref 返回 ${response.status}`);
    const data = await response.json();
    const item = data.message || {};
    const title = (item.title && item.title[0]) || "Untitled paper";
    const year = item.published?.["date-parts"]?.[0]?.[0] || item.issued?.["date-parts"]?.[0]?.[0] || "";
    const authors = (item.author || []).map((author) => [author.given, author.family].filter(Boolean).join(" ")).filter(Boolean).join(", ");
    const venue = (item["container-title"] && item["container-title"][0]) || item.publisher || "";
    return normalizePaper({
      id: nextPaperId(),
      title,
      year,
      venue,
      category,
      topic: inferTopic(category, title),
      doi,
      url: item.URL || `https://doi.org/${doi}`,
      authors,
      status: "新导入待整理",
      tags: inferTags(category, title)
    });
  }

  async function copyCurrentJson() {
    await navigator.clipboard.writeText(JSON.stringify(state.papers, null, 2));
    state.workbenchMessage = "当前 papers.json 已复制到剪贴板。";
    renderWorkbench();
  }

  function downloadCurrentJson() {
    const blob = new Blob([JSON.stringify(state.papers, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "papers.json";
    link.click();
    URL.revokeObjectURL(url);
    state.workbenchMessage = "已生成 papers.json 下载文件。";
    renderWorkbench();
  }

  function saveGithubConfigFromForm(options = {}) {
    state.githubConfig = {
      owner: valueOf("gh-owner"),
      repo: valueOf("gh-repo"),
      branch: valueOf("gh-branch") || "main",
      path: valueOf("gh-path") || "data/papers.json",
      themePath: valueOf("gh-theme-path") || state.githubConfig.themePath || "data/theme.json",
      token: valueOf("gh-token") || state.githubConfig.token,
      autoSync: Boolean(document.getElementById("auto-sync")?.checked)
    };
    persistGithubConfig();
    if (!options.silent) {
      state.workbenchMessage = "GitHub 同步配置已更新。";
      renderWorkbench();
    }
  }

  async function pushThemeToGithub() {
    state.theme = collectThemeFromForm();
    saveThemeDraft();
    saveGithubConfigFromForm({ silent: true });
    const { themePath } = state.githubConfig;
    if (!themePath) {
      state.workbenchMessage = "请先填写主题路径，默认是 data/theme.json。";
      renderWorkbench();
      return;
    }
    try {
      await putGithubFile(themePath, JSON.stringify(state.theme, null, 2) + "\n", "Update site theme settings");
      localStorage.removeItem(themeDraftKey());
      state.workbenchMessage = "主题已保存到 GitHub。GitHub Pages 通常会在几十秒后刷新。";
      renderWorkbench();
    } catch (error) {
      state.workbenchMessage = `主题保存失败：${error.message}`;
      renderWorkbench();
    }
  }

  async function pushPapersToGithub(options = {}) {
    saveGithubConfigFromForm({ silent: true });
    const { path } = state.githubConfig;
    if (!path) {
      state.workbenchMessage = "请补全 GitHub 配置，并填入有 Contents 读写权限的 token。";
      renderWorkbench();
      return;
    }
    try {
      await putGithubFile(path, JSON.stringify(state.papers, null, 2) + "\n", "Update literature papers data");
      state.basePapers = structuredClone(state.papers);
      localStorage.removeItem(localDraftKey());
      state.workbenchMessage = options.fromAutoSync
        ? "已自动同步到 GitHub。GitHub Pages 通常会在几十秒后刷新。"
        : "已同步到 GitHub。GitHub Pages 通常会在几十秒后刷新。";
      renderWorkbench();
    } catch (error) {
      state.workbenchMessage = `GitHub 保存失败：${error.message}`;
      renderWorkbench();
    }
  }

  async function putGithubFile(filePath, content, message) {
    const { owner, repo, branch, token } = state.githubConfig;
    if (!owner || !repo || !branch || !filePath || !token) {
      throw new Error("请补全 GitHub 配置，并填入有 Contents 读写权限的 token。");
    }
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
    const current = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, { headers });
    const currentData = current.ok ? await current.json() : {};
    const body = {
      message,
      content: toBase64(content),
      branch
    };
    if (currentData.sha) body.sha = currentData.sha;
    const saved = await fetch(apiUrl, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!saved.ok) {
      const error = await saved.json().catch(() => ({}));
      throw new Error(friendlyGithubError(saved.status, error.message));
    }
  }

  function friendlyGithubError(status, message = "") {
    if (status === 401) return "Token 无效或已过期。请重新生成 fine-grained token。";
    if (status === 403) return "Token 权限不够。请确认仓库权限选择了 Contents: Read and write。";
    if (status === 404) return "没有找到仓库或文件。请检查 Owner、Repo、Branch 和文件路径。";
    if (status === 409) return "GitHub 上的文件刚被更新过。请刷新页面后再同步。";
    return message || `GitHub 返回 ${status}`;
  }

  function toBase64(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  function handleRoute() {
    const hash = window.location.hash || "#overview";
    if (hash.startsWith("#paper/")) {
      renderDetail(hash.replace("#paper/", ""));
    } else if (hash === "#roadmap") {
      renderRoadmap();
    } else if (hash === "#method") {
      renderMethod();
    } else if (hash === "#materials") {
      renderMaterialsIndex();
    } else if (hash === "#workbench") {
      renderWorkbench();
    } else {
      renderOverview();
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  Promise.all([
    fetch("data/papers.json").then((res) => res.json()),
    fetch("data/roadmaps.json").then((res) => res.json()).catch(() => null),
    fetch("data/theme.json").then((res) => res.json()).catch(() => defaultTheme)
  ])
    .then(([papers, roadmaps, theme]) => {
      loadGithubConfig();
      state.theme = loadThemeDraft(theme);
      applyTheme();
      const normalizedPapers = papers.map(normalizePaper);
      state.basePapers = structuredClone(normalizedPapers);
      state.papers = loadDraftPapers(normalizedPapers).map(normalizePaper);
      state.roadmaps = roadmaps;
      handleRoute();
      window.addEventListener("hashchange", handleRoute);
    })
    .catch((error) => {
      app.innerHTML = `<div class="empty">加载文献数据失败：${esc(error.message)}</div>`;
    });
})();
