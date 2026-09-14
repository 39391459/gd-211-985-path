/* 广东高一 211/985 升学路径规划 - 交互逻辑 */
(function () {
  'use strict';
  const D = window.SITE_DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const LS = {
    get(k, d) { try { return JSON.parse(localStorage.getItem('gd211_' + k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('gd211_' + k, JSON.stringify(v)); } catch {} },
  };
  // 全站数据性质声明（参考模型，非预测工具）
  const natureBadge = () => {
    const n = D.DATA_NATURE;
    return `<p class="nature-badge">🧪 数据性质：<b>${esc(n.confidence)}</b>（${esc(n.sourceType)}）· 非预测工具<br>${esc(n.note)}</p>`;
  };
  // 把字段里的每个 ____ 渲染成下划线填空：先转义文本片段，再插入 HTML（避免把标签也转义掉）
  const fillBlanks = (s) => String(s).split('____')
    .map((part, i, arr) => esc(part) + (i < arr.length - 1 ? '<span class="u">&nbsp;</span>' : ''))
    .join('');

  /* ========== 折叠卡片：默认只显示摘要，点开才是详细卡片 ==========
     defaultOpen=true 用于“需要连续操作的工具型卡片”（如能力结构检查器）：
     用户还没做过全局选择时它们默认展开；一旦用户点过「展开全部/收起全部」，就一律听用户的。 */
  const FOLD_KEY = 'foldOpen';
  const foldOpen = (defaultOpen) => {
    const pref = LS.get(FOLD_KEY, null);
    if (pref === null) return defaultOpen === true;
    return pref === true;
  };
  const fold = (summaryHtml, bodyHtml, cls, defaultOpen) =>
    `<details class="fold ${cls || ''}"${foldOpen(defaultOpen) ? ' open' : ''}>
      <summary class="fold-sum">${summaryHtml}<span class="fold-arrow" aria-hidden="true"></span></summary>
      <div class="fold-body">${bodyHtml}</div>
    </details>`;
  function initFoldBar() {
    const el = $('#foldBar');
    if (!el) return;
    const B = D.FOLD_HINT;
    el.innerHTML = `<span class="fold-hint">${esc(B.note)}</span>
      <button class="btn" id="foldAll">${esc(B.buttons.expandAll)}</button>
      <button class="btn fold-clear" id="foldNone">${esc(B.buttons.collapseAll)}</button>`;
    const apply = (open) => {
      LS.set(FOLD_KEY, open);
      $$('.panel.active details.fold').forEach((d) => { d.open = open; });
    };
    $('#foldAll').addEventListener('click', () => apply(true));
    $('#foldNone').addEventListener('click', () => apply(false));
  }

  /* ========== Tabs ========== */
  function initTabs() {
    $$('#tabs .tab').forEach((t) => {
      t.addEventListener('click', () => {
        $$('#tabs .tab').forEach((x) => x.classList.remove('active'));
        $$('.panel').forEach((p) => p.classList.remove('active'));
        t.classList.add('active');
        $('#' + t.dataset.tab).classList.add('active');
        if (t.dataset.tab === 'trend') ensureCharts();
        if (t.dataset.tab === 'select') ensurePlanChart();
      });
    });
  }

  /* 图表懒加载：面板隐藏时 canvas 尺寸为 0，等到该页真正可见再实例化 */
  let chartsDone = false;
  let planChartDone = false;
  function ensureCharts() {
    if (chartsDone) return;
    chartsDone = true;
    renderTrendCharts();
  }
  function ensurePlanChart() {
    if (planChartDone) return;
    planChartDone = true;
    renderPlanChart();
  }

  /* ========== Overview ========== */
  function renderOverview() {
    const c = D.CORE_IDEA;
    $('#hero').innerHTML = `<h2>${esc(c.headline)}</h2><ul>${c.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul><p style="margin-top:10px"><b>原则：</b>${esc(c.principle)}</p>`;
    const f = D.GD_FACTS;
    const facts = [
      { v: f.candidates.y2024, l: '2024 参考人数' },
      { v: f.undergradRate.value, l: '本科上线率' },
      { v: f.rate985.value, l: '985 录取率' },
      { v: f.rate211.value, l: '211 录取率' },
      { v: f.scoreLines.find((s) => s.year === '2025' && s.track === '物理类').undergrad + '分', l: '2025 物理本科线' },
      { v: f.scoreLines.find((s) => s.year === '2025' && s.track === '历史类').undergrad + '分', l: '2025 历史本科线' },
    ];
    $('#facts').innerHTML = natureBadge() + facts.map((x) => `<div class="fact"><div class="v">${esc(x.v)}</div><div class="l">${esc(x.l)}</div></div>`).join('');
    $('#loop').innerHTML = `<h3>核心闭环</h3><div class="chips">${[...c.loop.map((s) => `<span class="chip">${esc(s)}</span>`), '<span class="chip arrow">↻</span>'].join('')}</div>`;
  }

  /* ========== Select ========== */
  const SHORT = { 物理: '物', 历史: '史', 化学: '化', 生物: '生', 政治: '政', 地理: '地' };
  function parseComboName(name) {
    const map = { 物: '物理', 史: '历史', 化: '化学', 生: '生物', 政: '政治', 地: '地理' };
    return name.split('').filter((ch) => map[ch]).map((ch) => map[ch]);
  }

  function renderSelect() {
    const r = D.SELECT_RULE;
    $('#selectRule').innerHTML = `<div style="font-weight:600;margin-bottom:6px">${esc(r.title)}</div><div class="select-rule">${r.parts.map((p) => `<div class="rule-pill"><b>${esc(p.k)}</b> ${esc(p.v)}</div>`).join('')}</div><p class="muted">${esc(r.note)}</p><p>❌ 别只问："${esc(r.badQuestion)}"　✅ 该问："${esc(r.goodQuestion)}"</p>`;

    $('#criteria').innerHTML = D.SELECT_CRITERIA.map((c) => {
      let extra = '';
      if (c.example) {
        extra = `<div class="example">例：${Object.entries(c.example).map(([k, v]) => `${esc(k)} ${esc(v)}`).join('　·　')}<br>${esc(c.exampleNote)}</div>`;
      }
      if (c.record) extra += `<div class="example">📌 ${esc(c.record)}</div>`;
      if (c.caution) extra += `<div class="example">⚠️ ${esc(c.caution)}</div>`;
      return `<div class="criterion"><h4>${esc(c.name)}</h4><ul>${c.q.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>${extra}</div>`;
    }).join('');

    $('#combos').innerHTML = D.SUBJECT_COMBOS.map((c) => {
      const riskCls = c.risk.includes('低') ? 'risk-low' : c.risk.includes('高') ? 'risk-high' : 'risk-mid';
      const blocked = c.blocked ? `<b>容易堵死</b><ul>${c.blocked.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
      return `<div class="combo"><h4>${esc(c.name)} ${c.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')} <span class="coverage">覆盖面 ${esc(c.coverageLevel || '')}</span></h4>
        <div class="muted">样本测算 ${esc(c.coverage || '')}，仅代表专业组选科要求覆盖，不代表录取优势</div>
        <div class="tags">适合：${c.fit.map((x) => `<span class="itag">${esc(x)}</span>`).join(' ')}</div>
        <b>优势</b><ul>${c.pros.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <b>挑战</b><ul>${c.cons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        ${blocked}
        <div class="risk ${riskCls}">⚠️ ${esc(c.risk)}</div></div>`;
    }).join('') + `<p class="muted">📐 口径：${esc(D.COVERAGE_META.basis)}｜样本：${esc(D.COVERAGE_META.scope)}｜${esc(D.COVERAGE_META.note)}<br>${esc(D.SUBJECT_COVERAGE_NOTE)}</p>` + natureBadge();

    $('#myths').innerHTML = D.MISCONCEPTIONS.map((m) => `<div class="myth"><b>${esc(m.t)}</b><br>${esc(m.d)}</div>`).join('');

    // live selector
    const result = $('#selResult');
    function update(e) {
      const prefer = ($('input[name="prefer"]:checked') || {}).value;
      let ree = $$('input[name="reelect"]:checked').map((x) => x.value);
      // 再选最多 2 门：若第 3 个被勾选，取消刚点的那个
      if (e && e.target && e.target.name === 'reelect' && ree.length > 2) {
        e.target.checked = false;
        ree = $$('input[name="reelect"]:checked').map((x) => x.value);
      }
      if (!prefer || ree.length !== 2) {
        result.innerHTML = `<span class="muted">请选择：首选 1 门 + 再选 2 门（共 3 门）。</span>`;
        return;
      }
      const chosen = [prefer, ...ree];
      const combo = D.SUBJECT_COMBOS.find((c) => {
        const set = parseComboName(c.name);
        return set.length === 3 && set.every((s) => chosen.includes(s)) && chosen.every((s) => set.includes(s));
      });
      if (!combo) {
        const nm = [SHORT[prefer], ...ree.map((x) => SHORT[x])].join('');
        result.innerHTML = `<div class="combo-name">${esc(nm)}</div><div class="risk-mid" style="margin-top:8px">该组合不在预设清单中。请重点核对目标院校专业组的选科要求，尤其是理工/医学是否要求"物理+化学"。</div>`;
        return;
      }
      const riskCls = combo.risk.includes('低') ? 'risk-low' : combo.risk.includes('高') ? 'risk-high' : 'risk-mid';
      result.innerHTML = `<div class="combo-name">${esc(combo.name)}<span class="tag">${combo.tags.join(' · ')}</span><span class="coverage">覆盖面 ${esc(combo.coverageLevel || '')}</span></div>
        <div class="muted">样本测算 ${esc(combo.coverage || '')}（仅代表专业组选科要求覆盖，不代表录取优势）</div>
        <div style="margin-top:8px"><b>适合方向：</b>${combo.fit.join('、')}</div>
        <div><b>优势：</b>${combo.pros.join('；')}</div>
        <div><b>挑战：</b>${combo.cons.join('；')}</div>
        ${combo.blocked ? `<div><b>容易堵死：</b>${combo.blocked.join('；')}</div>` : ''}
        <div class="${riskCls}" style="margin-top:8px">⚠️ 风险：${esc(combo.risk)}</div>`;
    }
    $$('input[name="prefer"], input[name="reelect"]').forEach((el) => el.addEventListener('change', (e) => update(e)));
    update();
  }

  /* ========== Branches ========== */
  function renderBranches() {
    $('#branchCards').innerHTML = D.BRANCHES.map((b) => {
      let body = '';
      if (b.id === 'local') {
        body = `<div class="who">适合：${esc(b.who)}</div>
          <div class="grid2">
            <div class="blk"><h5>主流行业</h5><div class="tagrow">${b.industries.map((x) => `<span class="itag">${esc(x)}</span>`).join(' ')}</div>
              <h5>选科建议</h5><p>${esc(b.subjectTip)}</p>
              <h5>关注高校</h5><div class="tagrow">${b.schools.map((x) => `<span class="itag">${esc(x)}</span>`).join(' ')}</div>
              <p class="muted">${esc(b.schoolNote)}</p></div>
            <div class="blk"><h5>高一行动</h5><ul>${b.g1.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
              <h5>高二行动</h5><p>${esc(b.g2)}</p></div>
          </div>`;
      } else if (b.id === 'abroad') {
        body = `<div class="who">适合：${esc(b.who)}</div>
          <p class="muted">${esc(b.notFor)}</p>
          <div class="grid2">
            <div class="blk"><h5>高一准备</h5><ul>${b.g1.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
              <h5>高二准备</h5><ul>${b.g2.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
            <div class="blk"><h5>准备要点</h5><ul>${b.prep.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
              <h5>时间线</h5><ul>${b.timeline.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
          </div>`;
      } else {
        body = `<div class="who">适合：${esc(b.who)}</div>
          <div class="grid2">
            <div class="blk"><h5>外省高校池</h5>${b.schoolPools.map((p) => `<div class="tagrow" style="margin-bottom:6px"><span class="muted" style="min-width:64px">${esc(p.cat)}：</span>${p.list.map((x) => `<span class="itag">${esc(x)}</span>`).join(' ')}</div>`).join('')}
              <h5>高一行动</h5><ul>${b.g1.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
              <h5>高二行动</h5><ul>${b.g2.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
            <div class="blk"><h5>广东学生要特别练</h5><ul>${b.skills.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
          </div>`;
      }
      return `<div class="branch" style="border-top-color:${b.color}"><h3>${b.icon} ${esc(b.name)}</h3>${body}</div>`;
    }).join('') + `<div class="card"><h4>⚠️ 选择支线前，先评估这些风险</h4><div class="tagrow">${D.BRANCH_RISKS.map((x) => `<span class="itag">${esc(x)}</span>`).join(' ')}</div><p class="muted">${esc(D.BRANCH_RISKS_NOTE)}</p></div>`;
  }

  /* ========== Grades（高中三年：细化 + 量化） ========== */
  function renderGrades() {
    $('#gradeCards').innerHTML = D.HS_PLAN.map((s) => {
      const q = s.quantified;
      const rows = [
        ['年级排名', q.gradeRank], ['单科 / 优势科', q.subjectRank], ['错题率', q.errorClear],
        ['英语词汇', q.vocab], ['学习时长', q.hours], q.rankGap ? ['位次差距', q.rankGap] : null,
      ].filter(Boolean);
      return `<div class="grade"><div class="ghead"><span class="icon">📘</span><div><h3>${esc(s.grade)}</h3><div class="theme">${esc(s.topic)}</div></div></div>
        <div class="quant-grid">${rows.map(([k, v]) => `<div class="qcell"><span class="qk">${esc(k)}</span><span class="qv">${esc(v)}</span></div>`).join('')}</div>
        <div class="sem"><h4>关键动作</h4><ul>${s.actions.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>
        <div class="sem"><h4>里程碑</h4><ul>${s.milestones.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>
        <div class="sem"><h4>检查指标</h4><ul>${s.check.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>
        <div class="sem avoid"><h4>要避开</h4><ul>${s.avoid.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>
      </div>`;
    }).join('') + `<p class="muted">${esc(D.HS_PLAN_NOTE)}</p>`;
  }

  function renderHsMonths() {
    const groups = [['高一', D.HS_MONTHS], ['高二', D.HS_MONTHS_2], ['高三', D.HS_MONTHS_3]];
    $('#hsMonths').innerHTML = groups.map(([g, arr]) =>
      `<h4 class="month-grade">${esc(g)}</h4><div class="months">${arr.map((m) => `<div class="month"><div class="m-head">${esc(m.month)}</div><div class="m-focus">${esc(m.focus)}</div><div class="m-goal">🎯 ${esc(m.goal)}</div></div>`).join('')}</div>`
    ).join('') + `<p class="muted">🕒 ${esc(D.EXAM_RELATION.note)}</p><p class="muted">⏳ ${esc(D.HOURS_NOTE)}</p><p class="muted">🏷️ ${esc(D.ADVISORY_NOTE)}</p>`;
  }

  /* ========== 我的三年计划（目标层次 → 自动填） ========== */
  function renderThreeYearPlan() {
    const saved = LS.get('threeYear', { tier: '', schoolLevel: '', currentRank: '', gradeCount: '', weakSubjects: '', learningHours: '', selectionStatus: '', careerDirection: '', specialPathInterest: '', constraintTags: '' });
    $('#threeYearPlan').innerHTML = `
      <div class="card">
        <p class="sys-label sys-blue">🔵 我要去哪里：目标层次 → 目标位次 + 各年级阶段目标（规划用）</p>
        <div class="ty-row">
          <label>目标层次
            <select id="tyTier">
              <option value="">请选择…</option>
              ${D.TARGET_TIERS.map((t) => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('')}
            </select>
          </label>
          <span class="muted">选择后自动填充「目标省位次 + 各年级阶段目标」</span>
        </div>
        <details class="ty-rule" ${saved.currentRank || saved.selectionStatus ? 'open' : ''}>
          <summary>补充我的现状（可选，用于更贴合地提示差距）</summary>
          <div class="ty-row" style="margin-top:8px">
            <label>学校层次
              <select id="tySchool">
                <option value="">未填</option>
                ${D.SCHOOL_LEVELS.items.map((i) => `<option value="${esc(i.level)}">${esc(i.level)}</option>`).join('')}
              </select>
            </label>
            <label>当前年级排名 <input id="tyRank" type="number" placeholder="如 120" value="${esc(saved.currentRank)}"></label>
            <label>年级总人数 <input id="tyCount" type="number" placeholder="如 800" value="${esc(saved.gradeCount)}"></label>
            <label>薄弱科 <input id="tyWeak" placeholder="如 英语" value="${esc(saved.weakSubjects)}"></label>
            <label>每周有效学习(h) <input id="tyHours" type="number" placeholder="如 40" value="${esc(saved.learningHours)}"></label>
          </div>
          <div class="ty-row">
            <label>选科状态
              <select id="tySel"><option value="">未填</option><option>未确定</option><option>已确定</option></select>
            </label>
            <label>意向专业方向 <input id="tyCareer" placeholder="如 计算机 / AI" value="${esc(saved.careerDirection)}"></label>
            <label>特殊路径关注 <input id="tyPath" placeholder="强基 / 综评 / 专项 / 留学" value="${esc(saved.specialPathInterest)}"></label>
            <label>家庭约束 <input id="tyConstraint" placeholder="如 想留广东 / 预算有限" value="${esc(saved.constraintTags)}"></label>
          </div>
        </details>
        <div id="tyResult"></div>
        <p class="risk-mid" style="margin-top:8px">⚠️ ${esc(D.TARGET_TIERS_CAUTION)}</p>
        <p class="muted">📐 ${esc(D.SAMPLE_CALIBRATION_NOTE)}</p>
        <p class="muted">🏷️ ${esc(D.ADVISORY_NOTE)}</p>
        <div class="card" style="margin-top:10px"><h4>🎚️ 目标动态调整机制</h4>
          <div><b>检查周期：</b>${esc(D.GOAL_ADJUSTMENT.checkCycle)}</div>
          <div><b>触发条件：</b>${D.GOAL_ADJUSTMENT.trigger.map(esc).join('；')}</div>
          <div><b>动作：</b>${esc(D.GOAL_ADJUSTMENT.action)}</div>
          <div><b>重算范围：</b>${D.GOAL_ADJUSTMENT.recalcScope.map(esc).join('、')}</div>
          <div><b>调整记录字段：</b>${D.GOAL_ADJUSTMENT.logFields.map(esc).join('、')}（${esc(D.GOAL_ADJUSTMENT.logNote)}）</div>
        </div>
        <details class="ty-rule"><summary>位次反推规则</summary><ul>${D.RANK_GENERATE_RULE.map((r) => `<li><b>${esc(r.step)}</b>：${esc(r.rule)}</li>`).join('')}</ul><p class="muted">${esc(D.RANK_GAP_SEMANTICS)}</p></details>
        <p class="muted">${esc(D.TARGET_TIERS_NOTE)}</p>
      </div>`;
    $('#tyTier').value = saved.tier || '';
    $('#tySchool').value = saved.schoolLevel || '';
    const collect = () => ({
      tier: $('#tyTier').value, schoolLevel: $('#tySchool').value,
      currentRank: $('#tyRank').value, gradeCount: $('#tyCount').value,
      weakSubjects: $('#tyWeak').value, learningHours: $('#tyHours').value,
      selectionStatus: $('#tySel').value, careerDirection: $('#tyCareer').value,
      specialPathInterest: $('#tyPath').value, constraintTags: $('#tyConstraint').value,
    });
    const draw = () => {
      const o = collect();
      LS.set('threeYear', o);
      const t = D.TARGET_TIERS.find((x) => x.id === o.tier);
      const res = $('#tyResult');
      if (!t) { res.innerHTML = ''; return; }
      let hint = '';
      const r = parseFloat(o.currentRank), n = parseFloat(o.gradeCount);
      if (!isNaN(r) && !isNaN(n) && n > 0) {
        const pct = Math.round((r / n) * 1000) / 10;
        hint = `<div class="ty-target">📊 你当前约在年级前 <b>${pct}%</b>；该层次「高一」目标为「${esc(t.gradeTargets['高一'])}」。</div>`;
        if (o.schoolLevel) hint += `<div class="muted">学校层次：${esc(o.schoolLevel)}（不同层次高中同一省位次对应年级排名不同，见「学校层次换算」）。</div>`;
      } else {
        hint = `<div class="muted">填写「当前年级排名 + 年级总人数」可自动换算你的百分位，并与目标对照。</div>`;
      }
      res.innerHTML = `
        <div class="ty-target">🎯 目标省位次：<b>${esc(t.rankTarget)}</b>　<span class="muted">（${esc(t.meaning)}）</span></div>
        ${hint}
        <table class="mini"><thead><tr><th>年级</th><th>阶段目标</th></tr></thead><tbody>
          ${['高一', '高二', '高三'].map((g) => `<tr><td><b>${esc(g)}</b></td><td>${esc(t.gradeTargets[g])}</td></tr>`).join('')}
        </tbody></table>
        <div class="tagrow" style="margin-top:8px"><span class="muted">重点提升：</span>${t.coreSubjects.map((s) => `<span class="itag">${esc(s)}</span>`).join(' ')}</div>
        ${o.weakSubjects ? `<div class="muted">薄弱科：${esc(o.weakSubjects)}（优先进攻到及格线以上）</div>` : ''}
        <p class="muted">${esc(t.note)}</p>`;
    };
    ['tyTier', 'tySchool', 'tyRank', 'tyCount', 'tyWeak', 'tyHours', 'tySel', 'tyCareer', 'tyPath', 'tyConstraint'].forEach((id) => $('#' + id).addEventListener('change', draw));
    draw();
  }

  function renderSchoolLevels() {
    const s = D.SCHOOL_LEVELS;
    $('#schoolLevels').innerHTML = `<table class="mini"><thead><tr><th>学校层次</th><th>冲顶尖 985</th><th>强 211</th><th>普通 211</th><th>说明</th></tr></thead><tbody>${s.items.map((i) => `<tr><td><b>${esc(i.level)}</b></td><td>${esc(i.top985)}</td><td>${esc(i.strong211)}</td><td>${esc(i.ordinary211)}</td><td class="muted">${esc(i.desc)}</td></tr>`).join('')}</tbody></table>
      <p class="muted" style="margin-top:8px"><b>按学校规模的读法：</b></p>
      <table class="mini"><thead><tr><th>学校规模</th><th>怎么读排名</th></tr></thead><tbody>${s.rankMode.map((m) => `<tr><td>${esc(m.schoolSize)}</td><td>${esc(m.rule)}</td></tr>`).join('')}</tbody></table>
      <p class="muted">${esc(s.note)}</p><p class="muted">📐 ${esc(D.SAMPLE_CALIBRATION_NOTE)}</p>`;
  }

  function renderScoreModel() {
    const m = D.SUBJECT_SCORE_MODEL;
    $('#scoreModel').innerHTML = `<p class="risk-mid">📌 ${esc(m.interactionNote)}</p><table class="mini"><thead><tr><th>目标层次</th><th>总分</th><th>语文</th><th>数学</th><th>英语</th><th>首选</th><th>再选×2</th></tr></thead><tbody>${m.rows.map((r) => `<tr><td><b>${esc(r.tier)}</b></td><td>${esc(r.total)}</td><td>${esc(r.chinese)}</td><td>${esc(r.math)}</td><td>${esc(r.english)}</td><td>${esc(r.first)}</td><td>${esc(r.reelect)}</td></tr>`).join('')}</tbody></table><p class="muted">${esc(m.basis)}</p><p class="muted">${esc(m.note)}</p>`;
  }

  function renderProfileTags() {
    $('#profileTags').innerHTML = `<div class="grid2">${D.PROFILE_TAGS.map((p) => `<div class="card"><h4>${esc(p.tag)}</h4><div class="muted">特征：${esc(p.sign)}</div><div><b>策略：</b>${esc(p.strategy)}</div><div class="risk-mid">风险：${esc(p.risk)}</div></div>`).join('')}</div>`;
  }

  function renderExamCheck() {
    const t = D.EXAM_CHECK_TEMPLATE;
    $('#examCheck').innerHTML = `<p class="muted">${esc(t.note)}</p><div class="grid4">${t.steps.map((s) => `<div class="card"><h4>${esc(s.step)}</h4><ul>${s.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('')}</div><div class="card"><h4>偏科诊断规则</h4><ul>${t.diagnosis.map((d) => `<li>${esc(d)}</li>`).join('')}</ul></div>`;
  }

  function renderExamTimeline() {
    $('#examTimeline').innerHTML = `<table class="mini"><thead><tr><th>阶段</th><th>节点</th><th>任务</th><th>备注</th></tr></thead><tbody>${D.EXAM_TIMELINE.map((e) => `<tr><td>${esc(e.stage)}</td><td>${esc(e.node)}</td><td>${esc(e.task)}</td><td class="muted">${esc(e.note)}</td></tr>`).join('')}</tbody></table>`;
  }

  function renderHs3Rank() {
    $('#hs3Rank').innerHTML = `<p class="muted">${esc(D.RANK_GAP_SEMANTICS)}</p>` + D.HS3_RANK_PLAN.map((r) => `<div class="card"><h4>${esc(r.round)} · ${esc(r.time)}</h4><div><b>目标：</b>${r.target.map(esc).join('；')}</div><div><b>位次控制：</b>${esc(r.rankControl)}</div></div>`).join('');
  }

  function renderRankStrategy() {
    $('#rankStrategy').innerHTML = `<table class="mini"><thead><tr><th>目标层次</th><th>省位次（粗估）</th><th>策略</th></tr></thead><tbody>${D.RANK_STRATEGY.map((r) => `<tr><td><b>${esc(r.target)}</b></td><td>${esc(r.rank)}</td><td>${esc(r.strategy)}</td></tr>`).join('')}</tbody></table><p class="muted">粗估，以当年官方为准。</p><p class="muted">📐 ${esc(D.SAMPLE_CALIBRATION_NOTE)}</p><p class="muted">🏷️ ${esc(D.ADVISORY_NOTE)}</p>`;
  }

  /* ========== Check: monthly ========== */
  function renderMonthly() {
    const ind = D.CHECK_MONTHLY.indicators;
    const rows = ind.map((i) => `<tr><td>${esc(i.h)}</td><td><input data-k="${esc(i.k)}" class="m-cur" placeholder="本月"></td><td><input data-k="${esc(i.k)}" class="m-prev" placeholder="上月"></td><td class="m-trend">–</td></tr>`).join('');
    $('#monthlyTable').innerHTML = `<table class="mini"><thead><tr><th>指标</th><th>本月数据</th><th>上月数据</th><th>趋势</th></tr></thead><tbody>${rows}</tbody></table>`;
    $$('#monthlyTable input').forEach((inp) => inp.addEventListener('input', computeTrend));
    const last = LS.get('monthly', null);
    if (last) $('#monthlyHint').textContent = `上次保存：${esc(last.date)}（共 ${last.rows.length} 项）`;
    $('#saveMonthly').addEventListener('click', () => {
      const rows = $$('#monthlyTable input.m-cur').map((i) => ({ k: i.dataset.k, cur: i.value, prev: $(`#monthlyTable input.m-prev[data-k="${i.dataset.k}"]`).value }));
      const date = new Date().toISOString().slice(0, 7);
      LS.set('monthly', { date, rows });
      $('#monthlyHint').textContent = `✅ 已保存 ${date}（关掉网页也不丢）`;
    });
  }
  function computeTrend() {
    $$('#monthlyTable tbody tr').forEach((tr) => {
      const cur = parseFloat(tr.querySelector('.m-cur').value);
      const prev = parseFloat(tr.querySelector('.m-prev').value);
      const td = tr.querySelector('.m-trend');
      if (isNaN(cur) || isNaN(prev) || prev === 0) { td.textContent = '–'; return; }
      const diff = cur - prev;
      if (Math.abs(diff) < 1e-6) td.textContent = '→ 持平';
      else if (diff < 0) td.innerHTML = `<span style="color:var(--ok)">↑ 进步</span>`;
      else td.innerHTML = `<span style="color:var(--danger)">↓ 退步</span>`;
    });
  }

  /* ========== Check: loss analysis ========== */
  function renderLoss() {
    const types = D.LOSS_TYPES;
    $('#lossForm').innerHTML = `<div class="loss-types">${types.map((t) => `<span class="lt-chip" style="background:${t.color}">${t.code} ${esc(t.label)}</span>`).join('')}</div>
      <div class="loss-row">
        <input id="lq" placeholder="题号 (如 数学12)">
        <input id="ls" placeholder="丢分" type="number">
        <input id="lr" placeholder="原因 (如 概念混淆)">
        <select id="la"><option value="是">可避免:是</option><option value="否">可避免:否</option></select>
        <input id="ln" placeholder="下一步 (如 重做+整理)">
        <button class="btn" id="ladd">添加</button>
      </div>`;
    $('#ladd').addEventListener('click', addLoss);
    drawLossList();
  }
  function addLoss() {
    const q = $('#lq').value.trim(); if (!q) return;
    const item = { q, s: $('#ls').value, r: $('#lr').value, a: $('#la').value, n: $('#ln').value, t: pickType($('#lr').value) };
    const list = LS.get('loss', []);
    list.push(item); LS.set('loss', list);
    $('#lq').value = $('#ls').value = $('#lr').value = $('#ln').value = '';
    drawLossList();
  }
  function pickType(reason) {
    const r = (reason || '').toLowerCase();
    if (r.includes('不会') || r.includes('概念')) return 'A';
    if (r.includes('粗心')) return 'C';
    if (r.includes('时间')) return 'D';
    if (r.includes('审题')) return 'E';
    return 'B';
  }
  function drawLossList() {
    const list = LS.get('loss', []);
    const colorOf = (c) => (D.LOSS_TYPES.find((t) => t.code === c) || { color: '#64748b' }).color;
    const labelOf = (c) => (D.LOSS_TYPES.find((t) => t.code === c) || { label: c }).label;
    $('#lossList').innerHTML = list.length ? list.map((it, i) => `<div class="loss-item"><span class="lt" style="background:${colorOf(it.t)}">${esc(it.t)}</span><div><b>${esc(it.q)}</b> 丢${esc(it.s || '?')}分　${esc(it.r)}　可避免:${esc(it.a)}<br><span class="muted">下一步：${esc(it.n)}</span></div><button class="del" data-i="${i}">×</button></div>`).join('')
      : `<p class="muted">还没有记录。每次考试记一笔，月底看 A–E 分布，就知道该补知识、补方法还是补速度。</p>`;
    $$('#lossList .del').forEach((b) => b.addEventListener('click', () => {
      const l = LS.get('loss', []); l.splice(+b.dataset.i, 1); LS.set('loss', l); drawLossList();
    }));
  }

  /* ========== Check: two-week card ========== */
  function renderTwoweek() {
    const t = D.TWOWEEK;
    $('#twoweekCard').innerHTML = `
      <div style="margin:8px 0">${t.questions.map((q, i) => `<div class="q">${i + 1}. ${esc(q)}</div>`).join('')}</div>
      <div class="print-card" id="printCard">
        <h3 style="margin:0 0 8px">🔁 两周复盘卡</h3>
        ${t.card.fields.map((f) => `<div class="line">${fillBlanks(f)}</div>`).join('')}
        <p class="muted" style="margin-top:10px">${esc(t.principle)}</p>
      </div>`;
    $('#printTwoweek').addEventListener('click', () => {
      document.body.classList.add('printing-twoweek');
      window.print();
      setTimeout(() => document.body.classList.remove('printing-twoweek'), 300);
    });
  }

  /* ========== Paper system ========== */
  function renderPaper() {
    const p = D.PAPER_SYSTEM;
    let html = `<p style="font-weight:600">${esc(p.principle)}</p>`;
    html += p.books.map((b) => `<div class="book"><h4>${esc(b.name)}</h4><ul>${b.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('');
    html += `<div class="book" style="border-left-color:var(--brand)"><h4>${esc(p.peer.name)}</h4><ul>${p.peer.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
    html += `<div class="book" style="border-left-color:var(--accent)"><h4>${esc(p.teacher.name)}</h4><ul>${p.teacher.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
    html += `<div class="book" style="border-left-color:var(--warn)"><h4>${esc(p.homeTime.name)}</h4><ul>${p.homeTime.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;

    // daily checklist
    const dailyId = 'paper_daily';
    const dailyDone = LS.get(dailyId, {});
    html += `<div class="daily"><h3>${esc(p.daily.title)}</h3><ul class="check">` +
      p.daily.blocks.map((b) => `<li style="font-weight:600;margin-top:6px">${esc(b.t)}</li>` +
        b.items.map((it, j) => { const key = b.t + j; const ck = dailyDone[key] ? 'checked' : ''; return `<li><label><input type="checkbox" data-dk="${esc(key)}" ${ck}> ${esc(it)}</label></li>`; }).join('')).join('') +
      `</ul></div>`;

    // weekly checklist
    const weekId = 'paper_weekly';
    const weekDone = LS.get(weekId, {});
    html += `<div class="weekly"><h3>${esc(p.weekly.title)}</h3><ul>` +
      p.weekly.items.map((it, i) => { const ck = weekDone[i] ? 'checked' : ''; return `<li><label style="display:flex;gap:8px;align-items:center;cursor:pointer"><input type="checkbox" data-wk="${i}" ${ck}> ${esc(it)}</label></li>`; }).join('') +
      `</ul></div>`;

    $('#paperContent').innerHTML = html;

    $$('#paperContent input[data-dk]').forEach((cb) => cb.addEventListener('change', () => {
      const d = LS.get(dailyId, {}); d[cb.dataset.dk] = cb.checked; LS.set(dailyId, d);
    }));
    $$('#paperContent input[data-wk]').forEach((cb) => cb.addEventListener('change', () => {
      const d = LS.get(weekId, {}); d[cb.dataset.wk] = cb.checked; LS.set(weekId, d);
    }));
  }

  /* ========== 升学路径 ========== */
  function renderPaths() {
    const riskText = { low: '低', mid: '中', high: '高' };
    $('#pathList').innerHTML = D.PATHS.map((p) => {
      const rc = p.risk === 'low' ? 'risk-low' : p.risk === 'high' ? 'risk-high' : 'risk-mid';
      const th = D.QUANT.pathThresholds[p.id];
      const thHtml = th ? `<div class="quant-line"><b>量化：</b>${esc(th.label)} = <b>${esc(th.value)}</b><br><span class="muted">${esc(th.extra)}</span></div>` : '';
      const elig = p.eligibility ? `
        <div class="elig-tool">
          <h5>🔎 专项资格自检（初步判断，非官方结论）</h5>
          <div class="elig-list">
            ${['户籍在实施区域（30 个县市区）', '父母/监护人户籍符合', '学籍在实施区域', '满足连续学籍年限', '属于当年实施区域', '符合高校专项具体要求']
              .map((s, i) => `<label><input type="checkbox" class="elig" data-i="${i}"> ${esc(s)}</label>`).join('')}
          </div>
          <button class="btn" id="eligBtn">初步判断</button>
          <div id="eligResult" class="muted" style="margin-top:8px"></div>
        </div>` : '';
      return `<div class="path-card">
        <h3>${p.icon} ${esc(p.name)} <span class="tag">${esc(p.tag)}</span> <span class="${rc}">风险 ${riskText[p.risk] || ''}</span></h3>
        <p class="path-def">${esc(p.definition)}</p>
        <p class="muted">📎 ${esc(D.PATHS_BASE_NOTE)}</p>
        <p class="muted">适合：${esc(p.fit)}</p>
        ${thHtml}
        <div class="grid2">
          <div><h5>时间线</h5><ul>${p.timeline.map((t) => `<li><b>${esc(t.phase)}</b>：${esc(t.task)}</li>`).join('')}</ul></div>
          <div><h5>自检清单</h5><ul class="check">${p.selfTest.map((s) => `<li><label><input type="checkbox"> ${esc(s)}</label></li>`).join('')}</ul></div>
        </div>
        <h5>误区 / 提醒</h5><ul class="caution">${p.caution.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
        ${elig}
      </div>`;
    }).join('');
    const btn = $('#eligBtn');
    if (btn) btn.addEventListener('click', () => {
      const boxes = $$('.elig');
      const checked = boxes.filter((b) => b.checked).length;
      const res = $('#eligResult');
      if (checked === boxes.length) res.innerHTML = `<span class="risk-low">✅ 初步符合，但仍需以官方资格审核与公示为准。</span>`;
      else res.innerHTML = `<span class="risk-mid">⚠️ 有 ${boxes.length - checked} 项未确认。请以普通高考规划为主，并向学校 / 考试院核实。</span>`;
    });
  }

  /* ========== 我的目标 ========== */
  function renderTarget() {
    const t = D.TARGET_MODEL, s = D.SCHOOLS;
    const poolRows = (arr) => arr.map((p) => `<li><b>${esc(p.name)}</b>：${esc(p.count)}${p.def ? ' —— ' + esc(p.def) : ''}</li>`).join('');
    const schoolCard = (sch) => `<div class="sch"><div class="sch-name">${esc(sch.name)}</div><div class="muted">${esc(sch.level || sch.label || '')}</div>${sch.strengths ? `<div class="tagrow">${sch.strengths.map((x) => `<span class="itag">${esc(x)}</span>`).join(' ')}</div>` : ''}</div>`;
    $('#targetContent').innerHTML = `
      <div class="card"><p>${esc(t.intro)}</p></div>
      <div class="grid2">
        <div class="card"><h3>专业池分层</h3><ul>${poolRows(t.majorPools)}</ul><p class="muted">${esc(t.majorNote)}</p></div>
        <div class="card"><h3>高校池分层</h3><ul>${poolRows(t.uniPools)}</ul><p class="muted">${esc(t.uniNote)}</p></div>
      </div>
      <div class="card"><h3>筛选链（必须按这个顺序）</h3><div class="chips">${t.filterChain.map((x) => `<span class="chip">${esc(x)}</span>`).join('<span class="chip arrow">→</span>')}</div><p class="risk-mid" style="margin-top:8px">⚠️ ${esc(t.filterWarn)}</p></div>
      <div class="card"><h3>高一操作五步</h3><ol>${t.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>
      <div class="card"><h3>高校库 · 广东 985</h3><div class="sch-grid">${s.gd985.map(schoolCard).join('')}</div></div>
      <div class="card"><h3>高校库 · 广东 211</h3><div class="sch-grid">${s.gd211.map(schoolCard).join('')}</div></div>
      <div class="card"><h3>高校库 · 广东特色 / 双一流 / 区域强校</h3><div class="sch-grid">${s.gdFeature.map(schoolCard).join('')}</div><p class="muted">${esc(s.gdFeatureNote)}</p></div>
      <div class="card"><h3>高校库 · 外省高性价比 211</h3>${s.outProvince.map((g) => `<div class="tagrow" style="margin-bottom:6px"><span class="muted" style="min-width:72px;display:inline-block">${esc(g.region)}：</span>${g.list.map((x) => `<span class="itag">${esc(x)}</span>`).join(' ')}</div>`).join('')}<p class="muted" style="margin-top:8px">评估维度：${s.evalFields.join('、')}。${esc(s.evalNote)}</p></div>`;
  }

  /* ========== 我的排名 ========== */
  function renderRank() {
    const r = D.RANK_RECORD, th = D.QUANT.reviewThresholds;
    $('#rankContent').innerHTML = natureBadge() + `
      <p class="lead">${esc(r.intro)}</p>
      <div class="grid2">
        <div class="card"><h3>要记录的四类数据</h3>${r.metrics.map((m) => `<div class="metric-grp"><b>${esc(m.group)}</b><div class="tagrow">${m.items.map((x) => `<span class="itag">${esc(x)}</span>`).join(' ')}</div></div>`).join('')}</div>
        <div class="card"><h3>趋势判断规则</h3><ul>${r.trendRules.map((t) => `<li><span class="${t.tone === 'ok' ? 'risk-low' : t.tone === 'warn' ? 'risk-mid' : 'risk-high'}">${esc(t.level)}</span>：${esc(t.when)}</li>`).join('')}</ul><p class="muted">${esc(r.trendNote)}</p><p>${esc(r.subjectTip)}</p></div>
      </div>
      <div class="card"><h3>与目标位次的差距</h3><p>${esc(r.gapRule)}</p><p class="muted">${esc(r.gapExample)}</p></div>
      <div class="card"><h3>📏 自检 / 复盘量化阈值</h3><ul>
        <li>错题清零率：达标 ≥ ${Math.round(th.errorClearRate * 100)}%（预警 &lt; 70%）</li>
        <li>周计划完成率：达标 ≥ ${Math.round(th.planCompletionRate * 100)}%（预警 &lt; 75%）</li>
        <li>单科排名：前进 ≥ ${Math.round(th.rankImprovementRate * 100)}% 视为达标</li>
        <li>预警：连续 ${th.warningConsecutiveDeclines} 次下降；连续 ${th.criticalConsecutiveDeclines} 次下降 → 强制调整学习方案</li>
      </ul></div>`;
    renderCalc();
    renderTiers();
    renderSchoolRanks();
  }

  function renderCalc() {
    const saved = LS.get('calc', { type: 'physics', cur: '', target: '' });
    $('#rankCalc').innerHTML = `
      <h3>🧮 位次差距计算器</h3>
      <div class="calc-row">
        <select id="calcType"><option value="physics">物理类</option><option value="history">历史类</option></select>
        <input id="calcCur" type="number" placeholder="当前估算位次" value="${esc(saved.cur)}">
        <input id="calcTarget" type="number" placeholder="目标位次" value="${esc(saved.target)}">
        <button class="btn" id="calcBtn">算差距</button>
      </div>
      <div id="calcResult" class="calc-result"></div>`;
    $('#calcType').value = saved.type || 'physics';
    const run = () => {
      const type = $('#calcType').value;
      const cur = parseFloat($('#calcCur').value), target = parseFloat($('#calcTarget').value);
      LS.set('calc', { type, cur: $('#calcCur').value, target: $('#calcTarget').value });
      const res = $('#calcResult');
      if (isNaN(cur) || isNaN(target)) { res.innerHTML = '<span class="muted">请输入当前位次与目标位次。</span>'; return; }
      const gap = cur - target;
      const gapTxt = gap <= 0
        ? `<span class="risk-low">已进入目标位次区间（富余约 ${Math.abs(gap).toLocaleString()} 名）</span>`
        : `<b>还需前进约 ${gap.toLocaleString()} 名</b>，建议未来 12 个月提升目标 ≥ ${gap.toLocaleString()} 名（粗估）`;
      const cs = rankToScore(type, cur), ts = rankToScore(type, target);
      const scoreTxt = (cs != null || ts != null)
        ? `<br><span class="muted">对应分数（粗估）：当前 ≈ ${cs == null ? '—' : cs} 分；目标 ≈ ${ts == null ? '—' : ts} 分</span>` : '';
      res.innerHTML = `${gapTxt}<br><span class="muted">当前 ≈ ${esc(tierOf(type, cur))}；目标 ≈ ${esc(tierOf(type, target))}（粗估，以当年官方为准）</span>${scoreTxt}`;
    };
    $('#calcBtn').addEventListener('click', run);
    ['calcCur', 'calcTarget', 'calcType'].forEach((id) => $('#' + id).addEventListener('change', run));
  }

  function tierOf(type, rank) {
    const arr = D.RANK_TIERS[type] || [];
    for (const t of arr) { if (rank <= t.maxRank) return t.tier; }
    return arr.length ? arr[arr.length - 1].tier : '';
  }

  // 位次 → 分数（线性插值，粗估）
  function rankToScore(type, rank) {
    const arr = (D.QUANT.scoreRank[type] || []).slice().sort((a, b) => a.rank - b.rank);
    if (!arr.length) return null;
    for (let i = 0; i < arr.length - 1; i++) {
      const a = arr[i], b = arr[i + 1];
      if (rank >= a.rank && rank <= b.rank) {
        const t = (rank - a.rank) / (b.rank - a.rank);
        return Math.round(a.score + t * (b.score - a.score));
      }
    }
    return null; // 超出锚点范围
  }

  function renderTiers() {
    const t = D.RANK_TIERS;
    const row = (arr) => arr.map((x) => `<tr><td>${x.maxRank === Infinity ? '之后' : '≤ ' + x.maxRank.toLocaleString()}</td><td>${esc(x.tier)}</td></tr>`).join('');
    $('#rankTiers').innerHTML = `
      <p class="sys-label sys-green">🟢 我现在在哪里：当前位次 → 院校档位（定位用）</p>
      <div class="grid2">
        <div class="card"><h4>物理类</h4><table class="mini"><thead><tr><th>省位次</th><th>院校档位</th></tr></thead><tbody>${row(t.physics)}</tbody></table></div>
        <div class="card"><h4>历史类</h4><table class="mini"><thead><tr><th>省位次</th><th>院校档位</th></tr></thead><tbody>${row(t.history)}</tbody></table></div>
      </div>
      <p class="muted">${esc(t.caution)}</p><p class="muted">🧭 ${esc(D.TIER_SYSTEMS_NOTE)}</p>`;
  }

  function renderSchoolRanks() {
    const q = D.QUANT;
    $('#schoolRanks').innerHTML = `<table class="mini"><thead><tr><th>高校</th><th>物理类位次</th><th>历史类位次</th></tr></thead><tbody>${q.schoolRanks.map((s) => `<tr><td>${esc(s.name)}</td><td>${esc(s.physics)}</td><td>${esc(s.history)}</td></tr>`).join('')}</tbody></table><p class="muted">${esc(q.schoolRanksNote)}</p>`;
  }

  /* ========== 高中三年量化 + 我的计划 ========== */
  function renderGradeQuant() {
    $('#gradeQuant').innerHTML = natureBadge() + `<table class="mini"><thead><tr><th>阶段</th><th>年级排名</th><th>错题率</th><th>英语词汇</th><th>学习时长</th><th>位次差距</th></tr></thead><tbody>${
      D.HS_PLAN.map((s) => `<tr><td><b>${esc(s.grade)}</b></td><td>${esc(s.quantified.gradeRank)}</td><td>${esc(s.quantified.errorClear)}</td><td>${esc(s.quantified.vocab)}</td><td>${esc(s.quantified.hours)}</td><td>${esc(s.quantified.rankGap || '—')}</td></tr>`).join('')
    }</tbody></table><p class="muted">${esc(D.HS_PLAN_NOTE)}</p><p class="muted">⏳ ${esc(D.HOURS_NOTE)}</p><p class="muted">🏷️ ${esc(D.ADVISORY_NOTE)}</p>`;
  }

  function renderSubjectTime() {
    const q = D.QUANT;
    const bars = q.subjectTime.map((s) => `<div class="bar-row"><span class="bar-label">${esc(s.subject)}</span><span class="bar" style="width:${s.pct * 3}px"></span><span class="bar-val">${s.pct}%　${'★'.repeat(s.priority)}</span></div>`).join('');
    $('#subjectTime').innerHTML = `<div class="card">${bars}</div><div class="card"><h4>动态调整规则</h4><ul>${q.subjectTimeRules.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>`;
  }

  function renderPlanBreakdown() {
    const p = D.PLAN_BREAKDOWN;
    $('#planBreakdown').innerHTML = `
      <div class="card"><p><b>拆解链：</b>${esc(p.chain)}</p><ul>${p.rule.map((r) => `<li>${esc(r)}</li>`).join('')}</ul><p class="risk-mid">⚠️ ${esc(p.keyLimit)}</p></div>
      <div class="plan-levels">${p.levels.map((l) => `<div class="plan-lvl"><h4>${esc(l.name)}</h4><div class="q">${esc(l.q)}</div><div><b>产出：</b>${esc(l.out)}</div><div class="ex">例：${esc(l.example)}</div></div>`).join('')}</div>
      <div class="card"><h4>与其它模块的闭环</h4><div class="chips">${p.loop.map((x) => `<span class="chip">${esc(x)}</span>`).join('<span class="chip arrow">→</span>')}</div></div>`;
  }

  /* ========== 概览：分级 + 不建议量化 ========== */
  function renderLevels() {
    const L = D.LEVELS;
    $('#levels').innerHTML = `
      <div class="card"><h3>🧭 细化到什么程度？四级分级</h3><p class="muted">${esc(L.intro)}</p>
        <div class="lvl-grid">${L.items.map((x) => `<div class="lvl"><div class="lvl-id">${esc(x.id)} · ${esc(x.name)}</div><div class="lvl-scope">${esc(x.scope)}</div><div class="muted">适合：${esc(x.who)}｜何时：${esc(x.when)}</div><div class="tagrow">${x.modules.map((m) => `<span class="itag">${esc(m)}</span>`).join(' ')}</div></div>`).join('')}</div>
        <p class="risk-mid" style="margin-top:10px">📍 ${esc(L.current)}</p>
        <div class="trend-ptr">
          <span>⭐ 新增上位观察层：<b>战略趋势</b> —— 用真实趋势数据（人口/AI/产业/专业结构）判断“这个方向放到不同未来里还成立吗”。</span>
          <button class="btn" id="goTrend">去看战略趋势 →</button>
        </div>
        <div class="chips" style="margin:8px 0">${L.roadmap.map((r) => `<span class="chip">${esc(r.grade)}：${esc(r.level)}</span>`).join('')}</div>
        <div class="grid2">
          <div><b>应继续深化</b><ul>${L.deepen.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
          <div><b>暂不深挖</b><ul>${L.hold.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
        </div>
        <p class="muted">${esc(L.reason)}</p>
      </div>`;
    const gt = $('#goTrend');
    if (gt) gt.addEventListener('click', () => {
      const tab = $('.tab[data-tab="trend"]');
      if (tab) { tab.click(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    });
  }
  function renderNoQuant() {
    const N = D.NO_QUANT;
    $('#noQuant').innerHTML = `
      <div class="card"><h3>🚫 哪些内容不该量化</h3>
        <div class="noquant-grid">${N.items.map((x) => `<div class="nq"><b>${esc(x.t)}</b><div class="muted">${esc(x.why)}</div></div>`).join('')}</div>
        <div class="replace"><span class="bad">✗ ${esc(N.replace.bad)}</span>　→　<span class="good">✓ ${esc(N.replace.good)}</span></div>
      </div>`;
  }

  /* ========== 选科：专业池 ========== */
  function renderMajorPool() {
    $('#majorPool').innerHTML = D.MAJOR_POOL.map((g) => `
      <div class="card"><h4>${esc(g.combo)}</h4>
        <table class="mini"><thead><tr><th>专业</th><th>选科要求</th><th>广东开设高校（示例）</th><th>近 3 年位次（粗估）</th><th>风险维度（难度 / 深造 / 就业 / 适合）</th></tr></thead>
        <tbody>${g.majors.map((m) => { const r = D.MAJOR_RISK[m.name]; const risk = r ? `${esc(r.difficulty)} / ${esc(r.furtherStudy)} / ${esc(r.career)} / ${esc(r.fitFor)}` : '—'; return `<tr><td><b>${esc(m.name)}</b></td><td>${esc(m.req)}</td><td>${esc(m.schools)}</td><td>${esc(m.rank)}</td><td class="muted">${risk}</td></tr>`; }).join('')}</tbody></table>
        <p class="muted">📌 ${esc(D.MAJOR_POOL_CARD_NOTE)}　🧭 ${esc(D.MAJOR_RISK_NOTE)}</p>
      </div>`).join('') + `<p class="muted">${esc(D.MAJOR_POOL_NOTE)}｜数据源：${esc(D.MAJOR_POOL_META.dataSource)}（${esc(D.MAJOR_POOL_META.updateYear)}，${esc(D.MAJOR_POOL_META.note)}）</p>`;
  }

  /* ========== 升学路径：匹配工具 ========== */
  function renderPathMatch() {
    const P = D.PATH_MATCH;
    $('#pathMatch').innerHTML = `
      <div class="card"><h3>🧭 路径匹配：勾选你的情况</h3>
        <div class="match-list">${P.questions.map((q) => `<label><input type="checkbox" class="pm" value="${esc(q.id)}"> ${esc(q.label)}</label>`).join('')}</div>
        <button class="btn" id="pmBtn">看我适合哪些路径</button>
        <div id="pmResult"></div>
      </div>`;
    $('#pmBtn').addEventListener('click', () => {
      const sel = $$('.pm').filter((b) => b.checked).map((b) => b.value);
      const hits = P.rules.filter((r) => r.need.every((n) => sel.includes(n)));
      let html = hits.length
        ? `<div class="match-hits">${hits.map((h) => `<div class="match-card"><h4>✅ ${esc(h.path)}</h4><div class="muted">准备时间：${esc(h.when)}｜门槛：${esc(h.threshold)}</div><div class="risk-mid">风险：${esc(h.risk)}</div></div>`).join('')}</div>`
        : '';
      html += `<p class="muted" style="margin-top:8px">💡 无论勾选什么，<b>${esc(P.fallback)}</b>。${esc(D.PATHS_BASE_NOTE)}</p>`;
      $('#pmResult').innerHTML = html;
    });
  }

  /* ========== 我的排名：动态画像 ========== */
  function renderRankProfile() {
    const saved = LS.get('profile', { trend: '上升', strong: '', weak: '', cur: '', target: '' });
    $('#rankProfile').innerHTML = `
      <div class="card"><h3>🧬 我的动态画像</h3>
        <p class="muted">${esc(D.RANK_PROFILE.note)}</p>
        <div class="prof-row">
          <label>趋势 <select id="pfTrend"><option>上升</option><option>持平</option><option>下降</option></select></label>
          <label>优势科 <input id="pfStrong" placeholder="如 数学" value="${esc(saved.strong)}"></label>
          <label>短板科 <input id="pfWeak" placeholder="如 英语" value="${esc(saved.weak)}"></label>
          <label>当前位次 <input id="pfCur" type="number" placeholder="18000" value="${esc(saved.cur)}"></label>
          <label>目标位次 <input id="pfTarget" type="number" placeholder="10000" value="${esc(saved.target)}"></label>
        </div>
        <button class="btn" id="pfBtn">生成画像</button>
        <div id="pfResult" class="prof-result"></div>
      </div>`;
    $('#pfTrend').value = saved.trend || '上升';
    const run = () => {
      const o = { trend: $('#pfTrend').value, strong: $('#pfStrong').value, weak: $('#pfWeak').value, cur: $('#pfCur').value, target: $('#pfTarget').value };
      LS.set('profile', o);
      const cur = parseFloat(o.cur), target = parseFloat(o.target);
      const gap = (isNaN(cur) || isNaN(target)) ? null : cur - target;
      let risk = '低';
      if (gap != null) { risk = gap <= 0 ? '低' : gap <= 20000 ? '中' : '高'; }
      if (o.trend === '下降' && risk === '低') risk = '中';
      const prof = {
        rankTrend: o.trend, strongSubject: o.strong || '—', weakSubject: o.weak || '—',
        gapRank: gap == null ? '—' : (gap <= 0 ? '已进入目标区间' : gap.toLocaleString()),
        risk,
      };
      $('#pfResult').innerHTML = `<pre class="prof-json">${esc(JSON.stringify(prof, null, 2))}</pre>
        <p class="muted">优势科保持、短板科用 ${esc(D.RANK_PROFILE.weakTimeWeeks)}；以上为机器提示，不是定论。</p>`;
    };
    $('#pfBtn').addEventListener('click', run);
    ['pfTrend', 'pfStrong', 'pfWeak', 'pfCur', 'pfTarget'].forEach((id) => $('#' + id).addEventListener('change', run));
  }

  /* ========== 阶段任务树 ========== */
  function renderTaskTree() {
    $('#taskTree').innerHTML = `<div class="tree">${D.TASK_TREE.map((t) => `<div class="tree-node"><div class="tn-stage">${esc(t.stage)}</div><div class="tn-body"><div><b>目标：</b>${esc(t.target)}</div><div><b>动作：</b>${t.actions.map(esc).join('、')}</div><div><b>检查：</b>${t.check.map(esc).join('、')}</div></div></div>`).join('')}</div>`;
  }

  /* ========== 战略趋势层 ========== */
  const confCls = (c) => (c === '高' ? 'conf-high' : c === '中' ? 'conf-mid' : 'conf-low');
  const srcCls = (t) => (t === '官方统计' ? 'src-a' : t === '政策文件' ? 'src-b' : t === '机构研究' ? 'src-b2' : 'src-c');

  function renderTrendPosition() {
    const P = D.TREND_POSITIONING;
    $('#trendPosition').innerHTML = natureBadge() + `
      <div class="card trend-pos">
        <div class="tp-why"><b>为什么高一要看趋势</b><ul>${P.why.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <div class="tp-rel"><b>与 L1 战略级的关系</b><p>${esc(P.relation)}</p></div>
        <div class="grid2">
          <div class="card tp-can"><h4>✅ 这一层能做</h4><ul>${P.canDo.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
          <div class="card tp-cant"><h4>🚫 这一层不做</h4><ul>${P.canNotDo.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
        </div>
        <table class="mini"><thead><tr><th>来源类型</th><th>等级</th><th>它能说明什么</th><th>读的时候要小心</th></tr></thead><tbody>
          ${D.TREND_SOURCE_TYPES.map((s) => `<tr><td><span class="src-tag ${srcCls(s.type)}">${esc(s.type)}</span></td><td><b>${esc(s.level)}</b></td><td>${esc(s.meaning)}</td><td class="muted">${esc(s.caution)}</td></tr>`).join('')}
        </tbody></table>
      </div>`;
  }

  function renderTrendDims() {
    $('#trendDims').innerHTML = `<div class="dim-grid">${D.TREND_DIMENSIONS.map((d) => `
      <div class="dim-card">
        <div class="dc-head"><b>${esc(d.name)}</b><span class="conf-tag ${confCls(d.certainty)}">确定性 ${esc(d.certainty)}</span></div>
        <div class="dc-row"><span class="dc-k">观察对象</span><span>${esc(d.observe)}</span></div>
        <div class="dc-row"><span class="dc-k">观察指标</span><span>${esc(d.indicator)}</span></div>
        <div class="dc-mean">💡 ${esc(d.meaning)}</div>
      </div>`).join('')}</div>`;
  }

  function renderTrendDataUI() {
    const withData = D.TREND_DIMENSIONS.filter((d) => D.TREND_DATA.some((r) => r.dim === d.id));
    const dims = [{ id: 'all', name: '全部维度' }].concat(withData.map((d) => ({ id: d.id, name: d.name })));
    const noData = D.TREND_DIMENSIONS.filter((d) => !D.TREND_DATA.some((r) => r.dim === d.id));
    const srcs = ['全部来源'].concat(D.TREND_SOURCE_TYPES.map((s) => s.type));
    $('#trendDataUI').innerHTML = `
      <div class="filter-row">
        <label>维度 <select id="tdDim">${dims.map((d) => `<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('')}</select></label>
        <label>来源 <select id="tdSrc">${srcs.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}</select></label>
        <span class="muted" id="tdCount"></span>
      </div>
      <div id="tdTable"></div>
      ${noData.length ? `<p class="muted">ℹ️ 「${noData.map((d) => esc(d.name)).join('、')}」没有静态数据表——它不是靠数据读出来的，而是用下面的「长期适应能力结构检查器」逐项打分评估的。</p>` : ''}`;
    const draw = () => {
      const dv = $('#tdDim').value, sv = $('#tdSrc').value;
      const rows = D.TREND_DATA.filter((r) => (dv === 'all' || r.dim === dv) && (sv === '全部来源' || r.sourceType === sv));
      const hasOverseas = rows.some((r) => r.sourceType === '机构研究');
      $('#tdCount').textContent = `共 ${rows.length} 条（全表 ${D.TREND_DATA.length} 条）`;
      $('#tdTable').innerHTML = `<table class="mini trend-table"><thead><tr>
          <th>指标</th><th>数值（含适用范围）</th><th>年份</th><th>来源</th><th>类型</th><th>可信度</th><th>怎么读</th>
        </tr></thead><tbody>
        ${rows.map((r) => {
          const sp = D.TREND_SCOPE[r.sourceType] || {};
          return `<tr>
          <td><b>${esc(r.indicator)}</b></td>
          <td class="tv">${esc(r.value)}${sp.scope ? `<div class="scope-line">📍 适用范围：${esc(sp.scope)} ｜✅ 可参考：${esc(sp.usable)} ｜🚫 不可用于：${esc(sp.notUsable)}</div>` : ''}</td>
          <td>${esc(r.year)}</td>
          <td class="muted">${esc(r.source)}</td>
          <td><span class="src-tag ${srcCls(r.sourceType)}">${esc(r.sourceType)}</span></td>
          <td><span class="conf-tag ${confCls(r.confidence)}">${esc(r.confidence)}</span></td>
          <td class="muted">${esc(r.reading)}</td>
        </tr>`; }).join('')}
      </tbody></table>
      ${hasOverseas ? `<p class="muted">🌍 含海外样本数据：只可用于判断“变化方向”，不可用来推断广东的具体就业结果。</p>` : ''}
      <p class="muted">${esc(D.AI_TASK_NOTE)}</p>
      <p class="muted">📐 ${esc(D.TREND_DATA_NOTE)}</p>`;
    };
    $('#tdDim').addEventListener('change', draw);
    $('#tdSrc').addEventListener('change', draw);
    draw();
  }

  function renderPolicyChain() {
    const C = D.POLICY_CHAIN;
    $('#policyChain').innerHTML = `<div class="chain">${C.steps.map((s, i) => `
      <div class="chain-step">
        <div class="cs-head"><span class="cs-no">${i + 1}</span><b>${esc(s.step)}</b></div>
        <div class="cs-eg">例：${esc(s.example)}</div>
        <div class="cs-disc">⚠️ 会打折的地方：${esc(s.discount)}</div>
      </div>${i < C.steps.length - 1 ? '<div class="chain-arrow">↓</div>' : ''}`).join('')}</div>
      <p class="muted">🔗 ${esc(C.note)}</p>`;
  }

  function renderTrendInference() {
    const byId = {};
    D.TREND_DATA.forEach((r) => { byId[r.id] = r; });
    $('#trendInference').innerHTML = D.TREND_INFERENCE.map((t) => {
      const summary = `<span class="fold-idx">${esc(t.id)}</span><span class="fold-title">${esc(t.inference)}</span>
        <span class="conf-tag ${confCls(t.certainty)}">确定性 ${esc(t.certainty)}</span>
        <span class="fold-teaser">依据 ${t.basisIds.length} 条 · 点开看不成立条件</span>`;
      const body = `
        <div class="fold-block"><b>📎 依据的数据</b>
          <ul class="fold-list">${t.basisIds.map((b) => {
            const r = byId[b];
            return r ? `<li><span class="itag">${esc(b)}</span> ${esc(r.indicator)} —— <b>${esc(r.value)}</b>（${esc(r.year)} · ${esc(r.source)}）</li>` : `<li><span class="itag">${esc(b)}</span></li>`;
          }).join('')}</ul>
        </div>
        <div class="fold-block fold-warn"><b>⚠️ 什么情况下不成立</b><p>${esc(t.counter)}</p></div>`;
      return fold(summary, body, 'fold-inf');
    }).join('');
  }

  function renderScenarios() {
    $('#scenarioCards').innerHTML = `<div class="scen-grid">${D.SCENARIOS.map((s) => {
      const summary = `<span class="fold-title">${esc(s.name)}</span><span class="scen-tone">${esc(s.tone)}</span>
        <span class="fold-teaser">${s.triggers.length} 个触发特征 · ${s.deductions.length} 条推演 · ${s.implications.length} 条启示</span>`;
      const body = `
        <div class="scen-sec"><span class="scen-k">触发特征</span><ul>${s.triggers.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <div class="scen-sec"><span class="scen-k">推演</span><ul>${s.deductions.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <div class="scen-sec scen-imp"><span class="scen-k">对选科 / 专业的启示</span><ul>${s.implications.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
      return `<div class="scen-card scen-${esc(s.id)}">${fold(summary, body, 'fold-scen')}</div>`;
    }).join('')}</div><p class="muted">🎬 ${esc(D.SCENARIO_NOTE)}</p>`;
  }

  function renderRobustChoices() {
    $('#robustChoices').innerHTML = `<div class="robust-grid">${D.ROBUST_CHOICES.map((r, i) => {
      const summary = `<span class="rb-no">${i + 1}</span><span class="fold-title">${esc(r.title)}</span>
        <span class="fold-teaser">三情景下为何成立 + 高一动作</span>`;
      const body = `
        <div class="fold-block"><b>三情景下为何成立</b><p>${esc(r.why)}</p></div>
        <div class="fold-block fold-act"><b>高一现在怎么做</b><p>${esc(r.grade10Action)}</p></div>`;
      return `<div class="robust-card">${fold(summary, body, 'fold-robust')}</div>`;
    }).join('')}</div>`;
  }

  function renderResilienceTool() {
    const saved = LS.get('resilience', {});
    const M = D.RESILIENCE_MODEL;
    $('#resilienceTool').innerHTML = `
      <div class="card">
        <div class="res-disclaimer">🔎 <b>${esc(M.name)}</b>：${esc(M.disclaimer)}</div>
        <div class="res-result" id="resResult"></div>
        <div class="res-dims">
          ${M.dimensions.map((d, i) => {
            const v = saved['d' + i] ?? 3;
            const summary = `<span class="fold-title">${esc(d.name)}</span>
              <span class="itag">权重 ${d.weight}%</span>
              <span class="res-chip" id="rc${i}">${v} 分</span>
              <span class="fold-teaser">${esc(d.question)}</span>`;
            const body = `
              <div class="fold-block"><b>判断问题</b><p>${esc(d.question)}</p></div>
              <div class="fold-grid">
                <div class="fold-cell fold-high"><b>高分特征（4—5）</b><p>${esc(d.high)}</p></div>
                <div class="fold-cell fold-low"><b>低分特征（0—2）</b><p>${esc(d.low)}</p></div>
              </div>
              <div class="fold-block"><b>我的打分（0—5）</b>
                <div class="res-slider"><input class="res-range" type="range" min="0" max="5" step="1" value="${v}" data-i="${i}"><span class="res-val" id="rv${i}">${v}</span></div>
              </div>
              <div class="fold-block fold-act"><b>要补的话怎么做</b><p>${esc(d.boost)}</p></div>`;
            return fold(summary, body, 'fold-dim', true);
          }).join('')}
        </div>
        <div class="scale-row">
          ${M.scale.map((s) => `<div class="scale-cell"><b>${esc(s.score)}</b><span class="itag">${esc(s.label)}</span><div class="muted">${esc(s.hint)}</div></div>`).join('')}
        </div>
        <p class="muted">🧮 ${esc(M.note)}</p>
      </div>`;
    const calc = () => {
      const st = {};
      let sum = 0;
      D.RESILIENCE_MODEL.dimensions.forEach((d, i) => {
        const v = Number($(`.res-range[data-i="${i}"]`).value);
        st['d' + i] = v;
        const rv = $('#rv' + i); if (rv) rv.textContent = v;
        const rc = $('#rc' + i); if (rc) rc.textContent = v + ' 分';
        sum += (v / 5) * d.weight;
      });
      LS.set('resilience', st);
      const score = Math.round(sum);
      const band = D.RESILIENCE_MODEL.scale.find((s) => {
        const [lo] = s.score.split('—').map(Number);
        return score >= lo;
      }) || D.RESILIENCE_MODEL.scale[D.RESILIENCE_MODEL.scale.length - 1];
      const cls = score >= 80 ? 'risk-low' : score >= 60 ? 'risk-mid' : 'risk-high';
      $('#resResult').innerHTML = `<div class="${cls} res-score">当前能力结构匹配度：<b>${score}</b> / 100 · ${esc(band.label)}<span class="res-sub">（仅评价能力结构，不评价专业价值）</span></div>
        <div class="muted">${esc(band.hint)}${score < 80 ? ' 建议优先补强得分最低的两项。' : ''}</div>
        <div class="muted">本分数会随你的能力提升而变化——它不是专业的属性，是你当前准备的快照。</div>`;
    };
    $$('.res-range').forEach((el) => el.addEventListener('input', calc));
    calc();
  }

  function renderTrendActions() {
    $('#trendActions').innerHTML = `<div class="grid2">${D.TREND_ACTIONS.map((a) => {
      const summary = `<span class="fold-title">${esc(a.action)}</span><span class="fold-teaser">怎么做 + 怎么检验</span>`;
      const body = `
        <div class="fold-block"><b>怎么做</b><p>${esc(a.how)}</p></div>
        <div class="fold-block fold-act"><b>怎么检验</b><p>${esc(a.check)}</p></div>`;
      return `<div class="card act-card">${fold(summary, body, 'fold-act-card')}</div>`;
    }).join('')}</div>`;
  }

  function renderTrendNotes() {
    const rows = LS.get('trendNotes', []);
    $('#trendNotes').innerHTML = `
      <div class="card">
        <div class="note-add">
          <input id="tnMonth" placeholder="月份，如 2026-10">
          <input id="tnWhat" placeholder="观察到的产业/技术变化（一句话）">
          <input id="tnSo" placeholder="对我想学的方向意味着什么">
          <button class="btn" id="tnAdd">记一条</button>
        </div>
        <p class="muted">目标：一学年累计 ≥10 条。在校可用纸质本先写，回家再补录（不依赖电子产品）。</p>
        <div id="tnList"></div>
      </div>`;
    const draw = () => {
      const list = LS.get('trendNotes', []);
      $('#tnList').innerHTML = list.length
        ? `<div class="note-count">已记录 <b>${list.length}</b> 条</div>` + list.map((n, i) => `
          <div class="note-item">
            <div class="ni-head"><span class="itag">${esc(n.month || '未填月份')}</span><span class="ni-what">${esc(n.what)}</span>
              <button class="del" data-i="${i}" title="删除">✕</button></div>
            ${n.so ? `<div class="ni-so">↳ ${esc(n.so)}</div>` : ''}
          </div>`).join('')
        : '<p class="muted">还没有记录。第一条可以先写你已经注意到的任何变化。</p>';
      $$('#tnList .del').forEach((b) => b.addEventListener('click', () => {
        const list2 = LS.get('trendNotes', []);
        list2.splice(Number(b.dataset.i), 1);
        LS.set('trendNotes', list2);
        draw();
      }));
    };
    $('#tnAdd').addEventListener('click', () => {
      const what = $('#tnWhat').value.trim();
      if (!what) { $('#tnWhat').focus(); return; }
      const list = LS.get('trendNotes', []);
      list.unshift({ month: $('#tnMonth').value.trim(), what, so: $('#tnSo').value.trim() });
      LS.set('trendNotes', list);
      $('#tnWhat').value = ''; $('#tnSo').value = '';
      draw();
    });
    draw();
  }

  function renderActionMap() {
    const A = D.TREND_ACTION_MAP;
    $('#actionMap').innerHTML = `<table class="mini"><thead><tr>
        <th>趋势变化</th><th>❌ 不要做</th><th>✅ 应该做</th><th>检验方式</th>
      </tr></thead><tbody>
      ${A.rows.map((r) => `<tr>
        <td><b>${esc(r.trend)}</b></td>
        <td class="muted stamp-no">${esc(r.dont)}</td>
        <td class="stamp-yes">${esc(r.do)}</td>
        <td class="muted">${esc(r.check)}</td>
      </tr>`).join('')}
    </tbody></table>
    <p class="muted">🔗 ${esc(A.note)}</p>`;
  }

  function renderVerifyLog() {
    const V = D.VERIFY_LOG_SCHEMA;
    $('#verifyLog').innerHTML = `
      <div class="card">
        <div class="note-add">
          <select id="vlTerm">${V.terms.map((t) => `<option>${esc(t)}</option>`).join('')}</select>
          <input id="vlClaim" placeholder="我当初的判断（一句话）">
          <input id="vlHeld" placeholder="哪些部分成立了">
          <input id="vlFailed" placeholder="哪些部分没有发生">
          <select id="vlDecision">${V.decisions.map((d) => `<option>${esc(d)}</option>`).join('')}</select>
          <input id="vlReason" placeholder="理由（一句话）">
          <button class="btn" id="vlAdd">存档</button>
        </div>
        <p class="muted">${esc(V.note)}</p>
        <div id="vlList"></div>
      </div>`;
    const drawList = () => {
      const list = LS.get('verifyLog', []);
      $('#vlList').innerHTML = list.length
        ? `<div class="note-count">已存档 <b>${list.length}</b> 次学期验证</div>` + list.map((n, i) => `
          <div class="note-item">
            <div class="ni-head">
              <span class="itag">${esc(n.term)}</span>
              <span class="ni-what">${esc(n.claim)}</span>
              <span class="dec-tag dec-${n.decision === '继续' ? 'go' : n.decision === '调整' ? 'chg' : 'wait'}">${esc(n.decision)}</span>
              <button class="del" data-i="${i}" title="删除">✕</button>
            </div>
            ${n.held ? `<div class="ni-so">✅ 成立：${esc(n.held)}</div>` : ''}
            ${n.failed ? `<div class="ni-so">⚠️ 未发生：${esc(n.failed)}</div>` : ''}
            ${n.reason ? `<div class="ni-so">↳ 理由：${esc(n.reason)}</div>` : ''}
          </div>`).join('')
        : '<p class="muted">还没有记录。建议每学期末写一次，半年后回看最有用。</p>';
      $$('#vlList .del').forEach((b) => b.addEventListener('click', () => {
        const l2 = LS.get('verifyLog', []);
        l2.splice(Number(b.dataset.i), 1);
        LS.set('verifyLog', l2);
        drawList();
      }));
    };
    $('#vlAdd').addEventListener('click', () => {
      const claim = $('#vlClaim').value.trim();
      if (!claim) { $('#vlClaim').focus(); return; }
      const list = LS.get('verifyLog', []);
      list.unshift({
        term: $('#vlTerm').value, claim,
        held: $('#vlHeld').value.trim(), failed: $('#vlFailed').value.trim(),
        decision: $('#vlDecision').value, reason: $('#vlReason').value.trim(),
      });
      LS.set('verifyLog', list);
      ['vlClaim', 'vlHeld', 'vlFailed', 'vlReason'].forEach((id) => { $('#' + id).value = ''; });
      drawList();
    });
    drawList();
  }

  function renderCounterfactual() {
    const C = D.COUNTERFACTUAL;
    const saved = LS.get('counterfactual', { dir: '', belief: '', ans: {} });
    const checkedHedges = LS.get('cfHedges', {});

    $('#counterfactual').innerHTML = `
      <div class="card">
        <div class="cf-disclaimer">🧪 <b>${esc(C.name)}</b>：${esc(C.intro)}</div>
        <div class="cf-inputs">
          <label>${esc(C.directionLabel)}<input id="cfDir" placeholder="${esc(C.directionPlaceholder)}" value="${esc(saved.dir || '')}"></label>
          <label>${esc(C.beliefLabel)}<input id="cfBelief" placeholder="${esc(C.beliefPlaceholder)}" value="${esc(saved.belief || '')}"></label>
        </div>

        <div class="cf-scen">
          ${C.scenarios.map((s) => `
            <div class="cf-scen-card">
              <div class="cf-scen-head"><b>${esc(s.name)}</b></div>
              <div class="cf-premise">📌 前提：${esc(s.premise)}</div>
              <div class="cf-q">${esc(s.question)}</div>
              <div class="cf-opts">
                ${C.answers.map((a) => `<label class="cf-opt">
                  <input type="radio" name="cf_${esc(s.id)}" value="${a.v}" ${saved.ans && saved.ans[s.id] === a.v ? 'checked' : ''}>
                  <span>${esc(a.label)}</span></label>`).join('')}
              </div>
            </div>`).join('')}
        </div>

        <div class="cf-actions">
          <button class="btn" id="cfRun">生成对冲清单</button>
          <button class="btn cf-clear" id="cfClear">清空本次</button>
        </div>
        <div id="cfResult"></div>
        <p class="muted">${esc(C.note)}</p>
      </div>`;

    const run = () => {
      const dir = $('#cfDir').value.trim();
      const belief = $('#cfBelief').value.trim();
      const ans = {};
      let total = 0, answered = 0;
      C.scenarios.forEach((s) => {
        const el = $(`input[name="cf_${s.id}"]:checked`);
        if (el) { ans[s.id] = Number(el.value); total += Number(el.value); answered += 1; }
      });
      LS.set('counterfactual', { dir, belief, ans });

      const res = $('#cfResult');
      if (answered < C.scenarios.length) {
        res.innerHTML = `<p class="cf-warn">请先把四个反事实都选一遍（还差 ${C.scenarios.length - answered} 个），这样才能算“意愿韧性”。</p>`;
        return;
      }

      const band = C.bands.find((b) => total >= b.min) || C.bands[C.bands.length - 1];
      const cls = total >= 7 ? 'risk-low' : total >= 4 ? 'risk-mid' : 'risk-high';

      // 复用能力结构检查器的分数
      const rs = LS.get('resilience', {});
      const dims = D.RESILIENCE_MODEL.dimensions;
      const hasReal = dims.some((d, i) => Number(rs['d' + i] ?? 3) !== 3);
      const walls = hasReal ? dims.filter((d, i) => Number(rs['d' + i] ?? 3) >= 4) : [];
      const risks = hasReal ? dims.filter((d, i) => Number(rs['d' + i] ?? 3) <= 2) : [];

      // 对冲清单
      const hedges = [];
      C.scenarios.forEach((s) => {
        if (ans[s.id] < 2) {
          const a = C.answers.find((x) => x.v === ans[s.id]);
          hedges.push({ src: `${s.name} → 你选了“${a.label}”`, act: s.hedge });
        }
      });
      risks.forEach((d, i) => hedges.push({ src: `风险点：${d.name}`, act: d.boost }));

      const hedgeHtml = hedges.length ? hedges.map((h, i) => `
        <label class="hedge-item">
          <input type="checkbox" class="hedge-cb" data-k="h${i}" ${checkedHedges['h' + i] ? 'checked' : ''}>
          <span><b class="hedge-src">${esc(h.src)}</b><div class="hedge-act">${esc(h.act)}</div></span>
        </label>`).join('')
        : '<p class="muted">四个反事实你都选了“仍然愿意”——这说明你的意愿不依赖某个单一前提。接下来只要保持每学期一次校验即可。</p>';

      res.innerHTML = `
        <div class="cf-summary">
          <div class="cf-line">📌 方向：<b>${esc(dir || '（未填）')}</b>${belief ? ` ｜ 你默认成立的前提：${esc(belief)}` : ''}</div>
          <div class="${cls} res-score">你的反事实意愿韧性：<b>${total}</b> / 8 · ${esc(band.label)}</div>
          <div class="muted cf-scorenote">${esc(C.scoreNote)}</div>
          <div class="muted">${esc(band.hint)}</div>
        </div>

        <div class="grid2 cf-wallrisk">
          <div class="card"><h4>🧱 形成壁垒的部分（检查器得分 ≥4）</h4>
            ${hasReal
              ? (walls.length ? `<ul>${walls.map((d) => `<li><b>${esc(d.name)}</b>（${esc(String(Number(rs['d' + dims.indexOf(d)] ?? 3)))} 分）——这是你真正投入过的地方，继续加深。</li>`).join('')}</ul>` : '<p class="muted">暂时还没有 ≥4 分的维度。选一个你最愿意长期投入的维度先做深。</p>')
              : `<p class="muted">${esc(C.allDefaultHint)}</p>`}
          </div>
          <div class="card"><h4>⚠️ 容易被替代的部分 / 风险点（检查器得分 ≤2）</h4>
            ${hasReal
              ? (risks.length ? `<ul>${risks.map((d) => `<li><b>${esc(d.name)}</b>——见下方对冲清单的补强动作。</li>`).join('')}</ul>` : '<p class="muted">没有 ≤2 分的维度，能力结构没有明显短板。</p>')
              : `<p class="muted">${esc(C.allDefaultHint)}</p>`}
          </div>
        </div>
        ${hasReal ? `<p class="muted">📐 ${esc(C.wallNote)}</p>` : ''}

        <h4 class="cf-h4">🧾 对冲清单（把风险变成一件可执行的事）</h4>
        ${hedgeHtml}

        <div class="risk-mid cf-nochange">🔄 ${esc(C.noChangeNote)}</div>
        <p class="muted">${esc(C.resultNote)}</p>`;

      $$('#cfResult .hedge-cb').forEach((cb) => cb.addEventListener('change', () => {
        const st = LS.get('cfHedges', {});
        st[cb.dataset.k] = cb.checked;
        LS.set('cfHedges', st);
      }));
    };

    $('#cfRun').addEventListener('click', run);
    $('#cfClear').addEventListener('click', () => {
      LS.set('counterfactual', { dir: '', belief: '', ans: {} });
      LS.set('cfHedges', {});
      renderCounterfactual();
    });
    $$('input[name^="cf_"]').forEach((el) => el.addEventListener('change', () => {
      const ans = {};
      D.COUNTERFACTUAL.scenarios.forEach((s) => {
        const c = $(`input[name="cf_${s.id}"]:checked`);
        if (c) ans[s.id] = Number(c.value);
      });
      LS.set('counterfactual', { dir: $('#cfDir').value.trim(), belief: $('#cfBelief').value.trim(), ans });
    }));
    if (Object.keys(saved.ans || {}).length) run();
  }

  /* ========== 三条时钟示意图 ========== */
  function renderClockDiagram() {
    const marks = [
      { at: 6, label: '2026 高一' },
      { at: 32, label: '2029 高考' },
      { at: 66, label: '2033 本科毕业' },
      { at: 94, label: '2036 硕士毕业' },
    ];
    const lanes = [
      {
        name: '人口时钟', sub: '慢 · 单向 · 可预测',
        chips: [
          { at: 6, text: '你出生 · 高位' },
          { at: 46, text: '同批人不变' },
          { right: true, text: '出生数已腰斩', tone: 'warn' },
        ],
        foot: '出生人口要 18 年后才变成高考考生',
      },
      {
        name: '岗位时钟', sub: '快 · 双向 · 不确定',
        chips: [
          { at: 6, text: '已开始重构' },
          { at: 46, text: '任务结构在位移' },
          { right: true, text: '速度猜不到', tone: 'danger' },
        ],
        foot: '变的是“任务”，不是岗位名字',
      },
      {
        name: '教育系统', sub: '最慢 · 被动跟随',
        chips: [
          { at: 66, text: '专业目录按年调' },
          { right: true, text: '培养方案滞后' },
        ],
        foot: '入学时定的方案，四五年后才交付',
      },
    ];
    const axis = `<div class="ck-axis">
      <div class="ck-line"></div>
      ${marks.map((m) => `<div class="ck-mark" style="left:${m.at}%"><span class="ck-dot"></span><span class="ck-lbl">${esc(m.label)}</span></div>`).join('')}
    </div>`;
    const laneHtml = lanes.map((l) => `
      <div class="ck-lane">
        <div class="ck-name"><b>${esc(l.name)}</b><span>${esc(l.sub)}</span></div>
        <div class="ck-track">
          ${l.chips.map((c) => c.right
            ? `<span class="ck-chip ck-${c.tone || 'plain'} ck-right">${esc(c.text)}</span>`
            : `<span class="ck-chip ck-${c.tone || 'plain'}" style="left:${c.at}%">${esc(c.text)}</span>`).join('')}
          <div class="ck-foot">${esc(l.foot)}</div>
        </div>
      </div>`).join('');
    $('#clockDiagram').innerHTML = `<div class="clock-wrap">
      <div class="ck-head"><span class="ck-head-lbl">你的时间轴</span>${axis}</div>
      ${laneHtml}
      <p class="clock-callout">错位就出在这里：三条时钟不同步 → <b>入学时的热门，未必是毕业时的需求</b>。</p>
      <p class="muted">所以能控制的部分只有两件：盯住自己的<b>位次</b>（人口时钟你改不了），以及押<b>能力结构</b>而不是专业名称（岗位时钟你猜不到）。</p>
    </div>`;
  }

  /* ========== 图表（共享构建器） ========== */
  function chartColors() {
    const css = getComputedStyle(document.documentElement);
    const cv = (n, fb) => (css.getPropertyValue(n) || '').trim() || fb;
    return {
      ink: cv('--ink', '#1f2937'), muted: cv('--muted', '#6b7280'), line: cv('--line', '#e5e7eb'),
      brand: cv('--brand', '#2563eb'), soft: cv('--brand-soft', '#dbeafe'), accent: cv('--accent', '#7c3aed'),
    };
  }

  function chartCardHtml(c, height) {
    const legend = c.legend
      ? '<div class="chart-legend">' + c.legend.map((l, i) => '<span><i class="cl-sw cl-sw-' + i + '"></i>' + esc(l) + '</span>').join('') + '</div>'
      : '';
    return '<div class="card chart-card">' +
        '<div class="chart-head">' +
          '<div><h4>' + esc(c.title) + '</h4><div class="muted">' + esc(c.question) + '</div></div>' +
          '<span class="itag">' + esc(c.source) + '</span>' +
        '</div>' + legend +
        (c.dataNote ? '<p class="chart-data-note">' + esc(c.dataNote) + '</p>' : '') +
        '<div class="chart-wrap" style="height:' + height + 'px">' +
          '<canvas id="chart_' + esc(c.id) + '" role="img" aria-label="' + esc(c.title) + '：' + esc(c.insight) + '"></canvas>' +
        '</div>' +
        '<div class="chart-insight">💡 <b>说明什么：</b>' + esc(c.insight) + '</div>' +
        (c.impact ? '<div class="chart-impact">⚖️ <b>对你的影响：</b>' + esc(c.impact) + '</div>' : '') +
        '<div class="chart-caution">⚠️ <b>不要过度解读：</b>' + esc(c.caution) + '</div>' +
        '<div class="muted chart-caliber">📐 口径：' + esc(c.caliber) + '｜来源：' + esc(c.source) + '</div>' +
      '</div>';
  }

  function instantiateChart(c) {
    const el = document.getElementById('chart_' + c.id);
    if (!el || typeof Chart === 'undefined') return;
    const K = chartColors();
    const base = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
    const yGrid = { beginAtZero: true, grid: { color: K.line }, ticks: { color: K.muted, font: { size: 11 } } };
    const xGrid = { grid: { display: false }, ticks: { color: K.muted, font: { size: 11 } } };
    const yTitle = { display: true, text: c.unit, color: K.muted, font: { size: 11 } };
    const unitTip = { callbacks: { label: (x) => Math.round(x.parsed.y) + ' ' + c.unit } };
    let cfg;

    if (c.kind === 'bar') {
      cfg = {
        type: 'bar',
        data: {
          labels: c.labels,
          datasets: [{
            data: c.values,
            backgroundColor: c.values.map((v, i) => (i === c.highlightIndex ? K.accent : K.soft)),
            borderColor: c.values.map((v, i) => (i === c.highlightIndex ? K.accent : K.brand)),
            borderWidth: 1, borderRadius: 3, borderSkipped: false,
          }],
        },
        options: {
          ...base,
          plugins: { ...base.plugins, tooltip: unitTip },
          scales: {
            x: { ...xGrid, ticks: { ...xGrid.ticks, autoSkip: false, maxRotation: 45, minRotation: 0 } },
            y: { ...yGrid, title: yTitle },
          },
        },
      };
    } else if (c.kind === 'line') {
      cfg = {
        type: 'line',
        data: {
          labels: c.labels,
          datasets: [{
            data: c.values,
            borderColor: K.brand, backgroundColor: K.soft, fill: true, tension: 0.25,
            pointRadius: c.values.map((v, i) => (i === c.highlightIndex ? 6 : 3)),
            pointBackgroundColor: c.values.map((v, i) => (i === c.highlightIndex ? K.accent : K.brand)),
            borderWidth: 2,
          }],
        },
        options: {
          ...base,
          plugins: { ...base.plugins, tooltip: unitTip },
          scales: { x: xGrid, y: { ...yGrid, title: yTitle } },
        },
      };
    } else if (c.kind === 'barGroup') {
      cfg = {
        type: 'bar',
        data: {
          labels: c.labels,
          datasets: c.datasets.map((d, i) => ({
            label: d.label, data: d.values,
            backgroundColor: i === 0 ? K.brand : K.soft,
            borderColor: i === 0 ? K.brand : K.muted,
            borderWidth: 1, borderRadius: 3, borderSkipped: false,
          })),
        },
        options: {
          ...base,
          plugins: { ...base.plugins, tooltip: { callbacks: { label: (x) => x.dataset.label + '：' + Math.round(x.parsed.y) + c.unit } } },
          scales: { x: xGrid, y: { ...yGrid, title: yTitle } },
        },
      };
    } else {
      cfg = {
        type: 'bar',
        data: { labels: c.labels, datasets: [{ data: c.values, backgroundColor: K.brand, borderRadius: 4, borderSkipped: false }] },
        options: {
          ...base, indexAxis: 'y',
          plugins: { ...base.plugins, tooltip: { callbacks: { label: (x) => (x.parsed.x > 0 ? '+' : '') + Math.round(x.parsed.x) + c.unit } } },
          scales: {
            x: { ...yGrid, ticks: { color: K.muted, font: { size: 11 }, callback: (v) => v + c.unit } },
            y: { grid: { display: false }, ticks: { color: K.ink, font: { size: 11 } } },
          },
        },
      };
    }
    new Chart(el, cfg);
  }

  /* ========== 战略趋势页：三张图 ========== */
  function renderTrendCharts() {
    const C = D.CHART_DATA;
    const charts = C.charts.filter((c) => c.id !== 'plan');
    $('#trendCharts').innerHTML = charts.map((c) => chartCardHtml(c, c.kind === 'barH' ? 170 : 290)).join('')
      + '<p class="muted">📈 ' + esc(C.note) + '</p>';
    if (typeof Chart === 'undefined') {
      $('#trendCharts').insertAdjacentHTML('beforeend',
        '<p class="risk-mid">图表库未加载（assets/vendor/chart.umd.min.js 缺失或损坏）。数据仍可看上方「趋势数据表」。</p>');
      return;
    }
    charts.forEach(instantiateChart);
  }

  /* ========== 选科页：招生计划 vs 考生人数 ========== */
  function renderPlanChart() {
    const c = D.CHART_DATA.charts.find((x) => x.id === 'plan');
    if (!c) return;
    $('#planChart').innerHTML = chartCardHtml(c, 280);
    if (typeof Chart === 'undefined') {
      $('#planChart').insertAdjacentHTML('beforeend',
        '<p class="risk-mid">图表库未加载。数据仍可看上方「招生计划：物理 vs 历史的结构差」表。</p>');
      return;
    }
    instantiateChart(c);
  }

  /* ========== 我的目标：目标院校核对表 ========== */
  function renderSchoolCheck() {
    const S = D.SCHOOL_CHECK;
    const root = $('#schoolCheck');
    if (!root) return;
    let picks = LS.get('schoolCheckPicks', []);

    const linksHtml = S.links.map((l) =>
      `<div class="sc-link"><b>${esc(l.name)}</b><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.url)}</a><span class="muted">${esc(l.use)}</span></div>`).join('');

    function cardHtml(s) {
      const on = picks.includes(s.name);
      return `<label class="sc-card ${on ? 'sc-on' : ''}">
        <input type="checkbox" class="sc-pick" value="${esc(s.name)}" ${on ? 'checked' : ''} />
        <div class="sc-main">
          <div class="sc-head"><b>${esc(s.name)}</b><span class="itag">${esc(s.level)}</span><span class="itag">${esc(s.region)}</span><span class="itag">${esc(s.kind)}</span></div>
          <div class="sc-rule">⚖️ 选科要求怎么判断：${esc(S.kindRules[s.kind] || '以官方查询系统为准')}</div>
          <div class="sc-hist">📚 历史类提示：${esc(s.historyNote)}</div>
          ${s.extraNote ? `<div class="sc-extra">${esc(s.extraNote)}</div>` : ''}
        </div>
      </label>`;
    }

    function listHtml() {
      const tier = $('#scTier') ? $('#scTier').value : 'all';
      const region = $('#scRegion') ? $('#scRegion').value : 'all';
      const rows = S.schools.filter((s) => (tier === 'all' || s.tier === tier) && (region === 'all' || s.region === region));
      if (!rows.length) return '<p class="muted">没有符合条件的院校，换个筛选条件。</p>';
      return rows.map(cardHtml).join('');
    }

    function checklistHtml() {
      const rows = S.schools.filter((s) => picks.includes(s.name));
      if (!rows.length) return '<p class="muted">还没有勾选院校。先在上面的卡片里勾 3–5 所，再回来生成核对清单。</p>';
      return rows.map((s) => `<div class="sc-check-item">
          <h4>${esc(s.name)} <span class="itag">${esc(s.level)}</span></h4>
          <ol>${S.verifyFields.map((f) => `<li><b>${esc(f.k)}</b>：${esc(f.q)}<div class="muted">什么时候做：${esc(f.when)}｜在哪查：${esc(f.src)}｜结果：<span class="sc-blank">＿＿＿＿</span></div></li>`).join('')}</ol>
        </div>`).join('');
    }

    function refresh() {
      $('#scGrid').innerHTML = listHtml();
      $('#scChecklist').innerHTML = checklistHtml();
      $('#scCount').textContent = picks.length;
      root.querySelectorAll('.sc-pick').forEach((cb) => {
        cb.addEventListener('change', () => {
          const n = cb.value;
          if (cb.checked) { if (!picks.includes(n)) picks.push(n); }
          else picks = picks.filter((x) => x !== n);
          LS.set('schoolCheckPicks', picks);
          const card = cb.closest('.sc-card');
          if (card) card.classList.toggle('sc-on', cb.checked);
          $('#scChecklist').innerHTML = checklistHtml();
          $('#scCount').textContent = picks.length;
        });
      });
    }

    root.innerHTML = `<div class="card" style="padding:16px">
      <p class="muted" style="margin-top:0">${esc(S.intro)}</p>
      <div class="sc-links">${linksHtml}</div>
      <div class="sc-verify">
        ${S.verifyFields.map((f) => `<div class="sc-verify-item"><b>${esc(f.k)}</b><span>${esc(f.q)}</span><span class="muted">${esc(f.when)}｜${esc(f.src)}</span></div>`).join('')}
      </div>
      <div class="sc-filters">
        <label>层次 <select id="scTier">
          <option value="all">全部</option><option value="985">985</option><option value="211">211</option>
          <option value="双一流">双一流</option><option value="区域强校">区域强校</option>
        </select></label>
        <label>地域 <select id="scRegion">
          <option value="all">全部</option><option value="省内">省内</option><option value="省外">省外</option>
        </select></label>
        <span class="muted">已勾选 <b id="scCount">0</b> 所（建议 3–5 所）</span>
      </div>
      <div class="sc-grid" id="scGrid"></div>
      <p class="muted">${esc(S.note)}</p>
      <h4 class="sc-h4">📋 我的核对清单（勾选后自动生成，刷新不丢）</h4>
      <div id="scChecklist"></div>
      <p class="sc-honesty">🛡️ ${esc(S.honesty)}</p>
    </div>`;

    $('#scTier').addEventListener('change', refresh);
    $('#scRegion').addEventListener('change', refresh);
    refresh();
  }

  /* ========== 我的目标：高校库（L3，带口径标注与变化记录） ========== */
  function renderSchoolDb() {
    const S = D.SCHOOL_DB;
    const root = $('#schoolDb');
    if (!root) return;
    const kindLabel = { '综合': '综合', '理工': '理工', '师范': '师范', '医': '医', '外语政法': '外语政法' };

    function rowHtml(s) {
      const chg = (s.changes && s.changes.length)
        ? `<details class="db-ch"><summary>${s.changes.length} 条</summary><ul>${s.changes.map((c) => `<li><b>${esc(c.date)}</b> · ${esc(c.text)}</li>`).join('')}</ul></details>`
        : '<span class="muted">待积累</span>';
      return `<tr>
        <td><b>${esc(s.name)}</b></td>
        <td><span class="itag">${esc(s.level)}</span></td>
        <td>${esc(kindLabel[s.kind] || s.kind)}</td>
        <td>${esc(s.region)}</td>
        <td>${s.phy ? esc(s.phy) : '<span class="muted">待收录</span>'}</td>
        <td>${s.hist ? esc(s.hist) : '<span class="muted">待收录</span>'}</td>
        <td class="db-asof">${s.asOf ? esc(s.asOf) + '<br><span class="db-verify">核于 ' + esc(S.lastVerify) + '</span>' : '<span class="muted">—</span>'}</td>
        <td>${chg}</td>
      </tr>`;
    }

    function bodyHtml() {
      const tier = $('#dbTier') ? $('#dbTier').value : 'all';
      const region = $('#dbRegion') ? $('#dbRegion').value : 'all';
      const rows = S.schools.filter((s) => (tier === 'all' || s.tier === tier) && (region === 'all' || s.region === region));
      if (!rows.length) return '<tr><td colspan="8" class="muted">没有符合条件的院校。</td></tr>';
      return rows.map(rowHtml).join('');
    }

    function refresh() { $('#dbBody').innerHTML = bodyHtml(); }

    const recCount = S.schools.reduce((n, s) => n + (s.changes ? s.changes.length : 0), 0);

    root.innerHTML = `<div class="card" style="padding:16px">
      <p class="muted" style="margin-top:0">${esc(S.intro)}</p>
      <p class="db-l3">🧭 ${esc(S.levelNote)}</p>
      <p class="db-update">🔄 ${esc(S.updateNote)}</p>
      <p class="db-building">${esc(S.building)}</p>
      <div class="db-status">
        <span>🗓️ 最近核验：<b>${esc(S.lastVerify)}</b></span>
        <span>📝 已记录变化：<b>${recCount}</b> 条</span>
        <span>🏫 收录院校：<b>${S.schools.length}</b> 所</span>
      </div>
      <p class="muted" style="font-size:12px">${esc(S.lastVerifyNote)}</p>
      <div class="sc-filters">
        <label>层次 <select id="dbTier">
          <option value="all">全部</option><option value="985">985</option><option value="211">211</option>
          <option value="双一流">双一流</option><option value="区域强校">区域强校</option>
        </select></label>
        <label>地域 <select id="dbRegion">
          <option value="all">全部</option><option value="省内">省内</option><option value="省外">省外</option>
        </select></label>
        <span class="muted">共 ${S.schools.length} 所</span>
      </div>
      <div style="overflow-x:auto">
      <table class="mini db-table"><thead><tr>${S.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
      <tbody id="dbBody"></tbody></table></div>
      <p class="muted">📐 ${esc(S.rankNote)}</p>
    </div>`;
    $('#dbTier').addEventListener('change', refresh);
    $('#dbRegion').addEventListener('change', refresh);
    refresh();
  }

  /* ========== 升学路径：信息博弈视角 ========== */
  function renderPathGame() {
    const P = D.PATH_GAME;
    const root = $('#pathGame');
    if (!root) return;
    root.innerHTML = `<div class="card" style="padding:16px">
      <p style="margin-top:0">${esc(P.intro)}</p>
      <p class="pg-belief">🎲 ${esc(P.belief)}</p>
      <div class="pg-rules">${P.rules.map((r) => `<div class="pg-rule">${esc(r)}</div>`).join('')}</div>
      <div class="pg-grid">
        ${P.paths.map((p) => `<div class="pg-card">
          <h4>${esc(p.name)}</h4>
          <div class="pg-row"><span>⏱ 时间窗</span>${esc(p.windows)}</div>
          <div class="pg-row"><span>🔎 信息源</span>${esc(p.infoSrc)}</div>
          <div class="pg-row pg-edge"><span>🎯 胜率动作</span>${esc(p.edge)}</div>
          <div class="pg-row pg-luck"><span>🎲 运气成分</span>${esc(p.luck)}</div>
          <div class="pg-row pg-trap"><span>⚠️ 常见陷阱</span>${esc(p.trap)}</div>
        </div>`).join('')}
      </div>
      <p class="muted">🔄 ${esc(P.updateMechanism)}</p>
    </div>`;
  }

  /* ========== 选科页：三层筛选 / 选科要求 / 招生计划 ========== */
  function renderTripleFilter() {
    const T = D.SELECT_TRIPLE_FILTER;
    $('#tripleFilter').innerHTML = `<div class="card" style="padding:16px">
      <p class="muted" style="margin-top:0">${esc(T.intro)}</p>
      <div class="tri-grid">${T.steps.map((s, i) => `
        <div class="tri-card tri-${i + 1}">
          <div class="tri-head"><span class="tri-n">${esc(s.n)}</span><b>${esc(s.name)}</b><span class="itag">${esc(s.kind)}</span></div>
          <div class="tri-q">❓ ${esc(s.q)}</div>
          <div class="tri-row"><span>看哪份文件</span>${esc(s.source)}</div>
          <div class="tri-row"><span>变化节奏</span>${esc(s.nature)}</div>
          <div class="tri-row tri-fail"><span>没对上会怎样</span>${esc(s.fail)}</div>
          <div class="tri-act">🎯 什么时候做：${esc(s.action)}</div>
        </div>${i < T.steps.length - 1 ? '<div class="tri-arrow">→</div>' : ''}`).join('')}</div>
      <p class="tri-takeaway">📌 ${esc(T.takeaway)}</p>
    </div>`;
  }

  function renderSubjectReq() {
    const R = D.SUBJECT_REQ_2027;
    const tbl = (title, obj) => `<h4 class="sr-h4">${esc(title)}</h4>
      <table class="mini"><thead><tr><th>首选科目要求</th><th>专业数量</th><th>占比</th></tr></thead><tbody>
        ${obj.items.map((i) => `<tr><td>${esc(i.k)}</td><td><b>${esc(i.v)}</b></td><td>${esc(i.pct)}</td></tr>`).join('')}
      </tbody></table>
      <p class="muted">${esc(obj.note)}</p>`;
    $('#subjectReq').innerHTML = `<div class="card" style="padding:16px">
      <div class="sr-doc">
        <div><b>${esc(R.file)}</b></div>
        <div class="muted">${esc(R.issuer)} · ${esc(R.docNo)}</div>
        <div class="muted">官方查询系统：<a href="${esc(R.queryUrl)}" target="_blank" rel="noopener">${esc(R.queryUrl)}</a></div>
        <div class="sr-applicable">📅 ${esc(R.applicable)}</div>
      </div>
      <p class="muted">📐 ${esc(R.statNote)}</p>
      ${tbl('本科专业（面向广东，共 ' + R.undergrad.total + '）', R.undergrad)}
      ${tbl('专科专业（共 ' + R.junior.total + '）', R.junior)}
      <p class="sr-rule">⚙️ ${esc(R.keyRule)}</p>
      <h4 class="sr-h4">这一版相对上一版改了什么（4 条）</h4>
      <div class="sr-changes">
        ${R.changes.map((c) => `<div class="sr-change"><b>${esc(c.title)}</b><p>${esc(c.detail)}</p></div>`).join('')}
      </div>
      <p class="sr-mustknow">${esc(R.mustKnow)}</p>
    </div>`;
  }

  function renderPlanVsExam() {
    const P = D.PLAN_VS_EXAMINEE;
    $('#planVsExam').innerHTML = `<div class="card" style="padding:16px">
      <table class="mini"><thead><tr>${P.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>
        ${P.rows.map((r) => `<tr>
          <td><b>${esc(r.subject)}</b></td>
          <td>${esc(r.examiners)}</td>
          <td>${esc(r.plan)}</td>
          <td><b>${esc(r.planShare)}</b></td>
          <td>${esc(r.examShare)}</td>
          <td>${esc(r.perCapita)}</td>
        </tr>`).join('')}
      </tbody></table>
      <p class="plan-takeaway">📌 ${esc(P.takeaway)}</p>
      <p class="muted">📐 ${esc(P.note)}</p>
      <p class="plan-caution">⚠️ ${esc(P.caution)}</p>
    </div>`;
  }

  function renderImpactTimeline() {
    const rows = D.IMPACT_TIMELINE;
    let lastKey = null;
    $('#impactTimeline').innerHTML = `
      <div class="impact-wrap">
        ${rows.map((r) => {
          const key = r.group || r.when;
          const newGroup = key !== lastKey;
          lastKey = key;
          return `${newGroup ? `<div class="imp-when">${esc(key)}</div>` : ''}
          ${fold(
            `<span class="fold-itype">⚙️ 机制</span>
             <span class="fold-title">${esc(r.channel)}</span>
             ${r.group ? `<span class="itag">${esc(r.when)}</span>` : ''}
             <span class="itag">${r.basis.map(esc).join(' + ')}</span>
             <span class="fold-teaser">点开看：你会经历什么 + 待验证信号</span>`,
            `<div class="fold-block"><b>⚙️ 你会经历什么（推演，可能成立也可能不成立）</b><p>${esc(r.effect)}</p></div>
             <div class="fold-block fold-act"><b>🔎 待验证信号 · 现在盯什么</b><p>${esc(r.watch)}</p></div>`,
            'fold-imp'
          )}`;
        }).join('')}
      </div>
      <p class="impact-legend">🏷️ ${esc(D.IMPACT_LEGEND)}</p>
      <p class="impact-callout">⚠️ ${esc(D.IMPACT_CAUTION)}</p>
      <p class="muted">📌 ${esc(D.IMPACT_NOTE)}</p>`;
  }

  function renderTrendForbidden() {
    $('#trendForbidden').innerHTML = `<table class="mini"><thead><tr><th>不会出现的表述</th><th>原因</th><th>改用</th></tr></thead><tbody>
      ${D.TREND_FORBIDDEN.map((f) => `<tr><td class="muted strike">${esc(f.forbidden)}</td><td class="muted">${esc(f.reason)}</td><td><b>${esc(f.instead)}</b></td></tr>`).join('')}
    </tbody></table>`;
    $('#trendNote').innerHTML = `<p class="disclaimer">📚 ${esc(D.TREND_NOTE)}</p>`;
  }

  /* ========== Init ========== */
  document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    renderOverview();
    renderLevels();
    renderNoQuant();
    renderTrendPosition();
    initFoldBar();
    renderClockDiagram();
    renderTrendDims();
    renderPolicyChain();
    renderTrendDataUI();
    renderImpactTimeline();
    renderTrendInference();
    renderScenarios();
    renderRobustChoices();
    renderResilienceTool();
    renderCounterfactual();
    renderTrendActions();
    renderActionMap();
    renderTrendNotes();
    renderVerifyLog();
    renderTrendForbidden();
    if ($('#trend').classList.contains('active')) ensureCharts();
    if ($('#select').classList.contains('active')) ensurePlanChart();
    renderSelect();
    renderTripleFilter();
    renderSubjectReq();
    renderPlanVsExam();
    renderMajorPool();
    renderBranches();
    renderPaths();
    renderPathMatch();
    renderPathGame();
    renderGrades();
    renderGradeQuant();
    renderThreeYearPlan();
    renderHsMonths();
    renderExamTimeline();
    renderSchoolLevels();
    renderHs3Rank();
    renderRankStrategy();
    renderSubjectTime();
    renderTaskTree();
    renderPlanBreakdown();
    renderTarget();
    renderSchoolCheck();
    renderSchoolDb();
    renderScoreModel();
    renderProfileTags();
    renderRank();
    renderRankProfile();
    renderExamCheck();
    renderMonthly();
    renderLoss();
    renderTwoweek();
    renderPaper();
  });
})();
