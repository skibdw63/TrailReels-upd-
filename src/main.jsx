import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { supabase, hasSupabase, ownerEmail } from "./supabase";
import "./styles.css";

const sampleVideos = [
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  "https://media.w3.org/2010/05/sintel/trailer.mp4"
];

const demoProfiles = [
  { id:"owner-demo", email:ownerEmail, username:"trailowner", display_name:"TrailReels Owner", role:"owner", creator_type:"music", bio:"Founder of TrailReels. Creator of Memories, Trails, Reelers, and Archive systems." },
  { id:"music-demo", email:"dream@trailreels.app", username:"dreamwaves", display_name:"DreamWaves", role:"reeler", creator_type:"music", bio:"Music Reeler. Soft memory loops and sunset edits." },
  { id:"archive-demo", email:"archive@trailreels.app", username:"oldtapes94", display_name:"OldTapes94", role:"reeler", creator_type:"archive", bio:"Recovering forgotten clips and old-drive vibes." }
];

const demoPosts = [
  { id:"post-demo-1", author_id:"music-demo", type:"reel", title:"Blissful Memory Loop", caption:"A soft emotional memory edit.", video_url:sampleVideos[0], echoes:1421 },
  { id:"post-demo-2", author_id:"owner-demo", type:"premiere", title:"The First TrailReels Premiere", caption:"A long Trail premiere with trailer, chat, and gifts.", video_url:sampleVideos[1], echoes:7300 },
  { id:"post-demo-3", author_id:"archive-demo", type:"trail", title:"Recovered School Drive Clip", caption:"Old file feeling. Not full horror, just nostalgic.", video_url:sampleVideos[0], echoes:889 }
];

const creatorIcons = { music:"♪", archive:"▣", film:"🎥", art:"🎨", gaming:"🎮", none:"" };

function App(){
  const [page,setPage] = useState("feed");
  const [session,setSession] = useState(null);
  const [profile,setProfile] = useState(null);
  const [profiles,setProfiles] = useState(demoProfiles);
  const [posts,setPosts] = useState(demoPosts);
  const [reports,setReports] = useState([]);
  const [gifts,setGifts] = useState([]);
  const [toast,setToast] = useState("");
  const [blissPlaying,setBlissPlaying] = useState(false);
  const blissRef = useRef(null);

  const isOnline = hasSupabase;
  const canPanel = profile && ["owner","admin","moderator"].includes(profile.role);

  useEffect(()=>{ init(); },[]);

  async function init(){
    if(!hasSupabase){
      setProfile(demoProfiles[0]);
      return;
    }
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if(data.session?.user) await loadOnline(data.session.user);
    supabase.auth.onAuthStateChange(async (_event, newSession)=>{
      setSession(newSession);
      if(newSession?.user) await loadOnline(newSession.user);
      else setProfile(null);
    });
  }

  async function loadOnline(user){
    let { data: existing } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if(!existing){
      const username = (user.email || "user").split("@")[0].replace(/[^a-zA-Z0-9_]/g,"").toLowerCase() + Math.floor(Math.random()*999);
      const newProfile = {
        id:user.id,
        email:user.email,
        username,
        display_name:username,
        role:user.email === ownerEmail ? "owner" : "user",
        creator_type:user.email === ownerEmail ? "music" : "none",
        bio:"New TrailReels user."
      };
      await supabase.from("profiles").insert(newProfile);
      existing = newProfile;
    }
    setProfile(existing);
    await refreshOnline();
  }

  async function refreshOnline(){
    const [{data:pfs},{data:pts},{data:rps},{data:gfs}] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at",{ascending:false}),
      supabase.from("posts").select("*").order("created_at",{ascending:false}),
      supabase.from("reports").select("*").order("created_at",{ascending:false}),
      supabase.from("gifts").select("*").order("created_at",{ascending:false})
    ]);
    setProfiles(pfs?.length ? pfs : demoProfiles);
    setPosts(pts?.length ? pts : demoPosts);
    setReports(rps || []);
    setGifts(gfs || []);
  }

  function showToast(msg){
    setToast(msg);
    setTimeout(()=>setToast(""),1800);
  }

  async function signUp(){
    if(!hasSupabase) return showToast("Demo mode: Supabase not connected yet.");
    const email = prompt("Email?");
    const password = prompt("Password? Minimum 6 characters.");
    if(!email || !password) return;
    const { error } = await supabase.auth.signUp({ email, password });
    if(error) showToast(error.message);
    else showToast("Account created. Check email if Supabase asks confirmation.");
  }

  async function logIn(){
    if(!hasSupabase) return showToast("Demo mode: Supabase not connected yet.");
    const email = prompt("Email?");
    const password = prompt("Password?");
    if(!email || !password) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if(error) showToast(error.message);
    else showToast("Logged in.");
  }

  async function logOut(){
    if(hasSupabase) await supabase.auth.signOut();
    setProfile(hasSupabase ? null : demoProfiles[0]);
  }

  async function uploadPost(type="reel"){
    if(!profile) return showToast("Log in first.");
    const title = prompt(type === "trail" ? "Trail title?" : "Reel title?");
    if(!title) return;
    const caption = prompt("Caption?") || "";
    const video_url = prompt("Video URL ending in .mp4? Leave blank for sample video.") || sampleVideos[type==="trail" ? 1 : 0];
    const post = { author_id:profile.id, type, title, caption, video_url, echoes:0 };
    if(hasSupabase){
      const { error } = await supabase.from("posts").insert(post);
      if(error) return showToast(error.message);
      await refreshOnline();
    } else {
      setPosts([{...post,id:crypto.randomUUID()},...posts]);
    }
    showToast("Uploaded.");
  }

  async function reportPost(post){
    if(!profile) return showToast("Log in first.");
    const reason = prompt("Why are you reporting this?");
    if(!reason) return;
    const report = { reporter_id:profile.id, target_type:"post", target_id:post.id, reason };
    if(hasSupabase){
      const { error } = await supabase.from("reports").insert(report);
      if(error) return showToast(error.message);
      await refreshOnline();
    } else {
      setReports([{...report,id:crypto.randomUUID(), created_at:new Date().toISOString()},...reports]);
    }
    showToast("Report sent to Owner Panel.");
  }

  async function sendGift(post){
    if(!profile) return showToast("Log in first.");
    const message = prompt("Super Echo message?") || "This Trail is amazing!";
    const gift_name = prompt("Gift name?", "🌅 Super Echo") || "🌅 Super Echo";
    const echoes_spent = Number(prompt("Echoes spent?", "100") || 100);
    const gift = { sender_id:profile.id, post_id:post.id, gift_name, message, echoes_spent };
    if(hasSupabase){
      const { error } = await supabase.from("gifts").insert(gift);
      if(error) return showToast(error.message);
      await refreshOnline();
    } else {
      setGifts([{...gift,id:crypto.randomUUID(), created_at:new Date().toISOString()},...gifts]);
    }
    showToast("Gift sent.");
  }

  function playBliss(){
    const audio = blissRef.current;
    if(!audio) return;
    if(audio.paused){
      audio.play().then(()=>setBlissPlaying(true)).catch(()=>showToast("Tap again if browser blocked autoplay."));
    } else {
      audio.pause();
      setBlissPlaying(false);
    }
  }

  return (
    <div>
      <audio ref={blissRef} src="/bliss.mp3" onEnded={()=>setBlissPlaying(false)} />
      {toast && <div className="toast">{toast}</div>}

      <header className="header">
        <div>
          <div className="logo">▶ TrailReels</div>
          <div className="small">{isOnline ? "Online Supabase mode" : "Demo mode — connect Supabase for global data"}</div>
        </div>
        <div className="topActions">
          {profile ? <button onClick={()=>setPage("profile")}>@{profile.username}</button> : <button onClick={logIn}>Log in</button>}
          {hasSupabase && <button onClick={profile ? logOut : signUp}>{profile ? "Log out" : "Sign up"}</button>}
        </div>
      </header>

      <main className="container">
        {page==="feed" && <Feed posts={posts} profiles={profiles} reportPost={reportPost} sendGift={sendGift} uploadPost={uploadPost} />}
        {page==="memories" && <Memories playBliss={playBliss} blissPlaying={blissPlaying} />}
        {page==="live" && <Live gifts={gifts} posts={posts} sendGift={sendGift} />}
        {page==="reelers" && <Reelers profiles={profiles} reportProfile={(p)=>showToast("Report Reeler feature ready: "+p.username)} />}
        {page==="panel" && <Panel canPanel={canPanel} reports={reports} gifts={gifts} profiles={profiles} posts={posts} />}
        {page==="profile" && <Profile profile={profile} uploadPost={uploadPost} />}
      </main>

      <nav className="nav">
        <button className={page==="feed"?"active":""} onClick={()=>setPage("feed")}>🏠 Feed</button>
        <button className={page==="memories"?"active":""} onClick={()=>setPage("memories")}>🕰 Memories</button>
        <button className={page==="live"?"active":""} onClick={()=>setPage("live")}>🎁 Live</button>
        <button className={page==="reelers"?"active":""} onClick={()=>setPage("reelers")}>🎥 Reelers</button>
        {canPanel && <button className={page==="panel"?"active":""} onClick={()=>setPage("panel")}>👑 Panel</button>}
      </nav>
    </div>
  );
}

function Avatar({ profile }){
  if(!profile) return null;
  return (
    <div className={"avatar "+(profile.role==="owner"?"owner":"")}>
      {(profile.display_name || profile.username || "?")[0].toUpperCase()}
      {profile.role==="owner" && <div className="crown">♛</div>}
      {profile.role==="admin" && <div className="hammer">🔨</div>}
      {profile.creator_type && profile.creator_type !== "none" && <div className="creator">{creatorIcons[profile.creator_type] || "✓"}</div>}
    </div>
  );
}

function VideoPlayer({ post }){
  const videoRef = useRef(null);
  const [playing,setPlaying] = useState(false);
  function toggle(){
    const v = videoRef.current;
    if(!v) return;
    if(v.paused){
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }
  return (
    <div className="videoWrap">
      <video ref={videoRef} src={post.video_url} playsInline onPause={()=>setPlaying(false)} onPlay={()=>setPlaying(true)} />
      <button className="playBtn" onClick={toggle}>{playing ? "⏸" : "▶"}</button>
      <div className="tag">{post.type.toUpperCase()}</div>
    </div>
  );
}

function Feed({ posts, profiles, reportPost, sendGift, uploadPost }){
  return (
    <section>
      <div className="card">
        <div className="hero">TrailReels</div>
        <p>Real video player preview, online-ready accounts, Memories audio, gifts, premieres, and owner tools.</p>
        <button className="primary" onClick={()=>uploadPost("reel")}>Upload Reel</button>{" "}
        <button className="primary" onClick={()=>uploadPost("trail")}>Upload Trail</button>
      </div>
      <div className="grid">
        {posts.map(post=>{
          const author = profiles.find(p=>p.id===post.author_id) || profiles[0];
          return (
            <div className="card" key={post.id}>
              <VideoPlayer post={post}/>
              <div className="row">
                <Avatar profile={author}/>
                <div><b>{post.title}</b><br/><span className="small">@{author?.username || "unknown"} · {post.type}</span></div>
              </div>
              <p>{post.caption}</p>
              <div className="actions">
                <button>❤️ Echo {post.echoes || 0}</button>
                <button onClick={()=>sendGift(post)}>🎁 Gift</button>
                <button onClick={()=>reportPost(post)}>⚠ Report</button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Memories({ playBliss, blissPlaying }){
  return (
    <section>
      <div className="card memoryHero">
        <div className="hero">Memories</div>
        <p>The emotional archive section. This button plays the uploaded Bliss audio file.</p>
        <button className="primary" onClick={playBliss}>{blissPlaying ? "Pause Bliss" : "Play Bliss"}</button>
      </div>
      <div className="grid">
        <div className="card">🌅 <b>Recovered Reels</b><p>Orange/yellow sunset glow.</p></div>
        <div className="card">🎵 <b>Memory Sounds</b><p>Music-based posts and edits.</p></div>
        <div className="card">📁 <b>Old Drive Files</b><p>Inspired by old school-drive vibes.</p></div>
        <div className="card">🌌 <b>Blue Hour</b><p>Some abandoned feeling, but not full horror.</p></div>
      </div>
    </section>
  );
}

function Live({ gifts, posts, sendGift }){
  const first = posts[0];
  return (
    <section>
      <div className="card">
        <div className="hero">Live Trails</div>
        <p>Paid-content style gift system preview: Super Echoes, VHS gifts, Echo Burst, and premiere support.</p>
        {first && <button className="primary" onClick={()=>sendGift(first)}>Send Gift / Super Echo</button>}
        {gifts.length ? gifts.map(g=><div className="gift" key={g.id}>{g.gift_name} — {g.echoes_spent} Echoes<br/><span className="small">{g.message}</span></div>) : <div className="gift">No gifts yet.</div>}
      </div>
    </section>
  );
}

function Reelers({ profiles, reportProfile }){
  return (
    <section>
      <div className="card"><div className="hero">Reelers</div><p>Creators/channels with owner crown and creator icons.</p></div>
      <div className="grid">
        {profiles.map(p=>(
          <div className="card" key={p.id}>
            <Avatar profile={p}/>
            <h2>{p.display_name || p.username}</h2>
            <p>@{p.username} · {p.role} · {p.creator_type}</p>
            <p>{p.bio}</p>
            <button>Follow</button>{" "}
            <button onClick={()=>reportProfile(p)}>Report</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function Panel({ canPanel, reports, gifts, profiles, posts }){
  if(!canPanel) return <div className="card"><div className="hero">No Access</div><p>Only owner/admin/moderator can see the Owner Panel.</p></div>;
  return (
    <section>
      <div className="card"><div className="hero">Owner Panel 👑</div><p>Global reports, gifts, Reelers, posts, and moderation dashboard.</p></div>
      <div className="grid">
        <div className="card"><h2>Stats</h2><p>{profiles.length} Reelers</p><p>{posts.length} posts</p><p>{reports.length} reports</p><p>{gifts.length} gifts</p></div>
        <div className="card"><h2>Reports Inbox</h2>{reports.length ? reports.map(r=><div className="report" key={r.id}>⚠ {r.reason}<br/><span className="small">{r.target_type}: {r.target_id}</span></div>) : <p>No reports yet.</p>}</div>
        <div className="card"><h2>Gifts</h2>{gifts.length ? gifts.map(g=><div className="gift" key={g.id}>{g.gift_name} · {g.echoes_spent} Echoes<br/>{g.message}</div>) : <p>No gifts yet.</p>}</div>
      </div>
    </section>
  );
}

function Profile({ profile, uploadPost }){
  if(!profile) return <div className="card"><div className="hero">Log in</div><p>Log in or sign up to create your TrailReels account.</p></div>;
  return (
    <section>
      <div className="card profile">
        <div className="banner">OWNER TRAIL</div>
        <div className="profileAvatar"><Avatar profile={profile}/></div>
        <h1>{profile.display_name || profile.username}</h1>
        <p>@{profile.username} · {profile.role} · {profile.creator_type}</p>
        <p>{profile.bio}</p>
        <button className="primary" onClick={()=>uploadPost("reel")}>Upload Reel</button>{" "}
        <button className="primary" onClick={()=>uploadPost("trail")}>Upload Trail</button>
      </div>
    </section>
  );
}

createRoot(document.getElementById("root")).render(<App />);
