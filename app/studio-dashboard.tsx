import {
  ArrowRight, ArrowUpRight, BookOpen, Bookmark, Brain, ChevronRight,
  FileHeart, HeartPulse, LayoutGrid, Lightbulb, MousePointer2,
  ScanLine, ShieldCheck, Sparkles, Stethoscope, Wind,
} from "lucide-react";
import { APP_VERSION } from "./version";

interface Props {
  pieces: number;
  systems: number;
  model: "male" | "female";
  ready: boolean;
  online: boolean;
  reportOpen: boolean;
  savedOpen: boolean;
  hideGuide: boolean;
  onHome: () => void;
  onReport: () => void;
  onSaved: () => void;
  onAbout: () => void;
  onExplore: (name: string) => void;
}

export default function StudioDashboard({
  pieces, systems, model, ready, online, reportOpen, savedOpen, hideGuide,
  onHome, onReport, onSaved, onAbout, onExplore,
}: Props) {
  return (
    <>
      <div className="sidebar-surface" aria-hidden="true" />
      <nav className="workspace-nav" aria-label="Workspace navigation">
        <span className="nav-caption">YOUR WORKSPACE</span>
        <button className={!reportOpen && !savedOpen ? "nav-item selected" : "nav-item"} onClick={onHome} aria-current={!reportOpen && !savedOpen ? "page" : undefined}>
          <LayoutGrid size={18} /><span>Anatomy explorer</span><ChevronRight size={15} />
        </button>
        <button className={`nav-item ${reportOpen ? "selected" : ""}`} onClick={onReport} aria-current={reportOpen ? "page" : undefined}>
          <FileHeart size={18} /><span>Report explorer</span><span className="nav-new">NEW</span>
        </button>
        <button className={`nav-item ${savedOpen ? "selected" : ""}`} onClick={onSaved}>
          <Bookmark size={18} /><span>Saved views</span>
        </button>
      </nav>

      <div className="sidebar-bottom">
        <div className="learning-note"><span className="learning-icon"><BookOpen size={17} /></span><div><strong>A little more understanding.</strong><p>Explore freely. Learn at your pace.</p></div></div>
        <button className="sidebar-about" onClick={onAbout}><ShieldCheck size={15} /><span>About the atlas & sources</span><ArrowUpRight size={14} /></button>
        <div className="workspace-status"><span className={online ? "connection-dot" : "connection-dot offline"} />{online ? "Your exploration starts here" : "Exploring offline"}<span>v{APP_VERSION}</span></div>
      </div>

      <div className="workspace-bar"><span>Workspace</span><ChevronRight size={13} /><strong>{reportOpen ? "Report explorer" : "Anatomy explorer"}</strong></div>
      <section className="workspace-intro" aria-label="Welcome to your anatomy workspace">
        <div className="intro-eyebrow"><span />THE WONDER WITHIN</div>
        <h2>Meet your body. <em>Make the connections.</em></h2>
        <p>Explore human anatomy, understand your reports, and see the bigger picture.</p>
      </section>
      <div className="workspace-stats" aria-label="Atlas at a glance">
        <div><strong>{pieces.toLocaleString()}</strong><span>3D structures</span></div>
        <div><strong>{systems}</strong><span>body systems</span></div>
        <div><strong>8</strong><span>languages</span></div>
      </div>

      <div className="canvas-heading">
        <div><ScanLine size={18} /><strong>Human anatomy</strong><span className="canvas-live"><span />{ready ? "INTERACTIVE 3D" : "LOADING MODEL"}</span></div>
        <p>One body. Thousands of connections.</p>
      </div>
      <div className="canvas-caption"><span className="model-indicator" />{model === "male" ? "Male reference model" : "Female reference · Experimental"}<span className="caption-divider" />{pieces.toLocaleString()} modeled pieces</div>
      <div className="canvas-hint"><MousePointer2 size={13} /> Select a structure to discover more</div>

      {!hideGuide && (
        <aside className="discovery-rail" aria-label="Discover more">
          <section className="report-invitation">
            <div className="report-orbit" aria-hidden="true"><Stethoscope size={68} strokeWidth={1} /></div>
            <div className="invitation-eyebrow"><Sparkles size={13} /> A LITTLE CLARITY GOES A LONG WAY</div>
            <span className="report-card-icon"><FileHeart size={23} strokeWidth={1.5} /></span>
            <h3>Your report.<br />A clearer picture.</h3>
            <p>Turn medical terms into understanding. See findings connected to your anatomy.</p>
            <button className="report-cta" onClick={onReport}>Explore a report <ArrowRight size={16} /></button>
            <div className="report-card-foot">PDF reports <span>·</span> 8 Indian languages</div>
          </section>

          <section className="quick-discover">
            <div className="discover-heading"><h3>Start with a little curiosity</h3><span>01—03</span></div>
            <p>A few remarkable places to explore.</p>
            {[
              { name: "Heart", query: "heart", description: "The rhythm of your body", Icon: HeartPulse, tone: "rose" },
              { name: "Brain", query: "brain", description: "Your body's command center", Icon: Brain, tone: "ochre" },
              { name: "Lungs", query: "lung", description: "Room for every breath", Icon: Wind, tone: "teal" },
            ].map(({ name, query, description, Icon, tone }) => (
              <button className="discover-structure" key={name} onClick={() => onExplore(query)} disabled={!ready}>
                <span className={`discovery-icon ${tone}`}><Icon size={22} strokeWidth={1.5} /></span>
                <span><strong>{name}</strong><small>{description}</small></span><ArrowUpRight size={16} />
              </button>
            ))}
          </section>
          <div className="exploration-tip"><Lightbulb size={17} /><p><strong>Look beneath the surface.</strong> Switch off a body system to uncover what lies underneath.</p></div>
        </aside>
      )}
    </>
  );
}
