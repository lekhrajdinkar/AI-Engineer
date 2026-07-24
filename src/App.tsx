import { useEffect, useState, type ReactNode } from 'react';
import { chooseImage, isNative, loadIntention, saveIntention, shareReflection } from './native';

type IconName = 'home' | 'journal' | 'plus' | 'insights' | 'profile' | 'camera' | 'share' | 'spark';

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5M9.5 20v-6h5v6"/></>,
    journal: <><path d="M5 3.5h11a3 3 0 0 1 3 3V21H7a2 2 0 0 1-2-2V3.5Z"/><path d="M8 7h7M8 11h7M7 17h12"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    insights: <><path d="M5 19V9M12 19V4M19 19v-7"/></>,
    profile: <><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></>,
    camera: <><path d="M3 8h4l1.5-2h7L17 8h4v11H3Z"/><circle cx="12" cy="13" r="3.5"/></>,
    share: <><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"/></>,
    spark: <path d="m12 2 1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5L12 2Z"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const days = ['20', '21', '22', '23', '24', '25', '26'];

export function App() {
  const [intention, setIntention] = useState('Move with intention, not urgency.');
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [image, setImage] = useState<string>();
  const [toast, setToast] = useState<string>();

  useEffect(() => { void loadIntention().then(setIntention); }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(undefined), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function commitIntention() {
    const next = draft.trim();
    if (next) {
      setIntention(next);
      await saveIntention(next);
      setToast('Intention saved');
    }
    setEditing(false);
  }

  async function addPhoto() {
    try {
      setImage(await chooseImage());
    } catch {
      setToast('Photo selection cancelled');
    }
  }

  async function share() {
    try {
      await shareReflection(`Today’s intention: ${intention}\n\nA quiet moment, kept with Daymark.`);
      setToast(isNative ? 'Shared' : 'Ready to share');
    } catch {
      setToast('Sharing cancelled');
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">THURSDAY, JULY 23</p>
          <h1>Good morning, Alex.</h1>
        </div>
        <button className="avatar" onClick={() => void addPhoto()} aria-label="Choose profile photo">
          {image ? <img src={image} alt="Profile" /> : <span>AM</span>}
          <i><Icon name="camera" size={12}/></i>
        </button>
      </header>

      <section className="week" aria-label="Week overview">
        {weekdays.map((day, index) => (
          <button className={index === 3 ? 'selected' : ''} key={`${day}-${index}`} aria-label={`July ${days[index]}`}>
            <span>{day}</span><strong>{days[index]}</strong>{index < 3 && <em />}
          </button>
        ))}
      </section>

      <section className="intention-card">
        <div className="card-label"><Icon name="spark" size={16}/> TODAY’S INTENTION</div>
        {editing ? (
          <form onSubmit={(event) => { event.preventDefault(); void commitIntention(); }}>
            <input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={90} aria-label="Today's intention" />
            <button type="submit">Save</button>
          </form>
        ) : (
          <button className="intention-copy" onClick={() => { setDraft(intention); setEditing(true); }}>
            “{intention}” <span>Edit</span>
          </button>
        )}
      </section>

      <div className="section-heading"><div><p>YOUR DAY</p><h2>Small moments matter.</h2></div><button onClick={() => void share()} aria-label="Share today's reflection"><Icon name="share"/></button></div>

      <section className="moments">
        <article className="moment-card sun-card">
          <div className="sun-art"><div className="sun"/><div className="ridge one"/><div className="ridge two"/></div>
          <div className="moment-body"><span>7:18 AM</span><h3>Morning light</h3><p>You paused for 8 minutes before the day began.</p></div>
        </article>
        <article className="moment-card note-card">
          <div className="quote-mark">“</div>
          <blockquote>The quieter you become, the more you are able to hear.</blockquote>
          <p>— RUMI</p><span>Saved yesterday</span>
        </article>
      </section>

      <button className="reflection" onClick={() => { setDraft(''); setEditing(true); }}>
        <span className="reflection-icon"><Icon name="plus"/></span>
        <span><strong>Add a reflection</strong><small>Capture what’s on your mind</small></span>
        <b>›</b>
      </button>

      <nav className="tabbar" aria-label="Primary navigation">
        <button className="active"><Icon name="home"/><span>Today</span></button>
        <button><Icon name="journal"/><span>Journal</span></button>
        <button className="add" onClick={() => { setDraft(''); setEditing(true); }} aria-label="Add reflection"><Icon name="plus" size={28}/></button>
        <button><Icon name="insights"/><span>Insights</span></button>
        <button><Icon name="profile"/><span>Profile</span></button>
      </nav>
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
