import ReactMarkdown from 'react-markdown';
import { useState, useRef, useEffect, useCallback } from 'react';

/* ─────────────────────────── CONSTANTS ─────────────────────────── */
const ACCENT   = '#7C6EFA';
const ACCENT2  = '#A99BFF';
const BG       = '#0B0D12';
const SURFACE  = '#10131A';
const SURFACE2 = '#181C27';
const SURFACE3 = '#1F2435';
const BORDER   = 'rgba(255,255,255,0.06)';
const BORDER2  = 'rgba(255,255,255,0.11)';
const TEXT     = '#DDE1F0';
const TEXT2    = '#7A82A0';
const TEXT3    = '#3E4560';

/* ─────────────────────────── LOADING DOTS ─────────────────────────── */
const LoadingDots = ({ small }) => (
    <div style={{ display:'flex', gap: small?'2px':'5px', alignItems:'center' }}>
        {[0,160,320].map((d,i) => (
            <span key={i} style={{
                width: small?'3px':'5px', height: small?'3px':'5px',
                borderRadius:'50%', background: small?'currentColor':TEXT3,
                display:'inline-block',
                animation:`dotPulse 1.3s ${d}ms ease-in-out infinite`,
            }}/>
        ))}
    </div>
);

/* ─────────────────────────── TOAST ─────────────────────────── */
const Toast = ({ toasts }) => (
    <div style={{ position:'fixed', bottom:'24px', right:'24px', display:'flex', flexDirection:'column', gap:'8px', zIndex:9999, pointerEvents:'none' }}>
        {toasts.map(t => {
            const cfg = {
                success: { bg:'rgba(34,197,94,0.12)',   border:'rgba(34,197,94,0.28)',   icon:'✓', color:'#4ade80' },
                error:   { bg:'rgba(239,68,68,0.12)',   border:'rgba(239,68,68,0.28)',   icon:'✕', color:'#f87171' },
                loading: { bg:'rgba(124,110,250,0.12)', border:'rgba(124,110,250,0.28)', icon:'…', color:ACCENT2 },
                warn:    { bg:'rgba(251,191,36,0.12)',  border:'rgba(251,191,36,0.28)',  icon:'!', color:'#fbbf24' },
            }[t.type] || {};
            return (
                <div key={t.id} style={{
                    display:'flex', alignItems:'flex-start', gap:'10px',
                    padding:'12px 16px', borderRadius:'12px', minWidth:'260px', maxWidth:'340px',
                    background:cfg.bg, border:`1px solid ${cfg.border}`,
                    animation:'slideIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                    boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
                }}>
                    <span style={{
                        width:'20px', height:'20px', borderRadius:'50%', flexShrink:0,
                        background:cfg.border, display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:'11px', fontWeight:700, color:cfg.color, marginTop:'1px',
                    }}>
                        {t.type==='loading' ? <LoadingDots small /> : cfg.icon}
                    </span>
                    <div style={{flex:1}}>
                        <div style={{fontSize:'13px', fontWeight:600, color:TEXT}}>{t.title}</div>
                        {t.desc && <div style={{fontSize:'11.5px', color:TEXT2, marginTop:'3px', lineHeight:1.4}}>{t.desc}</div>}
                    </div>
                </div>
            );
        })}
    </div>
);

/* ─────────────────────────── SIDEBAR NAV ITEM ─────────────────────────── */
const NavItem = ({ icon, label, active, onClick }) => (
    <button onClick={onClick} title={label} style={{
        width:'100%', padding:'10px 0', border:'none', cursor:'pointer', borderRadius:'10px',
        background: active ? `rgba(124,110,250,0.12)` : 'transparent',
        display:'flex', flexDirection:'column', alignItems:'center', gap:'4px',
        transition:'all 0.15s', position:'relative',
        borderLeft: active ? `2px solid ${ACCENT}` : '2px solid transparent',
    }}>
        <span style={{ fontSize:'17px', lineHeight:1 }}>{icon}</span>
        <span style={{ fontSize:'9px', fontWeight:600, letterSpacing:'0.6px', color: active ? ACCENT2 : TEXT3, textTransform:'uppercase' }}>{label}</span>
    </button>
);

/* ─────────────────────────── CONTEXT PILL ─────────────────────────── */
const CtxPill = ({ label, icon, color, checked, onChange }) => {
    const C = {
        blue:    { dot:'#3b82f6', bg:'rgba(59,130,246,0.1)',  border:'rgba(59,130,246,0.3)',  text:'#60a5fa' },
        amber:   { dot:'#f59e0b', bg:'rgba(245,158,11,0.1)',  border:'rgba(245,158,11,0.3)',  text:'#fcd34d' },
        emerald: { dot:'#10b981', bg:'rgba(16,185,129,0.1)',  border:'rgba(16,185,129,0.3)',  text:'#34d399' },
    }[color];
    return (
        <label style={{
            display:'flex', alignItems:'center', gap:'7px', padding:'6px 12px',
            borderRadius:'8px', cursor:'pointer', userSelect:'none', transition:'all 0.15s',
            background: checked ? C.bg : SURFACE3,
            border:`1px solid ${checked ? C.border : BORDER}`,
        }}>
            <input type="checkbox" checked={checked} onChange={onChange} style={{display:'none'}}/>
            <span style={{ fontSize:'13px' }}>{icon}</span>
            <span style={{
                fontSize:'11px', fontWeight:600, letterSpacing:'0.3px',
                color: checked ? C.text : TEXT3, transition:'color 0.15s',
            }}>{label}</span>
            <span style={{
                width:'6px', height:'6px', borderRadius:'50%', flexShrink:0, marginLeft:'2px',
                background: checked ? C.dot : TEXT3,
                boxShadow: checked ? `0 0 8px ${C.dot}` : 'none',
                transition:'all 0.2s',
            }}/>
        </label>
    );
};

/* ─────────────────────────── ACTION BUTTON ─────────────────────────── */
const Btn = ({ onClick, children, variant='ghost', disabled }) => {
    const V = {
        ghost:  { bg:SURFACE3, color:TEXT2,  border:BORDER2, hBg:SURFACE2,               hColor:TEXT },
        run:    { bg:'rgba(16,185,129,0.1)', color:'#34d399', border:'rgba(16,185,129,0.3)', hBg:'rgba(16,185,129,0.18)', hColor:'#6ee7b7' },
        upload: { bg:`rgba(124,110,250,0.1)`, color:ACCENT2, border:`rgba(124,110,250,0.25)`, hBg:`rgba(124,110,250,0.18)`, hColor:'#c4bbff' },
    }[variant];
    const [hov, setHov] = useState(false);
    return (
        <button onClick={onClick} disabled={disabled} style={{
            fontFamily:'inherit', fontSize:'11.5px', fontWeight:600, letterSpacing:'0.3px',
            padding:'7px 14px', borderRadius:'8px', cursor: disabled?'default':'pointer',
            background: hov ? V.hBg : V.bg,
            color: hov ? V.hColor : V.color,
            border:`1px solid ${V.border}`,
            display:'flex', alignItems:'center', gap:'6px',
            transition:'all 0.15s', opacity: disabled?0.4:1, whiteSpace:'nowrap',
        }}
            onMouseEnter={()=>setHov(true)}
            onMouseLeave={()=>setHov(false)}
        >{children}</button>
    );
};

/* ─────────────────────────── MESSAGE BUBBLE ─────────────────────────── */
const MessageBubble = ({ msg }) => {
    const isUser = msg.type === 'user';
    const tagMatch = msg.text?.match(/^\[(\w+)\]\s*/);
    const tag = tagMatch?.[1];
    const body = tagMatch ? msg.text.slice(tagMatch[0].length) : msg.text;

    return (
        <div style={{
            display:'flex', gap:'12px', alignItems:'flex-start',
            flexDirection: isUser ? 'row-reverse' : 'row',
            animation:'msgIn 0.22s cubic-bezier(0.25,0.46,0.45,0.94)',
            padding:'0 4px',
        }}>
            {/* Avatar */}
            <div style={{
                width:'32px', height:'32px', borderRadius:'10px', flexShrink:0,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'12px', fontWeight:700, letterSpacing:'-0.5px',
                background: isUser
                    ? `linear-gradient(135deg, ${SURFACE3}, ${SURFACE2})`
                    : `linear-gradient(135deg, #5B4FD4, ${ACCENT})`,
                color: isUser ? TEXT2 : 'white',
                border: `1px solid ${isUser ? BORDER2 : 'rgba(124,110,250,0.4)'}`,
                boxShadow: isUser ? 'none' : `0 0 16px rgba(124,110,250,0.25)`,
            }}>
                {isUser ? 'You' : 'AI'}
            </div>

            {/* Content */}
            <div style={{ maxWidth:'76%', display:'flex', flexDirection:'column', gap:'4px', alignItems: isUser?'flex-end':'flex-start' }}>
                {tag && (
                    <span style={{
                        fontSize:'10px', fontWeight:700, letterSpacing:'0.6px',
                        color: ACCENT2, textTransform:'uppercase',
                        padding:'2px 8px', borderRadius:'4px',
                        background:`rgba(124,110,250,0.1)`, border:`1px solid rgba(124,110,250,0.2)`,
                    }}>{tag}</span>
                )}
                <div style={{
                    padding:'11px 15px', borderRadius:'14px', fontSize:'13.5px', lineHeight:1.7,
                    background: isUser ? `linear-gradient(135deg, ${ACCENT}, #5B4FD4)` : SURFACE,
                    color: isUser ? 'white' : TEXT,
                    border: isUser ? 'none' : `1px solid ${BORDER}`,
                    borderTopLeftRadius: isUser ? '14px' : '4px',
                    borderTopRightRadius: isUser ? '4px' : '14px',
                    boxShadow: isUser
                        ? '0 4px 20px rgba(124,110,250,0.3)'
                        : '0 2px 12px rgba(0,0,0,0.3)',
                }}>
                    <div className="md-content">
                        <ReactMarkdown components={{
                            pre: ({node,...p}) => (
                                <div style={{margin:'8px 0', borderRadius:'8px', overflow:'hidden', border:`1px solid ${BORDER2}`}}>
                                    <div style={{background:'#0d1117', padding:'8px 12px', borderBottom:`1px solid ${BORDER}`, display:'flex', alignItems:'center', gap:'6px'}}>
                                        <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#ef4444',display:'inline-block'}}/>
                                        <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#f59e0b',display:'inline-block'}}/>
                                        <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#22c55e',display:'inline-block'}}/>
                                        <span style={{fontSize:'10px',color:TEXT3,marginLeft:'4px',fontFamily:'monospace'}}>code</span>
                                    </div>
                                    <pre {...p} style={{
                                        background:'#0d1117', margin:0, padding:'12px',
                                        fontFamily:"'JetBrains Mono',monospace", fontSize:'12px',
                                        color:'#a5b4fc', overflowX:'auto', lineHeight:1.6,
                                        whiteSpace:'pre-wrap', wordBreak:'break-all',
                                    }}/>
                                </div>
                            ),
                            code: ({node,inline,...p}) => inline
                                ? <code {...p} style={{background:'rgba(124,110,250,0.15)',color:ACCENT2,padding:'1px 6px',borderRadius:'4px',fontSize:'12.5px',fontFamily:"'JetBrains Mono',monospace"}}/>
                                : <code {...p}/>,
                            p:      ({node,...p}) => <p      {...p} style={{marginBottom:'6px'}}/>,
                            strong: ({node,...p}) => <strong {...p} style={{color: isUser?'rgba(255,255,255,0.95)':ACCENT2, fontWeight:600}}/>,
                            h3:     ({node,...p}) => <h3     {...p} style={{color: isUser?'white':ACCENT2, fontWeight:600, fontSize:'14px', marginBottom:'6px', marginTop:'10px'}}/>,
                            ul:     ({node,...p}) => <ul     {...p} style={{paddingLeft:'1.2rem', marginBottom:'6px'}}/>,
                            li:     ({node,...p}) => <li     {...p} style={{marginBottom:'3px'}}/>,
                        }}>
                            {body}
                        </ReactMarkdown>
                    </div>
                    {msg.image && (
                        <div style={{marginTop:'10px',borderRadius:'8px',overflow:'hidden',border:`1px solid ${BORDER2}`}}>
                            <img src={msg.image} alt="asset" style={{width:'100%',maxHeight:'300px',objectFit:'contain',display:'block'}} onError={e=>e.target.style.display='none'}/>
                        </div>
                    )}
                </div>
                <span style={{fontSize:'10px',color:TEXT3,padding:'0 4px'}}>
                    {new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}
                </span>
            </div>
        </div>
    );
};

/* ─────────────────────────── MAIN PAGE ─────────────────────────── */
export const ChatPage = () => {
    const [messages,           setMessages]        = useState([{ id:1, type:'bot', text:'Xin chào! Console đã sẵn sàng. Hãy hỏi tôi về dữ liệu của bạn.' }]);
    const [inputValue,         setInputValue]      = useState('');
    const [selectedTag,        setSelectedTag]     = useState('chat');
    const [isLoading,          setIsLoading]       = useState(false);
    const [useDataContext,     setUseDataContext]   = useState(false);
    const [useCodeContext,     setUseCodeContext]   = useState(false);
    const [useKnowledgeContext,setUseKnowledgeCtx] = useState(false);
    const [toasts,             setToasts]          = useState([]);
    const [activeNav,          setActiveNav]       = useState('chat');

    const fileInputRef   = useRef(null);
    const messagesEndRef = useRef(null);
    const inputRef       = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior:'smooth' });
    }, [messages, isLoading]);

    /* ── TOAST HELPERS ── */
    const pushToast = useCallback((toast) => {
        const id = Date.now();
        setToasts(p => [...p, { id, ...toast }]);
        if (toast.type !== 'loading') setTimeout(() => setToasts(p=>p.filter(t=>t.id!==id)), 3500);
        return id;
    }, []);

    const resolveToast = useCallback((id, update) => {
        setToasts(p => p.map(t => t.id===id ? {...t,...update} : t));
        setTimeout(() => setToasts(p=>p.filter(t=>t.id!==id)), 3000);
    }, []);

    /* ── UPLOAD ── */
    const handleUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        e.target.value = '';
        const names = files.map(f=>f.name).join(', ');
        const tid = pushToast({ type:'loading', title:`Đang tải ${files.length} file…`, desc:names });
        try {
            const fd = new FormData();
            files.forEach(f => fd.append('files', f));
            const res = await fetch('http://localhost:5174/api/upload', { method:'POST', body:fd });
            if (!res.ok) throw new Error(`Server ${res.status}`);
            const data = await res.json();
            resolveToast(tid, { type:'success', title:`${files.length} file đã tải lên`, desc:data.message||names });
            setMessages(p=>[...p,{
                id:Date.now(), type:'bot',
                text:`📁 **Đã tải lên ${files.length} file:**\n${files.map(f=>`- \`${f.name}\` (${(f.size/1024).toFixed(1)} KB)`).join('\n')}\n\nBật **Data** context để bắt đầu phân tích.`,
            }]);
        } catch(err) {
            resolveToast(tid, { type:'error', title:'Tải lên thất bại', desc:err.message });
            setMessages(p=>[...p,{id:Date.now(),type:'bot',text:`❌ **Lỗi tải file:** ${err.message}`}]);
        }
    };

    /* ── RUN / DISPLAY ── */
    const handleAction = async (action) => {
        setIsLoading(true);
        const tid = pushToast({ type:'loading', title: action==='run' ? 'Đang chạy code…' : 'Đang tải source…' });
        try {
            const res = await fetch(`http://localhost:5174/api/${action==='run'?'run-code':'source-code'}`, { method: action==='run'?'POST':'GET' });
            const data = await res.json();
            resolveToast(tid, { type: data.error?'error':'success', title: data.error?'Lỗi thực thi':'Hoàn thành' });
            const text = action==='run'
                ? (data.error ? `### ⚠️ Lỗi\n\`\`\`\n${data.error}\n\`\`\`` : `### ✅ Output\n\`\`\`\n${data.output||'Không có output.'}\n\`\`\``)
                : `### 📄 main.py\n\`\`\`python\n${data.code}\n\`\`\``;
            setMessages(p=>[...p,{id:Date.now(),type:'bot',text}]);
        } catch {
            resolveToast(tid, { type:'error', title:'Server không phản hồi' });
            setMessages(p=>[...p,{id:Date.now(),type:'bot',text:'❌ Không kết nối được server.'}]);
        } finally { setIsLoading(false); }
    };

    /* ── SEND MESSAGE ── */
    const processMessage = async (text) => {
        if (!text?.trim() || isLoading) return;
        setMessages(p=>[...p,{id:Date.now(),type:'user',text:`[${selectedTag.toUpperCase()}] ${text}`}]);
        setInputValue('');
        setIsLoading(true);
        try {
            const res = await fetch('http://localhost:5174/api/chat',{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({ prompt:text, useData:useDataContext, useCode:useCodeContext, useKnowledge:useKnowledgeContext }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            let botText = data.reply;
            if (data.wasUpdated) botText += `\n\n### 🛠️ Code đã cập nhật\n\`\`\`python\n${data.newCode}\n\`\`\``;
            setMessages(p=>[...p,{id:Date.now()+2,type:'bot',text:botText}]);
        } catch(e) {
            setMessages(p=>[...p,{id:Date.now()+2,type:'bot',text:`❌ Lỗi: ${e.message}`}]);
        } finally {
            setIsLoading(false);
            setTimeout(()=>inputRef.current?.focus(), 50);
        }
    };

    const activeContexts = [useDataContext&&'Data', useCodeContext&&'Code', useKnowledgeContext&&'Knowledge'].filter(Boolean);

    const SUGGESTIONS = ['Phân tích tổng quát dataset', 'Tạo câu hỏi visualization', 'Giải thích cluster_group'];

    /* ─────────── RENDER ─────────── */
    return (
        <>
        <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
            *{box-sizing:border-box;margin:0;padding:0;}
            body,#root{height:100vh;background:${BG};font-family:'Inter',sans-serif;overflow:hidden;}
            @keyframes dotPulse{0%,80%,100%{transform:scale(0.6);opacity:0.3}40%{transform:scale(1);opacity:1}}
            @keyframes msgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
            @keyframes slideIn{from{opacity:0;transform:translateX(20px) scale(0.95)}to{opacity:1;transform:translateX(0) scale(1)}}
            @keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}
            .scroll-area::-webkit-scrollbar{width:3px}
            .scroll-area::-webkit-scrollbar-thumb{background:${SURFACE3};border-radius:4px}
            .scroll-area::-webkit-scrollbar-track{background:transparent}
            .md-content p{margin-bottom:5px}
            .md-content ul{padding-left:1.1rem;margin-bottom:5px}
            .md-content li{margin-bottom:2px}
            .input-row:focus-within .input-box{border-color:rgba(124,110,250,0.45)!important;box-shadow:0 0 0 3px rgba(124,110,250,0.07)!important}
            .suggestion-btn:hover{border-color:rgba(124,110,250,0.4)!important;color:${ACCENT2}!important;background:rgba(124,110,250,0.08)!important}
            .upload-icon-btn:hover{background:rgba(124,110,250,0.15)!important;border-color:rgba(124,110,250,0.4)!important;color:${ACCENT2}!important}
        `}</style>

        <div style={{display:'flex', height:'100vh', background:BG, color:TEXT}}>

            {/* ══════════ SIDEBAR ══════════ */}
            <aside style={{
                width:'68px', flexShrink:0,
                background:SURFACE, borderRight:`1px solid ${BORDER}`,
                display:'flex', flexDirection:'column', alignItems:'center',
                padding:'14px 0', gap:'2px',
            }}>
                {/* Logo mark */}
                <div style={{
                    width:'38px', height:'38px', borderRadius:'11px', marginBottom:'18px',
                    background:`linear-gradient(135deg, #5143C4, ${ACCENT})`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'19px', flexShrink:0,
                    boxShadow:`0 0 24px rgba(124,110,250,0.35), inset 0 1px 0 rgba(255,255,255,0.15)`,
                }}>🔬</div>

                <NavItem icon="💬" label="Chat"  active={activeNav==='chat'}  onClick={()=>setActiveNav('chat')}/>
                <NavItem icon="📊" label="Data"  active={activeNav==='data'}  onClick={()=>setActiveNav('data')}/>
                <NavItem icon="🐍" label="Code"  active={activeNav==='code'}  onClick={()=>setActiveNav('code')}/>
                <NavItem icon="📚" label="Know"  active={activeNav==='know'}  onClick={()=>setActiveNav('know')}/>

                {/* Spacer + Upload button */}
                <div style={{marginTop:'auto', display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', width:'100%', padding:'0 10px'}}>
                    {/* Divider */}
                    <div style={{width:'32px', height:'1px', background:BORDER2, marginBottom:'4px'}}/>
                    <button
                        className="upload-icon-btn"
                        onClick={()=>fileInputRef.current?.click()}
                        title="Upload Data"
                        style={{
                            width:'42px', height:'42px', borderRadius:'11px',
                            border:`1px solid ${BORDER2}`, background:SURFACE3,
                            cursor:'pointer', display:'flex', flexDirection:'column',
                            alignItems:'center', justifyContent:'center', gap:'2px',
                            transition:'all 0.15s', color:TEXT2,
                        }}
                    >
                        <span style={{fontSize:'16px',lineHeight:1}}>↑</span>
                        <span style={{fontSize:'8px',fontWeight:700,letterSpacing:'0.5px',textTransform:'uppercase'}}>Upload</span>
                    </button>
                    <input type="file" multiple accept=".csv,.txt" ref={fileInputRef} style={{display:'none'}} onChange={handleUpload}/>
                </div>
            </aside>

            {/* ══════════ MAIN COLUMN ══════════ */}
            <div style={{flex:1, display:'flex', flexDirection:'column', minWidth:0}}>

                {/* ── TOP BAR ── */}
                <header style={{
                    height:'54px', flexShrink:0,
                    background:SURFACE, borderBottom:`1px solid ${BORDER}`,
                    display:'flex', alignItems:'center', padding:'0 20px', gap:'12px',
                }}>
                    <div style={{flex:1, minWidth:0}}>
                        <div style={{fontSize:'14px', fontWeight:600, color:TEXT, letterSpacing:'-0.2px'}}>Lab Assistant</div>
                        <div style={{fontSize:'10.5px', color:TEXT3, marginTop:'1px'}}>AI Visualization Helper · Banking Dataset</div>
                    </div>

                    {/* Mode selector */}
                    <div style={{display:'flex', alignItems:'center', gap:'6px', flexShrink:0}}>
                        <span style={{fontSize:'11px', color:TEXT3, fontWeight:500}}>Mode</span>
                        <select value={selectedTag} onChange={e=>setSelectedTag(e.target.value)} style={{
                            background:SURFACE3, border:`1px solid ${BORDER2}`, color:ACCENT2,
                            fontFamily:'inherit', fontSize:'11px', fontWeight:600,
                            padding:'5px 10px', borderRadius:'7px', outline:'none', cursor:'pointer',
                        }}>
                            <option value="chat">CHAT</option>
                            <option value="file">FILE</option>
                        </select>
                    </div>

                    <div style={{width:'1px', height:'22px', background:BORDER2, flexShrink:0}}/>

                    <Btn onClick={()=>handleAction('display')}>⬡ Source</Btn>
                    <Btn onClick={()=>handleAction('run')} variant="run">▶ Run</Btn>

                    {/* Live status */}
                    <div style={{
                        display:'flex', alignItems:'center', gap:'6px',
                        padding:'5px 11px', borderRadius:'8px',
                        background:SURFACE3, border:`1px solid ${BORDER}`, flexShrink:0,
                    }}>
                        <span style={{width:'6px',height:'6px',borderRadius:'50%',background:'#22c55e',boxShadow:'0 0 8px #22c55e',animation:'pulse 2s infinite'}}/>
                        <span style={{fontSize:'11px',color:'#4ade80',fontWeight:500}}>Online</span>
                    </div>
                </header>

                {/* ── CONTEXT BAR ── */}
                <div style={{
                    flexShrink:0, padding:'9px 20px',
                    background:SURFACE2, borderBottom:`1px solid ${BORDER}`,
                    display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap',
                }}>
                    <span style={{fontSize:'10px', fontWeight:700, letterSpacing:'1px', color:TEXT3, textTransform:'uppercase', marginRight:'6px'}}>Context</span>
                    <CtxPill label="Data"      icon="🗄️" color="blue"    checked={useDataContext}      onChange={e=>setUseDataContext(e.target.checked)}/>
                    <CtxPill label="Code"      icon="🐍" color="amber"   checked={useCodeContext}      onChange={e=>setUseCodeContext(e.target.checked)}/>
                    <CtxPill label="Knowledge" icon="📖" color="emerald" checked={useKnowledgeContext} onChange={e=>setUseKnowledgeCtx(e.target.checked)}/>

                    {activeContexts.length > 0 && (
                        <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:'5px'}}>
                            <span style={{width:'5px',height:'5px',borderRadius:'50%',background:ACCENT,animation:'pulse 2s infinite'}}/>
                            <span style={{fontSize:'11px',color:ACCENT2,fontWeight:500}}>{activeContexts.join(' + ')} đang bật</span>
                        </div>
                    )}
                </div>

                {/* ── MESSAGES AREA ── */}
                <main className="scroll-area" style={{
                    flex:1, overflowY:'auto', padding:'24px 20px 8px',
                    display:'flex', flexDirection:'column', gap:'18px',
                }}>
                    {/* Welcome screen */}
                    {messages.length === 1 && (
                        <div style={{
                            margin:'auto', textAlign:'center', padding:'40px 20px',
                            display:'flex', flexDirection:'column', alignItems:'center', gap:'14px',
                        }}>
                            <div style={{
                                width:'60px', height:'60px', borderRadius:'18px',
                                background:`linear-gradient(135deg, #5143C4, ${ACCENT})`,
                                display:'flex', alignItems:'center', justifyContent:'center',
                                fontSize:'30px',
                                boxShadow:`0 0 40px rgba(124,110,250,0.35), inset 0 1px 0 rgba(255,255,255,0.15)`,
                            }}>🔬</div>
                            <div>
                                <div style={{fontSize:'20px', fontWeight:600, color:TEXT, marginBottom:'6px'}}>Lab Assistant sẵn sàng</div>
                                <div style={{fontSize:'13px', color:TEXT2, lineHeight:1.6, maxWidth:'340px'}}>
                                    Chọn context phù hợp bên trên và bắt đầu phân tích dữ liệu ngân hàng của bạn
                                </div>
                            </div>
                            <div style={{display:'flex', gap:'8px', flexWrap:'wrap', justifyContent:'center', marginTop:'4px'}}>
                                {SUGGESTIONS.map(s=>(
                                    <button key={s} className="suggestion-btn" onClick={()=>{setInputValue(s);inputRef.current?.focus();}} style={{
                                        padding:'8px 14px', borderRadius:'8px',
                                        border:`1px solid ${BORDER2}`, background:SURFACE2,
                                        color:TEXT2, fontFamily:'inherit', fontSize:'12px',
                                        cursor:'pointer', transition:'all 0.15s',
                                    }}>{s}</button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map(msg => <MessageBubble key={msg.id} msg={msg}/>)}

                    {/* Typing indicator */}
                    {isLoading && (
                        <div style={{display:'flex', gap:'12px', alignItems:'flex-start', animation:'msgIn 0.2s ease'}}>
                            <div style={{
                                width:'32px', height:'32px', borderRadius:'10px', flexShrink:0,
                                background:`linear-gradient(135deg, #5143C4, ${ACCENT})`,
                                display:'flex', alignItems:'center', justifyContent:'center',
                                fontSize:'12px', fontWeight:700, color:'white',
                                boxShadow:`0 0 16px rgba(124,110,250,0.25)`,
                            }}>AI</div>
                            <div style={{
                                padding:'13px 17px', borderRadius:'14px', borderTopLeftRadius:'4px',
                                background:SURFACE, border:`1px solid ${BORDER}`,
                                display:'flex', alignItems:'center', gap:'10px',
                            }}>
                                <LoadingDots/>
                                <span style={{fontSize:'12px', color:TEXT3, fontStyle:'italic'}}>Đang xử lý…</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef}/>
                </main>

                {/* ── INPUT FOOTER ── */}
                <footer style={{
                    flexShrink:0, padding:'14px 20px 18px',
                    background:SURFACE, borderTop:`1px solid ${BORDER}`,
                }}>
                    <div className="input-row">
                        <div className="input-box" style={{
                            display:'flex', alignItems:'flex-end', gap:'10px',
                            background:SURFACE2, border:`1px solid ${BORDER2}`,
                            borderRadius:'14px', padding:'11px 11px 11px 16px',
                            transition:'border-color 0.2s, box-shadow 0.2s',
                        }}>
                            <textarea
                                ref={inputRef}
                                value={inputValue}
                                onChange={e=>{
                                    setInputValue(e.target.value);
                                    e.target.style.height='auto';
                                    e.target.style.height=Math.min(e.target.scrollHeight,120)+'px';
                                }}
                                onKeyDown={e=>{
                                    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();processMessage(inputValue);}
                                }}
                                placeholder="Hỏi về dữ liệu hoặc yêu cầu viết code…"
                                disabled={isLoading}
                                rows={1}
                                style={{
                                    flex:1, background:'none', border:'none', outline:'none', resize:'none',
                                    fontFamily:'inherit', fontSize:'14px', color:TEXT, lineHeight:1.6,
                                    caretColor:ACCENT2, minHeight:'22px', maxHeight:'120px',
                                    scrollbarWidth:'none', overflowY:'auto',
                                }}
                            />
                            <button
                                onClick={()=>processMessage(inputValue)}
                                disabled={isLoading||!inputValue.trim()}
                                style={{
                                    width:'36px', height:'36px', borderRadius:'10px', flexShrink:0,
                                    background: (isLoading||!inputValue.trim()) ? SURFACE3 : `linear-gradient(135deg, #5143C4, ${ACCENT})`,
                                    border:'none', cursor:(isLoading||!inputValue.trim())?'default':'pointer',
                                    display:'flex', alignItems:'center', justifyContent:'center',
                                    fontSize:'15px', color:(isLoading||!inputValue.trim())?TEXT3:'white',
                                    transition:'all 0.2s',
                                    boxShadow:(isLoading||!inputValue.trim())?'none':`0 0 16px rgba(124,110,250,0.4)`,
                                }}
                            >➤</button>
                        </div>
                        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 4px 0'}}>
                            <span style={{fontSize:'10.5px', color:TEXT3}}>
                                {activeContexts.length>0
                                    ? `${activeContexts.join(' · ')} đang bật`
                                    : 'Không có context · chế độ chat thuần'}
                            </span>
                            <span style={{fontSize:'10.5px', color:TEXT3}}>Enter gửi · Shift+Enter xuống dòng</span>
                        </div>
                    </div>
                </footer>
            </div>
        </div>

        <Toast toasts={toasts}/>
        </>
    );
};