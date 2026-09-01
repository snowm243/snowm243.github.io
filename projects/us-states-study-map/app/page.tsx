'use client';

import { useMemo, useState } from 'react';
import { geoAlbersUsa, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import statesAtlas from 'us-atlas/states-10m.json';
import type { Feature, Geometry } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import {
  Map as MapIcon,
  MousePointer2,
  Printer,
  RotateCcw,
  Tags,
  Target,
  Volume2,
  VolumeX,
} from 'lucide-react';

import { Button } from '@/components/ui/button';

type RegionKey = 'west' | 'northeast' | 'midwest' | 'south';
type StateInfo = { abbreviation: string; chinese: string; region: RegionKey };
type StateFeature = Feature<Geometry, { name: string }>;

const STATES: Record<string, StateInfo> = {
  Alabama: { abbreviation: 'AL', chinese: '阿拉巴马州', region: 'south' },
  Alaska: { abbreviation: 'AK', chinese: '阿拉斯加州', region: 'west' },
  Arizona: { abbreviation: 'AZ', chinese: '亚利桑那州', region: 'west' },
  Arkansas: { abbreviation: 'AR', chinese: '阿肯色州', region: 'south' },
  California: { abbreviation: 'CA', chinese: '加利福尼亚州', region: 'west' },
  Colorado: { abbreviation: 'CO', chinese: '科罗拉多州', region: 'west' },
  Connecticut: { abbreviation: 'CT', chinese: '康涅狄格州', region: 'northeast' },
  Delaware: { abbreviation: 'DE', chinese: '特拉华州', region: 'northeast' },
  Florida: { abbreviation: 'FL', chinese: '佛罗里达州', region: 'south' },
  Georgia: { abbreviation: 'GA', chinese: '乔治亚州', region: 'south' },
  Hawaii: { abbreviation: 'HI', chinese: '夏威夷州', region: 'west' },
  Idaho: { abbreviation: 'ID', chinese: '爱达荷州', region: 'west' },
  Illinois: { abbreviation: 'IL', chinese: '伊利诺伊州', region: 'midwest' },
  Indiana: { abbreviation: 'IN', chinese: '印第安纳州', region: 'midwest' },
  Iowa: { abbreviation: 'IA', chinese: '艾奥瓦州', region: 'midwest' },
  Kansas: { abbreviation: 'KS', chinese: '堪萨斯州', region: 'midwest' },
  Kentucky: { abbreviation: 'KY', chinese: '肯塔基州', region: 'south' },
  Louisiana: { abbreviation: 'LA', chinese: '路易斯安那州', region: 'south' },
  Maine: { abbreviation: 'ME', chinese: '缅因州', region: 'northeast' },
  Maryland: { abbreviation: 'MD', chinese: '马里兰州', region: 'northeast' },
  Massachusetts: { abbreviation: 'MA', chinese: '马萨诸塞州', region: 'northeast' },
  Michigan: { abbreviation: 'MI', chinese: '密歇根州', region: 'midwest' },
  Minnesota: { abbreviation: 'MN', chinese: '明尼苏达州', region: 'midwest' },
  Mississippi: { abbreviation: 'MS', chinese: '密西西比州', region: 'south' },
  Missouri: { abbreviation: 'MO', chinese: '密苏里州', region: 'midwest' },
  Montana: { abbreviation: 'MT', chinese: '蒙大拿州', region: 'west' },
  Nebraska: { abbreviation: 'NE', chinese: '内布拉斯加州', region: 'midwest' },
  Nevada: { abbreviation: 'NV', chinese: '内华达州', region: 'west' },
  'New Hampshire': { abbreviation: 'NH', chinese: '新罕布什尔州', region: 'northeast' },
  'New Jersey': { abbreviation: 'NJ', chinese: '新泽西州', region: 'northeast' },
  'New Mexico': { abbreviation: 'NM', chinese: '新墨西哥州', region: 'west' },
  'New York': { abbreviation: 'NY', chinese: '纽约州', region: 'northeast' },
  'North Carolina': { abbreviation: 'NC', chinese: '北卡罗来纳州', region: 'south' },
  'North Dakota': { abbreviation: 'ND', chinese: '北达科他州', region: 'midwest' },
  Ohio: { abbreviation: 'OH', chinese: '俄亥俄州', region: 'midwest' },
  Oklahoma: { abbreviation: 'OK', chinese: '俄克拉荷马州', region: 'south' },
  Oregon: { abbreviation: 'OR', chinese: '俄勒冈州', region: 'west' },
  Pennsylvania: { abbreviation: 'PA', chinese: '宾夕法尼亚州', region: 'northeast' },
  'Rhode Island': { abbreviation: 'RI', chinese: '罗德岛州', region: 'northeast' },
  'South Carolina': { abbreviation: 'SC', chinese: '南卡罗来纳州', region: 'south' },
  'South Dakota': { abbreviation: 'SD', chinese: '南达科他州', region: 'midwest' },
  Tennessee: { abbreviation: 'TN', chinese: '田纳西州', region: 'south' },
  Texas: { abbreviation: 'TX', chinese: '得克萨斯州', region: 'south' },
  Utah: { abbreviation: 'UT', chinese: '犹他州', region: 'west' },
  Vermont: { abbreviation: 'VT', chinese: '佛蒙特州', region: 'northeast' },
  Virginia: { abbreviation: 'VA', chinese: '弗吉尼亚州', region: 'south' },
  Washington: { abbreviation: 'WA', chinese: '华盛顿州', region: 'west' },
  'West Virginia': { abbreviation: 'WV', chinese: '西弗吉尼亚州', region: 'south' },
  Wisconsin: { abbreviation: 'WI', chinese: '威斯康星州', region: 'midwest' },
  Wyoming: { abbreviation: 'WY', chinese: '怀俄明州', region: 'west' },
};

const REGIONS: Record<RegionKey, { label: string; color: string }> = {
  west: { label: '西部 West', color: '#4f7c73' },
  northeast: { label: '东北部 Northeast', color: '#d36f55' },
  midwest: { label: '中西部 Midwest', color: '#d4a62a' },
  south: { label: '南部 South', color: '#4f6f9f' },
};

const atlas = statesAtlas as unknown as Topology<{
  states: GeometryCollection<{ name: string }>;
}>;

const FEATURES = feature(atlas, atlas.objects.states).features.filter(
  (state) => state.properties?.name && STATES[state.properties.name],
) as StateFeature[];

function speak(text: string, enabled: boolean) {
  if (!enabled || typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.82;
  window.speechSynthesis.speak(utterance);
}

function nextTarget(current: string | null) {
  const names = Object.keys(STATES).filter((name) => name !== current);
  return names[Math.floor(Math.random() * names.length)];
}

export default function Home() {
  const [showLabels, setShowLabels] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [quizMode, setQuizMode] = useState(false);
  const [quizTarget, setQuizTarget] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; correct: boolean } | null>(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [wrongState, setWrongState] = useState<string | null>(null);

  const projection = useMemo(() => geoAlbersUsa().scale(1_285).translate([480, 300]), []);
  const path = useMemo(() => geoPath(projection), [projection]);

  function resetQuiz() {
    setScore(0);
    setAttempts(0);
    setFeedback(null);
    setWrongState(null);
    const target = nextTarget(null);
    setQuizTarget(target);
    speak(target, soundOn);
  }

  function toggleQuiz() {
    const entering = !quizMode;
    setQuizMode(entering);
    setSelected(null);
    setHovered(null);
    setFeedback(null);
    setWrongState(null);
    if (entering) {
      setScore(0);
      setAttempts(0);
      const target = nextTarget(null);
      setQuizTarget(target);
      speak(target, soundOn);
    } else {
      setQuizTarget(null);
    }
  }

  function chooseState(name: string) {
    if (!quizMode) {
      setSelected(name);
      speak(name, soundOn);
      return;
    }

    if (!quizTarget || feedback?.correct) return;
    setAttempts((value) => value + 1);
    if (name === quizTarget) {
      setScore((value) => value + 1);
      setFeedback({ text: '正确！太棒了！ Correct!', correct: true });
      setWrongState(null);
      speak(`Correct! ${name}`, soundOn);
      window.setTimeout(() => {
        const target = nextTarget(quizTarget);
        setQuizTarget(target);
        setFeedback(null);
        speak(target, soundOn);
      }, 900);
    } else {
      setFeedback({ text: `那是 ${name}，再试试！`, correct: false });
      setWrongState(name);
      speak(`That is ${name}. Try again.`, soundOn);
      window.setTimeout(() => setWrongState(null), 700);
    }
  }

  const activeName = hovered ?? selected;
  const activeInfo = activeName ? STATES[activeName] : null;
  const quizInfo = quizTarget ? STATES[quizTarget] : null;

  return (
    <main className="site-shell">
      <header className="masthead">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true"><MapIcon /></span>
          <div>
            <p className="eyebrow">Bilingual geography lab</p>
            <h1>美国各州学习地图</h1>
          </div>
        </div>

        <nav className="toolbar" aria-label="学习工具">
          <Button variant={showLabels ? 'default' : 'outline'} size="lg" aria-pressed={showLabels} onClick={() => setShowLabels((value) => !value)}>
            <Tags /> {showLabels ? '隐藏缩写' : '显示缩写'}
          </Button>
          <Button variant={soundOn ? 'default' : 'outline'} size="lg" aria-pressed={soundOn} onClick={() => { const enabled = !soundOn; setSoundOn(enabled); speak('Sound on', enabled); }}>
            {soundOn ? <Volume2 /> : <VolumeX />} {soundOn ? '朗读已开' : '开启朗读'}
          </Button>
          <Button variant={quizMode ? 'default' : 'outline'} size="lg" aria-pressed={quizMode} onClick={toggleQuiz}>
            <Target /> {quizMode ? '退出测验' : '开始测验'}
          </Button>
          <Button className="print-button" variant="outline" size="lg" onClick={() => window.print()}>
            <Printer /> 打印
          </Button>
        </nav>
      </header>

      <section className="study-grid">
        <div className="map-card">
          <div className="map-card-heading">
            <div>
              <p className="section-kicker">50 STATES · 4 REGIONS</p>
              <h2>{quizMode ? '找出正确的州' : '点击地图，认识美国各州'}</h2>
            </div>
            <div className="interaction-hint"><MousePointer2 /> 支持点击与键盘操作</div>
          </div>

          {quizMode && quizTarget && quizInfo && (
            <div className="quiz-prompt" aria-live="polite">
              <div>
                <span className="quiz-label">请点击 · FIND</span>
                <strong>{quizTarget}</strong>
                <span>{quizInfo.abbreviation} · {quizInfo.chinese}</span>
              </div>
              <div className="score-card">
                <span>得分 SCORE</span>
                <strong>{score}<small> / {attempts}</small></strong>
              </div>
              <Button variant="ghost" size="icon-lg" aria-label="重置测验" title="重置测验" onClick={resetQuiz}><RotateCcw /></Button>
            </div>
          )}

          <div className="map-stage">
            <svg className="us-map" viewBox="0 0 960 600" role="group" aria-label="美国五十州互动地图">
              <g>
                {FEATURES.map((state) => {
                  const name = state.properties.name;
                  const info = STATES[name];
                  const [cx, cy] = path.centroid(state);
                  const isActive = selected === name || hovered === name;
                  const isCorrect = feedback?.correct && quizTarget === name;
                  const fill = isCorrect ? '#2f8b65' : wrongState === name ? '#c84d45' : REGIONS[info.region].color;
                  return (
                    <g key={name}>
                      <path
                        d={path(state) ?? undefined}
                        fill={fill}
                        className={`state-shape${isActive ? ' is-active' : ''}`}
                        role="button"
                        tabIndex={0}
                        aria-label={`${name}, ${info.abbreviation}, ${info.chinese}`}
                        onMouseEnter={() => !quizMode && setHovered(name)}
                        onMouseLeave={() => setHovered(null)}
                        onFocus={() => !quizMode && setHovered(name)}
                        onBlur={() => setHovered(null)}
                        onClick={() => chooseState(name)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            chooseState(name);
                          }
                        }}
                      />
                      {showLabels && Number.isFinite(cx) && Number.isFinite(cy) && <text className="state-abbreviation" x={cx} y={cy}>{info.abbreviation}</text>}
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          {feedback && <p className={`feedback ${feedback.correct ? 'correct' : 'wrong'}`} role="status">{feedback.text}</p>}
        </div>

        <aside className="learning-panel" aria-live="polite">
          <div className="panel-heading"><span>STATE NOTES</span><h2>州名学习卡</h2></div>
          {activeName && activeInfo ? (
            <div className="state-card">
              <div className="abbr-medallion" style={{ background: REGIONS[activeInfo.region].color }}>{activeInfo.abbreviation}</div>
              <p className="english-name">{activeName}</p>
              <p className="chinese-name">{activeInfo.chinese}</p>
              <div className="region-pill"><span style={{ background: REGIONS[activeInfo.region].color }} />{REGIONS[activeInfo.region].label}</div>
              <p className="pronunciation-tip">开启朗读后，点击州即可听英文发音。</p>
            </div>
          ) : (
            <div className="empty-card">
              <MapIcon /><p>从地图开始</p><span>点击或聚焦任意州，查看英文全称、缩写、中文名与所属区域。</span>
            </div>
          )}
          <div className="legend">
            <p>区域图例 · REGIONS</p>
            {Object.entries(REGIONS).map(([key, region]) => <div key={key}><span style={{ background: region.color }} />{region.label}</div>)}
          </div>
        </aside>
      </section>

      <footer><span>Study tip</span> 先隐藏缩写自测，再开启标签核对答案。</footer>
    </main>
  );
}
