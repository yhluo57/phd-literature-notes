(function () {
  "use strict";

  const state = {
    papers: [],
    roadmaps: null,
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

  function handleRoute() {
    const hash = window.location.hash || "#overview";
    if (hash.startsWith("#paper/")) {
      renderDetail(hash.replace("#paper/", ""));
    } else if (hash === "#roadmap") {
      renderRoadmap();
    } else if (hash === "#method") {
      renderMethod();
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
      state.papers = papers;
      state.roadmaps = roadmaps;
      handleRoute();
      window.addEventListener("hashchange", handleRoute);
    })
    .catch((error) => {
      app.innerHTML = `<div class="empty">加载文献数据失败：${esc(error.message)}</div>`;
    });
})();
