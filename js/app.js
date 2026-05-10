(function () {
  "use strict";

  const state = {
    papers: [],
    basePapers: [],
    roadmaps: null,
    selectedPaperId: "",
    workbenchMessage: "",
    generatedPapers: [],
    githubConfig: {
      owner: "yhluo57",
      repo: "phd-literature-notes",
      branch: "main",
      path: "data/papers.json",
      token: ""
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
    const selected = state.papers.find((paper) => paper.id === state.selectedPaperId) || state.papers[0] || normalizePaper({});
    state.selectedPaperId = selected.id;
    app.innerHTML = `
      <section class="method-page">
        <div class="method-block">
          <a class="back-link" href="#overview">← 返回总览</a>
          <p class="eyebrow">Literature Maintenance</p>
          <h1>文献维护台</h1>
          <p>这里负责新文献导入、半在线编辑、JSON 自动生成、DOI 补全、重点图谱升级和 GitHub 保存。浏览器会先把修改保存在本地草稿里，确认无误后再写回 GitHub。</p>
          ${state.workbenchMessage ? `<div class="status-message">${esc(state.workbenchMessage)}</div>` : ""}
        </div>

        <div class="workbench-grid">
          <div class="method-block">
            <h2>从 PDF 文件名批量生成条目</h2>
            <textarea id="filename-input" rows="9" placeholder="每行一个 PDF 文件名，或直接选择 PDF 文件。"></textarea>
            <div class="form-grid">
              <label>默认分组<input id="filename-category" value="${esc(categories[0] || "待分组")}"></label>
              <label>默认来源文件夹<input id="filename-folder" placeholder="例如 MnGa/02 MTJ"></label>
              <label>默认状态<input id="filename-status" value="新导入待整理"></label>
              <label>选择 PDF 文件<input id="pdf-picker" type="file" accept="application/pdf,.pdf" multiple></label>
            </div>
            <div class="button-row">
              <button id="generate-from-filenames" type="button">生成条目</button>
              <button id="append-generated" type="button">加入文献库</button>
            </div>
            <pre id="generated-preview" class="json-preview">${esc(JSON.stringify(state.generatedPapers, null, 2))}</pre>
          </div>

          <div class="method-block">
            <h2>DOI 补全文献信息</h2>
            <div class="form-grid two">
              <label>DOI<input id="doi-input" placeholder="10.xxxx/xxxxx"></label>
              <label>导入到分组<input id="doi-category" value="${esc(selected.category || "待分组")}"></label>
            </div>
            <div class="button-row">
              <button id="fetch-doi" type="button">从 DOI 获取信息</button>
              <button id="apply-doi-to-selected" type="button">补到当前选中文献</button>
            </div>
            <div id="doi-preview" class="note-box">DOI 查询会调用 Crossref 公开接口，返回后可作为新条目或补全文献信息。</div>
          </div>
        </div>

        <div class="method-block">
          <h2>在线/半在线编辑</h2>
          <div class="form-grid three">
            <label>选择文献<select id="paper-select">${state.papers.map((paper) => `<option value="${esc(paper.id)}"${paper.id === selected.id ? " selected" : ""}>${esc(paper.id)} · ${esc(paper.title.slice(0, 72))}</option>`).join("")}</select></label>
            <label>编号<input id="edit-id" value="${esc(selected.id)}"></label>
            <label>年份<input id="edit-year" value="${esc(selected.year || "")}"></label>
            <label>标题<input id="edit-title" value="${esc(selected.title || "")}"></label>
            <label>中文题名<input id="edit-title-zh" value="${esc(selected.title_zh || "")}"></label>
            <label>期刊/会议<input id="edit-venue" value="${esc(selected.venue || "")}"></label>
            <label>分组<input id="edit-category" value="${esc(selected.category || "")}"></label>
            <label>主题<input id="edit-topic" value="${esc(selected.topic || "")}"></label>
            <label>DOI<input id="edit-doi" value="${esc(selected.doi || "")}"></label>
            <label>作者<input id="edit-authors" value="${esc(selected.authors || "")}"></label>
            <label>材料体系<input id="edit-material" value="${esc(selected.material_system || "")}"></label>
            <label>器件结构<input id="edit-device" value="${esc(selected.device_structure || "")}"></label>
            <label>物理机制<input id="edit-mechanisms" value="${esc((selected.physical_mechanisms || []).join("，"))}"></label>
            <label>标签<input id="edit-tags" value="${esc((selected.tags || []).join("，"))}"></label>
            <label>状态<input id="edit-status" value="${esc(selected.status || "")}"></label>
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
            <h2>GitHub API 保存修改</h2>
            <div class="form-grid two">
              <label>Owner<input id="gh-owner" value="${esc(state.githubConfig.owner)}"></label>
              <label>Repo<input id="gh-repo" value="${esc(state.githubConfig.repo)}"></label>
              <label>Branch<input id="gh-branch" value="${esc(state.githubConfig.branch)}"></label>
              <label>文件路径<input id="gh-path" value="${esc(state.githubConfig.path)}"></label>
              <label class="wide">Token<input id="gh-token" type="password" placeholder="Fine-grained token: Contents read/write"></label>
            </div>
            <div class="button-row">
              <button id="save-gh-config" type="button">保存配置</button>
              <button id="push-github" type="button">写回 GitHub</button>
            </div>
            <div class="note-box">Token 只保存在当前浏览器会话中。建议使用 GitHub fine-grained token，只给这个仓库 Contents 读写权限。</div>
          </div>
        </div>
      </section>
    `;
    bindWorkbenchEvents();
  }

  function bindWorkbenchEvents() {
    document.getElementById("paper-select")?.addEventListener("change", (event) => {
      state.selectedPaperId = event.target.value;
      state.workbenchMessage = "";
      renderWorkbench();
    });
    document.getElementById("pdf-picker")?.addEventListener("change", (event) => {
      const names = [...event.target.files].map((file) => file.name).join("\n");
      document.getElementById("filename-input").value = names;
    });
    document.getElementById("generate-from-filenames")?.addEventListener("click", () => {
      const names = document.getElementById("filename-input").value.split(/\n+/).map((name) => name.trim()).filter(Boolean);
      const category = document.getElementById("filename-category").value.trim() || "待分组";
      const folder = document.getElementById("filename-folder").value.trim();
      const status = document.getElementById("filename-status").value.trim() || "新导入待整理";
      state.generatedPapers = names.map((name, index) => paperFromFilename(name, { category, folder, status, offset: index }));
      state.workbenchMessage = `已从 ${state.generatedPapers.length} 个文件名生成 JSON 条目。`;
      renderWorkbench();
    });
    document.getElementById("append-generated")?.addEventListener("click", () => {
      if (!state.generatedPapers.length) {
        state.workbenchMessage = "还没有可加入的生成条目。";
      } else {
        state.papers = [...state.papers, ...state.generatedPapers.map(normalizePaper)];
        state.selectedPaperId = state.generatedPapers[0].id;
        state.generatedPapers = [];
        saveDraftPapers();
        state.workbenchMessage = "生成条目已加入本地草稿。";
      }
      renderWorkbench();
    });
    document.getElementById("fetch-doi")?.addEventListener("click", fetchDoiIntoPreview);
    document.getElementById("apply-doi-to-selected")?.addEventListener("click", applyDoiToSelected);
    document.getElementById("save-selected")?.addEventListener("click", saveSelectedFromForm);
    document.getElementById("new-paper")?.addEventListener("click", () => {
      const paper = normalizePaper({ id: nextPaperId(), category: "待分组" });
      state.papers.push(paper);
      state.selectedPaperId = paper.id;
      saveDraftPapers();
      state.workbenchMessage = "已新建空白条目。";
      renderWorkbench();
    });
    document.getElementById("upgrade-atlas")?.addEventListener("click", upgradeSelectedToAtlas);
    document.getElementById("reset-draft")?.addEventListener("click", () => {
      resetDraftPapers();
      renderWorkbench();
    });
    document.getElementById("copy-json")?.addEventListener("click", copyCurrentJson);
    document.getElementById("download-json")?.addEventListener("click", downloadCurrentJson);
    document.getElementById("save-gh-config")?.addEventListener("click", saveGithubConfigFromForm);
    document.getElementById("push-github")?.addEventListener("click", pushPapersToGithub);
  }

  function renderRoadmap() {
    const data = state.roadmaps;
    if (!data) {
      app.innerHTML = `<div class="empty">路线图数据还没有加载。</div>`;
      return;
    }
    app.innerHTML = `
      <section class="method-page">
        <div class="method-block">
          <a class="back-link" href="#overview">← 返回总览</a>
          <p class="eyebrow">Stage 3 Research Map</p>
          <h1>MnGa/MRAM 文献路线图</h1>
          <p>这一页把单篇笔记进一步整理成研究脉络：MnGa MTJ、MnGa SOT/电流诱导翻转、VCMA/电压辅助 MRAM，以及 ML/MBE/材料发现。后续继续读文献时，可以把新论文挂到对应节点上。</p>
        </div>
        ${renderRoadmapBranch("mtj", "MnGa MTJ 对比表")}
        ${renderRoadmapBranch("sot", "MnGa SOT / 电流诱导翻转对比表")}
        ${renderRoadmapBranch("vcma", "VCMA / 电压辅助 MRAM 对比表")}
        ${renderRoadmapBranch("ml_mbe", "ML / MBE / 材料发现对比表")}
      </section>
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
      category: valueOf("edit-category"),
      topic: valueOf("edit-topic"),
      doi: valueOf("edit-doi"),
      authors: valueOf("edit-authors"),
      material_system: valueOf("edit-material"),
      device_structure: valueOf("edit-device"),
      physical_mechanisms: asArray(valueOf("edit-mechanisms")),
      tags: asArray(valueOf("edit-tags")),
      status: valueOf("edit-status"),
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
    saveDraftPapers();
    state.workbenchMessage = `已保存 ${paper.id} 到本地草稿。`;
    renderWorkbench();
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
    saveDraftPapers();
    state.workbenchMessage = `${paper.id} 已升级为重点图谱模板。`;
    renderWorkbench();
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
      const paper = await paperFromDoi(doi, valueOf("doi-category") || "待分组");
      state.generatedPapers = [paper];
      state.workbenchMessage = "DOI 信息已获取，可加入文献库或补到当前选中文献。";
      renderWorkbench();
    } catch (error) {
      state.workbenchMessage = `DOI 查询失败：${error.message}`;
      renderWorkbench();
    }
  }

  async function applyDoiToSelected() {
    const doi = valueOf("doi-input").replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
    const index = state.papers.findIndex((paper) => paper.id === state.selectedPaperId);
    if (!doi || index < 0) {
      state.workbenchMessage = "请先输入 DOI 并选择要补全的文献。";
      renderWorkbench();
      return;
    }
    try {
      const fetched = await paperFromDoi(doi, state.papers[index].category || valueOf("doi-category") || "待分组");
      state.papers[index] = normalizePaper({ ...state.papers[index], ...fetched, id: state.papers[index].id });
      saveDraftPapers();
      state.workbenchMessage = `${state.papers[index].id} 已用 DOI 信息补全。`;
      renderWorkbench();
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

  function saveGithubConfigFromForm() {
    state.githubConfig = {
      owner: valueOf("gh-owner"),
      repo: valueOf("gh-repo"),
      branch: valueOf("gh-branch") || "main",
      path: valueOf("gh-path") || "data/papers.json",
      token: valueOf("gh-token") || state.githubConfig.token
    };
    persistGithubConfig();
    state.workbenchMessage = "GitHub 保存配置已更新。";
    renderWorkbench();
  }

  async function pushPapersToGithub() {
    saveGithubConfigFromForm();
    const { owner, repo, branch, path, token } = state.githubConfig;
    if (!owner || !repo || !path || !token) {
      state.workbenchMessage = "请补全 GitHub 配置，并填入有 Contents 读写权限的 token。";
      renderWorkbench();
      return;
    }
    try {
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      };
      const current = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, { headers });
      const currentData = current.ok ? await current.json() : {};
      const body = {
        message: "Update literature papers data",
        content: toBase64(JSON.stringify(state.papers, null, 2) + "\n"),
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
        throw new Error(error.message || `GitHub 返回 ${saved.status}`);
      }
      state.basePapers = structuredClone(state.papers);
      localStorage.removeItem(localDraftKey());
      state.workbenchMessage = "已写回 GitHub。GitHub Pages 通常会在几十秒后刷新。";
      renderWorkbench();
    } catch (error) {
      state.workbenchMessage = `GitHub 保存失败：${error.message}`;
      renderWorkbench();
    }
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
    } else if (hash === "#workbench") {
      renderWorkbench();
    } else {
      renderOverview();
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  Promise.all([
    fetch("data/papers.json").then((res) => res.json()),
    fetch("data/roadmaps.json").then((res) => res.json()).catch(() => null)
  ])
    .then(([papers, roadmaps]) => {
      loadGithubConfig();
      state.basePapers = structuredClone(papers);
      state.papers = loadDraftPapers(papers).map(normalizePaper);
      state.roadmaps = roadmaps;
      handleRoute();
      window.addEventListener("hashchange", handleRoute);
    })
    .catch((error) => {
      app.innerHTML = `<div class="empty">加载文献数据失败：${esc(error.message)}</div>`;
    });
})();
