# -*- coding: utf-8 -*-
"""
gd-211-985-path 全站冒烟测试

用法（需要 Playwright；可直接复用 chatgpt-openai-bridge 的 venv）：
    cd <本目录> && "D:/workbuddy/2026-09-13-21-42-20/chatgpt-openai-bridge/.venv/Scripts/python.exe" -m http.server 8099 --bind 127.0.0.1
    cd <本目录> && "D:/workbuddy/2026-09-13-21-42-20/chatgpt-openai-bridge/.venv/Scripts/python.exe" tests/smoke.py

覆盖：
- 11 个标签页均能激活且渲染非空
- 全局“无转义 HTML 泄漏”守卫（数据层若在会被 esc() 的文本里写 HTML，会以字面量露出）
- 历史 bug 回归：两周复盘卡 11 个填空位、选科决策器、再选≤2 门
- 战略趋势层：数据表筛选、能力结构检查器、方向反事实测试器
"""
import sys
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8099/index.html"
TABS = ["overview", "trend", "select", "branches", "paths", "grades", "target", "rank", "check", "paper"]
results, errors = [], []


def step(name, fn):
    try:
        ok = bool(fn())
        results.append((name, ok, ""))
        print(("PASS " if ok else "FAIL ") + name, flush=True)
    except Exception as e:
        results.append((name, False, f"{type(e).__name__}: {e}"))
        print("FAIL " + name + f"  <= {type(e).__name__}: {e}", flush=True)


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    pg.set_default_timeout(8000)
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(f"PAGEERROR: {e}"))
    pg.goto(URL, wait_until="domcontentloaded")
    pg.wait_for_timeout(600)
    pg.evaluate("()=>Object.keys(localStorage).filter(k=>k.startsWith('gd211_')).forEach(k=>localStorage.removeItem(k));")
    pg.reload(wait_until="domcontentloaded")
    pg.wait_for_timeout(700)

    # ---- 所有标签页 ----
    step("标签页数量 = 10", lambda: pg.evaluate("()=>document.querySelectorAll('.tab').length===10"))
    for t in TABS:
        pg.click(f'.tab[data-tab="{t}"]')
        pg.wait_for_timeout(200)
        step(f"[{t}] 激活且有内容", lambda t=t: pg.evaluate(
            "t=>{const e=document.getElementById(t);return !!e&&e.classList.contains('active')&&e.innerText.trim().length>60;}", t))

    # ---- 全局 HTML 泄漏守卫 ----
    leaks = []
    for t in TABS:
        pg.click(f'.tab[data-tab="{t}"]')
        pg.wait_for_timeout(180)
        found = pg.evaluate(
            "t=>['<span','<b>','</b>','<br','<div','</div>'].filter(k=>document.getElementById(t).innerText.includes(k))", t)
        if found:
            leaks.append(f"{t}:{found}")
    step("全局无转义 HTML 泄漏", lambda: not leaks)

    # ---- 历史 bug 回归 ----
    pg.click('.tab[data-tab="check"]')
    pg.wait_for_timeout(300)
    step("复盘卡 11 个填空位", lambda: pg.evaluate("()=>document.querySelectorAll('#printCard .line span.u').length===11"))
    step("复盘卡无残留 ____", lambda: pg.evaluate("()=>!document.querySelector('#printCard').innerText.includes('____')"))

    pg.click('.tab[data-tab="select"]')
    pg.wait_for_timeout(300)
    pg.click('input[name="prefer"][value="物理"]')
    pg.click('input[name="reelect"][value="化学"]')
    pg.click('input[name="reelect"][value="生物"]')
    pg.wait_for_timeout(250)
    step("选科决策器算出物化生", lambda: pg.evaluate("()=>document.querySelector('#selResult').innerText.includes('物化生')"))
    step("再选最多 2 门", lambda: pg.evaluate("()=>document.querySelectorAll('input[name=\"reelect\"]:checked').length<=2"))

    # ---- 选科页：三层筛选 / 选科要求 / 招生计划 ----
    step("三层筛选 = 3 卡", lambda: pg.evaluate("()=>document.querySelectorAll('#tripleFilter .tri-card').length===3"))
    step("三层含门槛/盘子/竞争", lambda: pg.evaluate(
        "()=>{const t=document.querySelector('#tripleFilter').innerText;return t.includes('能不能报')&&t.includes('招多少人')&&t.includes('轮不轮到你');}"))
    step("选科要求含 2027 版文号", lambda: pg.evaluate(
        "()=>{const t=document.querySelector('#subjectReq').innerText;return t.includes('粤教考函')&&t.includes('2027');}"))
    step("选科要求含本科3类+专科3类", lambda: pg.evaluate(
        "()=>document.querySelectorAll('#subjectReq table').length===2&&document.querySelectorAll('#subjectReq .sr-change').length===4"))
    step("选科要求含物理化学约90%(55/61)", lambda: pg.evaluate(
        "()=>{const t=document.querySelector('#subjectReq').innerText;return t.includes('约 90%')&&t.includes('55/61');}"))
    step("选科要求有整理统计口径声明", lambda: pg.evaluate(
        "()=>document.querySelector('#subjectReq').innerText.includes('整理统计')"))
    step("中医学措辞为'不再要求化学'且有院校样本说明", lambda: pg.evaluate(
        "()=>{const t=document.querySelector('#subjectReq').innerText;"
        "return t.includes('不再要求化学')&&t.includes('院校样本');}"))
    step("变动数字注明按专业条目统计", lambda: pg.evaluate(
        "()=>document.querySelector('#subjectReq').innerText.includes('按专业条目统计')"))
    step("选科要求≠招生计划提示", lambda: pg.evaluate(
        "()=>document.querySelector('#subjectReq').innerText.includes('选科要求')&&document.querySelector('#subjectReq').innerText.includes('招生计划')&&document.querySelector('#subjectReq').innerText.includes('另一份文件')"))
    step("招生计划表 2 行", lambda: pg.evaluate("()=>document.querySelectorAll('#planVsExam tbody tr').length===2"))
    step("招生计划含 77%/23% 与 58%/42%", lambda: pg.evaluate(
        "()=>{const t=document.querySelector('#planVsExam').innerText;return t.includes('77%')&&t.includes('23%')&&t.includes('58%')&&t.includes('42%');}"))
    step("招生计划含 2.4 倍结论", lambda: pg.evaluate(
        "()=>document.querySelector('#planVsExam').innerText.includes('2.4 倍')"))
    step("招生计划含口径与边界提示", lambda: pg.evaluate(
        "()=>{const t=document.querySelector('#planVsExam').innerText;return t.includes('口径')&&t.includes('不是个体上限');}"))
    step("招生计划禁用'人均供给'表述(P1回归)", lambda: pg.evaluate(
        "()=>!document.querySelector('#planVsExam').innerText.includes('人均')"))
    step("招生计划声明不采用总量判断", lambda: pg.evaluate(
        "()=>document.querySelector('#planVsExam').innerText.includes('不采用')"))
    step("招生计划结论含'不等于个人录取概率'", lambda: pg.evaluate(
        "()=>document.querySelector('#planVsExam').innerText.includes('不等于个人录取概率')"))
    step("图4 canvas 已渲染", lambda: pg.evaluate("()=>document.querySelectorAll('#planChart canvas').length===1"))
    step("图4 双数据集 77/23 与 58/42", lambda: pg.evaluate(
        "()=>{const c=Chart.getChart('chart_plan');if(!c)return false;const d=c.data.datasets;"
        "return d.length===2&&d[0].data.join()==='77,23'&&d[1].data.join()==='58,42';}"))
    step("图4 有自定义图例", lambda: pg.evaluate("()=>document.querySelectorAll('#planChart .chart-legend span').length===2"))
    step("图4 标题含'不等于录取难度'", lambda: pg.evaluate(
        "()=>document.querySelector('#planChart').innerText.includes('不等于录取难度')"))
    step("图4 含'计划结构 ≠ 个体机会'", lambda: pg.evaluate(
        "()=>document.querySelector('#planChart').innerText.includes('计划结构 ≠ 个体机会')"))
    step("图4 图表下方有防误读数据注", lambda: pg.evaluate(
        "()=>document.querySelector('#planChart').innerText.includes('结构占比，不是')"))
    step("图4 影响含'辅助因素'平衡表述", lambda: pg.evaluate(
        "()=>document.querySelector('#planChart').innerText.includes('辅助因素')"))

    # ---- 战略趋势层 ----
    pg.click('.tab[data-tab="trend"]')
    pg.wait_for_timeout(350)
    step("趋势数据表 = 36 行", lambda: pg.evaluate("()=>document.querySelectorAll('#tdTable tbody tr').length===36"))
    step("适用范围标注 = 36 条", lambda: pg.evaluate("()=>document.querySelectorAll('#tdTable .scope-line').length===36"))
    pg.select_option("#tdDim", "pop")
    pg.wait_for_timeout(200)
    step("筛选 pop = 15 行", lambda: pg.evaluate("()=>document.querySelectorAll('#tdTable tbody tr').length===15"))
    pg.select_option("#tdDim", "all")
    pg.wait_for_timeout(200)
    step("政策四步链", lambda: pg.evaluate("()=>document.querySelectorAll('#policyChain .chain-step').length===4"))
    step("三情景卡", lambda: pg.evaluate("()=>document.querySelectorAll('#scenarioCards .scen-card').length===3"))
    step("稳健选择 5 条", lambda: pg.evaluate("()=>document.querySelectorAll('#robustChoices .robust-card').length===5"))

    # ---- 三条时钟示意图 ----
    step("三时钟泳道 = 3", lambda: pg.evaluate("()=>document.querySelectorAll('#clockDiagram .ck-lane').length===3"))
    step("时间轴 4 个节点", lambda: pg.evaluate("()=>document.querySelectorAll('#clockDiagram .ck-mark').length===4"))

    # ---- 折叠卡片 ----
    step("折叠卡片 >= 20 张", lambda: pg.evaluate("()=>document.querySelectorAll('#trend details.fold').length>=20"))
    step("默认收起（推论类）", lambda: pg.evaluate("()=>document.querySelectorAll('#trendInference details.fold[open]').length===0"))
    step("工具型卡片默认展开（检查器 6 张）", lambda: pg.evaluate(
        "()=>{const a=document.querySelectorAll('#resilienceTool details.fold');return a.length===6&&document.querySelectorAll('#resilienceTool details.fold[open]').length===6;}"))
    pg.click('#trendInference details.fold > summary.fold-sum')
    pg.wait_for_timeout(200)
    step("点标题可展开", lambda: pg.evaluate("()=>document.querySelector('#trendInference details.fold').open===true"))
    step("展开后显示详细内容", lambda: pg.evaluate("()=>document.querySelector('#trendInference details.fold .fold-body').innerText.length>40"))
    pg.click("#foldAll")
    pg.wait_for_timeout(250)
    step("展开全部生效", lambda: pg.evaluate(
        "()=>{const a=document.querySelectorAll('#trend details.fold');const o=document.querySelectorAll('#trend details.fold[open]');return a.length===o.length&&a.length>=20;}"))
    pg.click("#foldNone")
    pg.wait_for_timeout(250)
    step("收起全部生效", lambda: pg.evaluate("()=>document.querySelectorAll('#trend details.fold[open]').length===0"))
    pg.click("#foldAll")
    pg.wait_for_timeout(200)
    pg.click("#foldNone")
    pg.wait_for_timeout(250)
    pg.reload(wait_until="domcontentloaded")
    pg.wait_for_timeout(700)
    pg.click('.tab[data-tab="trend"]')
    pg.wait_for_timeout(400)
    step("用户选择优先于默认展开", lambda: pg.evaluate("()=>document.querySelectorAll('#trend details.fold[open]').length===0"))

    # ---- 趋势图表 ----
    step("图表 canvas = 3", lambda: pg.evaluate("()=>document.querySelectorAll('#trendCharts canvas').length===3"))
    step("Chart 库已加载", lambda: pg.evaluate("()=>typeof Chart!=='undefined'"))
    step("图1 出生人口 15 点", lambda: pg.evaluate("()=>{const c=Chart.getChart('chart_birth');return !!c&&c.data.datasets[0].data.length===15;}"))
    step("图1 高亮你这一届", lambda: pg.evaluate(
        "()=>{const c=Chart.getChart('chart_birth');const b=c.data.datasets[0].backgroundColor;return b[0]!==b[1];}"))
    step("图2 高考人数 6 点", lambda: pg.evaluate("()=>{const c=Chart.getChart('chart_gaokao');return !!c&&c.data.datasets[0].data.length===6;}"))
    step("图3 含 -13 与 +20", lambda: pg.evaluate(
        "()=>{const c=Chart.getChart('chart_ai');const d=c.data.datasets[0].data;return !!c&&d.length===2&&d[0]===-13&&d[1]===20;}"))
    step("每张图都有说明/警示/口径", lambda: pg.evaluate(
        "()=>{const t=document.querySelector('#trendCharts').innerText;"
        "return (t.match(/说明什么/g)||[]).length>=3&&(t.match(/不要过度解读/g)||[]).length>=3&&(t.match(/口径/g)||[]).length>=3;}"))

    # ---- 影响层 ----
    step("每张图都有一行‘对你的影响’", lambda: pg.evaluate(
        "()=>(document.querySelector('#trendCharts').innerText.match(/对你的影响/g)||[]).length>=3"))
    step("影响条目 = 6 条", lambda: pg.evaluate("()=>document.querySelectorAll('#impactTimeline details.fold').length===6"))
    step("影响按时间点分组", lambda: pg.evaluate(
        "()=>{const w=[...document.querySelectorAll('#impactTimeline .imp-when')].map(e=>e.innerText);return w.length===4&&w[0].includes('2029')&&w.some(x=>x.includes('2033'))&&w.some(x=>x.includes('长期'));}"))
    step("影响卡含机制/经历/信号", lambda: pg.evaluate(
        "()=>{const h=document.querySelector('#impactTimeline details.fold');h.open=true;const t=h.innerText;"
        "return t.includes('机制')&&t.includes('你会经历什么')&&t.includes('待验证信号');}"))
    step("影响卡无正文重复标题", lambda: pg.evaluate(
        "()=>{const h=document.querySelector('#impactTimeline details.fold');const t=h.innerText.split('\\n');"
        "const title=h.querySelector('.fold-title').innerText;"
        "return t.filter(x=>x.trim()===title.trim()).length===1;}"))
    step("影响层有三层标签图例", lambda: pg.evaluate(
        "()=>document.querySelector('#impactTimeline').innerText.includes('已发生的事实')&&document.querySelector('#impactTimeline').innerText.includes('用来证伪或确认')"))
    step("影响层有‘不是预测’声明", lambda: pg.evaluate(
        "()=>document.querySelector('#impactTimeline').innerText.includes('不是对未来的预测')"))
    step("影响层有反焦虑声明", lambda: pg.evaluate(
        "()=>document.querySelector('#impactTimeline').innerText.includes('不是用来判断')"))
    step("影响层无行业名单", lambda: pg.evaluate(
        "()=>{const t=document.querySelector('#impactTimeline').innerText;return !t.includes('教培')&&!t.includes('地产')&&!t.includes('逆风')&&!t.includes('顺风');}"))
    step("影响层无伪精确 3—5 年", lambda: pg.evaluate(
        "()=>!document.querySelector('#impactTimeline').innerText.includes('3—5 年')"))

    pg.evaluate("""()=>{document.querySelectorAll('.res-range').forEach(el=>{el.value=5;el.dispatchEvent(new Event('input',{bubbles:true}));});}""")
    pg.wait_for_timeout(250)
    step("检查器满分 = 100", lambda: pg.evaluate("()=>document.querySelector('#resResult .res-score').innerText.includes('100')"))
    step("检查器有非排名声明", lambda: pg.evaluate("()=>document.querySelector('#resilienceTool').innerText.includes('不是专业排名')"))

    # ---- 方向反事实测试器 ----
    step("反事实四情景", lambda: pg.evaluate("()=>document.querySelectorAll('#counterfactual .cf-scen-card').length===4"))
    pg.fill("#cfDir", "临床医学")
    for s in ["aiFast", "policyCool", "supply", "region"]:
        pg.click(f'input[name="cf_{s}"][value="0"]')
        pg.wait_for_timeout(60)
    pg.click("#cfRun")
    pg.wait_for_timeout(250)
    step("反事实低分 = 意愿偏脆弱", lambda: pg.evaluate("()=>document.querySelector('#cfResult').innerText.includes('意愿偏脆弱')"))
    step("反事实四条对冲", lambda: pg.evaluate("()=>document.querySelectorAll('#cfResult .hedge-item').length===4"))
    step("反事实含不换方向提示", lambda: pg.evaluate("()=>document.querySelector('#cfResult').innerText.includes('来回摇摆')"))
    step("反事实有反误读声明", lambda: pg.evaluate(
        "()=>{const t=document.querySelector('#cfResult').innerText;return t.includes('不是专业推荐分')&&t.includes('不代表');}"))
    pg.check('#cfResult .hedge-cb[data-k="h0"]')
    pg.wait_for_timeout(200)
    pg.reload(wait_until="domcontentloaded")
    pg.wait_for_timeout(700)
    pg.click('.tab[data-tab="trend"]')
    pg.wait_for_timeout(350)
    step("反事实刷新后保留", lambda: pg.evaluate(
        "()=>{const d=JSON.parse(localStorage.getItem('gd211_counterfactual')||'{}');return d.dir==='临床医学'&&document.querySelectorAll('#cfResult .hedge-item').length===4;}"))

    # ---- 目标院校核对表 ----
    pg.click('.tab[data-tab="target"]')
    pg.wait_for_timeout(350)
    step("校核卡 = 16 所", lambda: pg.evaluate("()=>document.querySelectorAll('#schoolCheck .sc-card').length===16"))
    step("官方查询入口 = 3 且含 2027 查询系统", lambda: pg.evaluate(
        "()=>{const t=document.querySelector('#schoolCheck').innerText;"
        "return document.querySelectorAll('#schoolCheck .sc-link').length===3&&t.includes('xkcx2027')&&t.includes('考试院');}"))
    step("核对 4 件事齐全", lambda: pg.evaluate(
        "()=>{const t=document.querySelector('#schoolCheck').innerText;"
        "return t.includes('① 选科要求')&&t.includes('② 在粤投放')&&t.includes('③ 近 3 年位次')&&t.includes('④ 计划变动');}"))
    step("含'不代填'诚实声明", lambda: pg.evaluate(
        "()=>document.querySelector('#schoolCheck').innerText.includes('不代填')"))
    step("南医大不再标注双一流(P1回归)", lambda: pg.evaluate(
        "()=>{const c=[...document.querySelectorAll('#schoolCheck .sc-card')].find(x=>x.innerText.includes('南方医科大学'));"
        "return c&&c.innerText.includes('未入选双一流')&&!c.innerText.includes('211');}"))
    pg.select_option("#scTier", "双一流")
    pg.wait_for_timeout(250)
    step("层次筛选 双一流 = 1 所(华南农大)", lambda: pg.evaluate(
        "()=>{const r=[...document.querySelectorAll('#schoolCheck .sc-card')];"
        "return r.length===1&&r[0].innerText.includes('华南农业大学');}"))
    pg.select_option("#scTier", "all")
    pg.wait_for_timeout(250)
    step("理工规则禁用'基本出局'(P1回归)", lambda: pg.evaluate(
        "()=>{const t=document.querySelector('#schoolCheck').innerText;"
        "return t.includes('明显压缩')&&!t.includes('基本出局');}"))
    step("暨大提示不含推荐语义(P2回归)", lambda: pg.evaluate(
        "()=>{const c=[...document.querySelectorAll('#schoolCheck .sc-card')].find(x=>x.innerText.includes('暨南大学'));"
        "return c&&c.innerText.includes('不是推荐')&&!c.innerText.includes('目标');}"))
    step("哈工深含校区与招生代码说明(P2回归)", lambda: pg.evaluate(
        "()=>{const c=[...document.querySelectorAll('#schoolCheck .sc-card')].find(x=>x.innerText.includes('哈尔滨工业大学（深圳）'));"
        "return c&&c.innerText.includes('招生代码')&&c.innerText.includes('深圳校区');}"))
    pg.select_option("#scTier", "985")
    pg.wait_for_timeout(250)
    step("层次筛选 985 = 3 所", lambda: pg.evaluate("()=>document.querySelectorAll('#schoolCheck .sc-card').length===3"))
    pg.select_option("#scTier", "all")
    pg.select_option("#scRegion", "省外")
    pg.wait_for_timeout(250)
    step("地域筛选 省外 = 6 所", lambda: pg.evaluate("()=>document.querySelectorAll('#schoolCheck .sc-card').length===6"))
    pg.select_option("#scRegion", "all")
    pg.wait_for_timeout(250)
    boxes = pg.query_selector_all("#schoolCheck .sc-pick")
    boxes[0].check()
    boxes[3].check()
    pg.wait_for_timeout(250)
    step("勾选 2 所 → 清单 2 张", lambda: pg.evaluate("()=>document.querySelectorAll('#scChecklist .sc-check-item').length===2"))
    step("清单含 8 个填空位", lambda: pg.evaluate("()=>document.querySelectorAll('#scChecklist .sc-blank').length===8"))
    step("清单含核对字段与官方文件名", lambda: pg.evaluate(
        "()=>{const t=document.querySelector('#scChecklist').innerText;"
        "return t.includes('在粤投放')&&t.includes('近 3 年位次')&&t.includes('招生专业目录');}"))
    pg.reload(wait_until="domcontentloaded")
    pg.wait_for_timeout(700)
    pg.click('.tab[data-tab="target"]')
    pg.wait_for_timeout(350)
    step("校核勾选刷新后保留", lambda: pg.evaluate(
        "()=>{const p=JSON.parse(localStorage.getItem('gd211_schoolCheckPicks')||'[]');"
        "return p.length===2&&document.querySelectorAll('#scChecklist .sc-check-item').length===2;}"))

    # ---- 高校库 + 信息博弈 ----
    step("高校库 = 23 所", lambda: pg.evaluate("()=>document.querySelectorAll('#schoolDb #dbBody tr').length===23"))
    step("高校库含 L3 声明与更新机制", lambda: pg.evaluate(
        "()=>{const t=document.querySelector('#schoolDb').innerText;"
        "return t.includes('院校级（L3）')&&t.includes('变化记录')&&t.includes('宁缺毋滥');}"))
    step("高校库含口径标注列", lambda: pg.evaluate(
        "()=>document.querySelector('#schoolDb').innerText.includes('口径标注')"))
    step("高校库变化记录 = 3 条院校", lambda: pg.evaluate(
        "()=>document.querySelectorAll('#schoolDb .db-ch').length===3"))
    step("高校库无位次行显示待收录", lambda: pg.evaluate(
        "()=>document.querySelector('#schoolDb').innerText.includes('待收录')"))
    step("高校库显示最近核验日期", lambda: pg.evaluate(
        "()=>{const t=document.querySelector('#schoolDb').innerText;"
        "return t.includes('最近核验')&&t.includes('2026-09-14');}"))
    step("高校库含'不代表该校没有发生变化'", lambda: pg.evaluate(
        "()=>document.querySelector('#schoolDb').innerText.includes('不代表该校没有发生变化')"))
    step("高校库 asOf 区分数据日期与核验日期", lambda: pg.evaluate(
        "()=>document.querySelectorAll('#schoolDb .db-verify').length===18"))
    step("高校库含记录数统计条", lambda: pg.evaluate(
        "()=>{const t=document.querySelector('#schoolDb').innerText;return t.includes('已记录变化')&&t.includes('收录院校');}"))
    pg.select_option("#dbTier", "985")
    pg.wait_for_timeout(250)
    step("高校库筛选 985 = 12 所", lambda: pg.evaluate("()=>document.querySelectorAll('#schoolDb #dbBody tr').length===12"))
    pg.select_option("#dbTier", "all")
    pg.wait_for_timeout(250)
    pg.click('.tab[data-tab="paths"]')
    pg.wait_for_timeout(350)
    step("博弈卡 = 4 张", lambda: pg.evaluate("()=>document.querySelectorAll('#pathGame .pg-card').length===4"))
    step("博弈含信息源/胜率动作/运气/陷阱", lambda: pg.evaluate(
        "()=>{const t=document.querySelector('#pathGame').innerText;"
        "return t.includes('信息源')&&t.includes('胜率动作')&&t.includes('运气成分')&&t.includes('常见陷阱');}"))
    step("博弈纪律含主路径声明", lambda: pg.evaluate(
        "()=>document.querySelector('#pathGame').innerText.includes('普通高考永远是主路径')"))
    step("博弈含信息更新机制(3–5月)", lambda: pg.evaluate(
        "()=>document.querySelector('#pathGame').innerText.includes('3–5 月')"))
    step("博弈含'不是赌博'限定(P1回归)", lambda: pg.evaluate(
        "()=>document.querySelector('#pathGame').innerText.includes('不是赌博')"))
    step("博弈含不确定性管理解释(P1回归)", lambda: pg.evaluate(
        "()=>document.querySelector('#pathGame').innerText.includes('不确定性管理')"))
    step("博弈纪律③含'公开、合规'(P2回归)", lambda: pg.evaluate(
        "()=>{const t=document.querySelector('#pathGame').innerText;"
        "return t.includes('公开、合规')&&!t.includes('只赚');}"))
    step("综评卡含当年简章边界(P1回归)", lambda: pg.evaluate(
        "()=>{const c=[...document.querySelectorAll('#pathGame .pg-card')].find(x=>x.innerText.includes('综合评价'));"
        "return c&&c.innerText.includes('以当年简章为准')&&c.innerText.includes('均可能逐年变化');}"))
    step("专项卡含'统一固定降分'否定(P1回归)", lambda: pg.evaluate(
        "()=>{const c=[...document.querySelectorAll('#pathGame .pg-card')].find(x=>x.innerText.includes('专项'));"
        "return c&&c.innerText.includes('统一固定降分政策')&&c.innerText.includes('符合资格 ≠');}"))

    pg.evaluate("()=>Object.keys(localStorage).filter(k=>k.startsWith('gd211_')).forEach(k=>localStorage.removeItem(k));")
    b.close()

print("=" * 62)
ok = 0
for n, p_, m in results:
    ok += 1 if p_ else 0
print(f"{ok}/{len(results)} passed | console errors: {len(errors)}")
for e in errors[:6]:
    print("  !", e)
if leaks:
    print("HTML 泄漏详情:", leaks)
sys.exit(0 if ok == len(results) and not errors else 1)
