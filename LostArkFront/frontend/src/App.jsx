import { useState } from 'react'
import './index.css'

function App() {
    const [characterName, setCharacterName] = useState('')
    const [fullData, setFullData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [activeTab, setActiveTab] = useState('profile')
    const [arkSubTab, setArkSubTab] = useState('깨달음')
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
    const [copiedSkillCode, setCopiedSkillCode] = useState(false)

    const handleMouseMove = (e) => {
        setTooltipPos({ x: e.clientX + 15, y: e.clientY + 15 })
    }

    const stripHtml = (html) => {
        if (!html) return ''
        return html.replace(/<[^>]*>/g, '').replace(/\(귀속\)/g, '').trim()
    }

    const extractGemEffect = (tooltip) => {
        if (!tooltip) return ''
        try {
            const parsed = JSON.parse(tooltip)
            const effectEl = parsed?.Element_006?.value?.Element_001
            if (effectEl) {
                const cleanEffect = effectEl
                    .split('<BR><BR>')[0]
                    .replace(/<FONT[^>]*>/gi, '')
                    .replace(/<\/FONT>/gi, '')
                    .replace(/\[블레이드\]\s*/gi, '')
                    .trim()
                return cleanEffect
            }
        } catch (e) {}
        return ''
    }

    const getGemType = (tooltip) => {
        const effect = extractGemEffect(tooltip)
        if (effect.includes('공격력') || effect.includes('피해')) return 'damage'
        if (effect.includes('쿨타임') || effect.includes('재사용')) return 'cooldown'
        return 'unknown'
    }

    const handleSearch = async (e, nameToSearch = null) => {
        if (e) e.preventDefault()
        const targetName = nameToSearch || characterName
        if (!targetName) return

        if (nameToSearch) setCharacterName(nameToSearch)

        setLoading(true)
        setError(null)
        setFullData(null)

        try {
            const response = await fetch(`/api/characters/${encodeURIComponent(targetName)}/full`)
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(errorBody || `서버 오류 (${response.status})`);
            }
            const data = await response.json()
            console.log("[DEBUG] API Payload:", data);
            setFullData(data)
            setActiveTab('profile')
        } catch (err) {
            console.error("[DEBUG] Search Error:", err);
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const { profile, skills, gems, arkpassive, arkgrid, siblings } = fullData || {}
    const cardList = Array.isArray(fullData?.cards?.Cards) ? fullData.cards.Cards : (Array.isArray(profile?.Cards) ? profile.Cards : [])
    const cardEffects = fullData?.cards?.Effects || []
    const totalAwake = cardList.reduce((sum, card) => sum + (card.AwakeCount || 0), 0)

    const extractItemLevel = (char) => {
        if (!char) return "0.00";
        const itemLv = char.ItemMaxLevel || char.itemMaxLevel || char.ItemAvgLevel || char.itemAvgLevel;
        return itemLv ? String(itemLv) : "0.00";
    };

    const getArkCategory = (eff) => {
        const text = (eff.Name + eff.Description).toLowerCase();
        if (text.includes('진화')) return '진화';
        if (text.includes('깨달음')) return '깨달음';
        if (text.includes('도약')) return '도약';
        return '기타';
    };

    const generateSkillCode = () => {
        if (!skills || skills.length === 0) return ''
        return skills.map(skill => {
            const tripods = skill.Tripods?.filter(t => t.IsSelected).map(t => `T${(t.Tier || 0) + 1}:${t.Name}`) || []
            const rune = skill.Rune?.Name || ''
            if (tripods.length === 0 && !rune) return null
            return `${skill.Name}[${tripods.join(',')}]${rune ? `{${rune}}` : ''}`
        }).filter(Boolean).join('|')
    }

    const copySkillCode = async () => {
        const code = generateSkillCode()
        if (!code) return
        try {
            await navigator.clipboard.writeText(code)
            setCopiedSkillCode(true)
            setTimeout(() => setCopiedSkillCode(false), 2000)
        } catch (e) {
            console.error('복사 실패:', e)
        }
    }

    // 무한 루프 방지를 위한 정적 Placeholder (Base64 투명 도트)
    const SAFE_FALLBACK_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

    const renderArkGridView = () => {
        if (!arkgrid) return <div style={{ padding: '10rem', textAlign: 'center' }}>아크 그리드 데이터가 없습니다.</div>;

        return (
            <div className="ark-panel-full" style={{ display: 'flex', gap: '2rem' }}>
                <div className="ark-sidebar" style={{ width: '350px', background: '#090c10', borderRight: '1px solid #222', padding: '2rem' }}>
                    <div style={{ color: 'var(--primary-gold)', fontWeight: 800, marginBottom: '1.5rem', fontSize: '1.2rem' }}>아크 그리드 효과</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {arkgrid.Effects?.map((eff, i) => (
                            <div key={i} style={{ 
                                background: 'rgba(255,255,255,0.03)', 
                                borderRadius: '8px', 
                                padding: '1rem',
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#fff', fontWeight: 600 }}>{eff.Name}</span>
                                    <span style={{ 
                                        background: 'linear-gradient(135deg, #ffd700, #ff9500)', 
                                        padding: '4px 12px', 
                                        borderRadius: '12px',
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        color: '#000'
                                    }}>Lv.{eff.Level}</span>
                                </div>
                                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#aaa' }} dangerouslySetInnerHTML={{ __html: eff.Tooltip }} />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="ark-content-main" style={{ flex: 1, padding: '2rem' }}>
                    <div style={{ color: 'var(--primary-gold)', fontWeight: 800, marginBottom: '2rem', fontSize: '1.5rem' }}>코어 & 젬</div>
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        {arkgrid.Slots?.map((slot, i) => {
                            let coreInfo = { type: '', willpower: '', options: '', condition: '' };
                            try {
                                const parsed = JSON.parse(slot.Tooltip);
                                // 혼돈 코어는 인덱스가 하나씩 앞
                                if (slot.Name.includes('혼돈')) {
                                    coreInfo.type = parsed?.Element_003?.value?.Element_001 || '';
                                    coreInfo.willpower = parsed?.Element_004?.value?.Element_001 || '';
                                    coreInfo.options = (parsed?.Element_005?.value?.Element_001 || '').replace(/<img[^>]*>/gi, '');
                                    coreInfo.condition = '';
                                } else {
                                    // 질서 코어
                                    coreInfo.type = parsed?.Element_004?.value?.Element_001 || '';
                                    coreInfo.willpower = parsed?.Element_005?.value?.Element_001 || '';
                                    coreInfo.options = (parsed?.Element_006?.value?.Element_001 || '').replace(/<img[^>]*>/gi, '');
                                    coreInfo.condition = (parsed?.Element_007?.value?.Element_001 || '').replace(/<img[^>]*>/gi, '');
                                }
                            } catch (e) {}
                            
                            const extractGemPoint = (gem) => {
                                try {
                                    const parsed = JSON.parse(gem.Tooltip);
                                    // Element_005에서 "질서 포인트" 또는 "혼돈 포인트" 추출
                                    const effect = parsed?.Element_005?.value?.Element_001 || '';
                                    const orderMatch = effect.match(/질서\s*포인트\s*:[^<]*<[^>]*>(\d+)/i) || effect.match(/질서\s*포인트\s*:\s*(\d+)/i);
                                    const chaosMatch = effect.match(/혼돈\s*포인트\s*:[^<]*<[^>]*>(\d+)/i) || effect.match(/혼돈\s*포인트\s*:\s*(\d+)/i);
                                    return orderMatch ? parseInt(orderMatch[1]) : (chaosMatch ? parseInt(chaosMatch[1]) : 0);
                                } catch (e) { return 0; }
                            };
                            
                            // 해당 코어에 장착된 젬들의 포인트만 합산
                            const totalGemPoints = slot.Gems?.reduce((sum, gem) => sum + extractGemPoint(gem), 0) || 0;
                            
                            const renderOptions = () => {
                                if (!coreInfo.options) return null;
                                const options = coreInfo.options.split('<br>');
                                return options.map((opt, idx) => {
                                    const match = opt.match(/\[(\d+)P\]/i);
                                    const requiredPoint = match ? parseInt(match[1]) : 0;
                                    const isActive = totalGemPoints >= requiredPoint;
                                    // [10P] 표시 유지
                                    return (
                                        <div key={idx} style={{ 
                                            fontSize: '0.85rem', 
                                            lineHeight: 1.6, 
                                            marginBottom: '0.3rem',
                                            color: isActive ? '#ffffff' : '#555555',
                                            fontWeight: isActive ? 700 : 400,
                                            opacity: isActive ? 1 : 0.7
                                        }} dangerouslySetInnerHTML={{ __html: opt }} />
                                    );
                                });
                            };
                            
                            return (
                            <div key={i} style={{ 
                                background: 'rgba(255,255,255,0.02)', 
                                borderRadius: '12px', 
                                padding: '1.5rem',
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                                <div 
                                    className="gem-item-with-tooltip"
                                    onMouseMove={handleMouseMove}
                                    style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', cursor: 'pointer', position: 'relative' }}
                                >
                                    <img 
                                        src={slot.Icon} 
                                        style={{ width: '48px', height: '48px', borderRadius: '8px' }} 
                                        alt="" 
                                    />
                                    <div>
                                        <div style={{ 
                                            color: slot.Grade === '유물' ? '#FA5D00' : slot.Grade === '전설' ? '#F99200' : '#ce43fc',
                                            fontWeight: 700,
                                            fontSize: '1rem'
                                        }}>
                                            {slot.Name}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#888' }}>
                                            {slot.Grade} 코어 | 포인트: {slot.Point}
                                        </div>
                                    </div>
                                    <div className="gem-tooltip-box" style={{
                                        display: 'none',
                                        position: 'fixed',
                                        top: tooltipPos.y,
                                        left: tooltipPos.x,
                                        width: '400px',
                                        maxHeight: '80vh',
                                        overflowY: 'auto',
                                        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                                        border: '1px solid rgba(255,215,0,0.3)',
                                        borderRadius: '8px',
                                        padding: '1rem',
                                        zIndex: 9999,
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                                        wordWrap: 'break-word',
                                        overflowWrap: 'break-word',
                                        whiteSpace: 'normal'
                                    }}>
                                        <div style={{ 
                                            color: slot.Grade === '유물' ? '#FA5D00' : slot.Grade === '전설' ? '#F99200' : '#ce43fc',
                                            fontWeight: 700,
                                            marginBottom: '0.75rem',
                                            fontSize: '0.95rem'
                                        }}>
                                            {slot.Name}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#B7FB00', marginBottom: '0.5rem' }}>
                                            코어 타입: <span dangerouslySetInnerHTML={{ __html: coreInfo.type }} /> | 의지력: <span dangerouslySetInnerHTML={{ __html: coreInfo.willpower }} /> | 질서 포인트: {totalGemPoints}
                                        </div>
                                        {coreInfo.options && (
                                            <div style={{ marginBottom: '0.75rem' }}>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--primary-gold)', marginBottom: '0.5rem' }}>코어 옵션</div>
                                                {renderOptions()}
                                            </div>
                                        )}
                                        {coreInfo.condition && (
                                            <div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--primary-gold)', marginBottom: '0.5rem' }}>발동 조건</div>
                                                <div style={{ fontSize: '0.85rem', color: '#aaa', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: coreInfo.condition }} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {slot.Gems && slot.Gems.length > 0 && (
                                    <div style={{ marginTop: '1rem', paddingLeft: '1rem', borderLeft: '2px solid #333' }}>
                                        <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.5rem' }}>장착된 젬</div>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {slot.Gems.map((gem, j) => {
                                                let gemInfo = { name: '젬', effect: '' };
                                                try {
                                                    const parsed = JSON.parse(gem.Tooltip);
                                                    gemInfo.name = parsed?.Element_000?.value?.replace(/<[^>]*>/g, '') || '젬';
                                                    gemInfo.effect = (parsed?.Element_005?.value?.Element_001 || '').replace(/<img[^>]*>/gi, '');
                                                } catch (e) {}
                                                
                                                return (
                                                    <div 
                                                        key={j} 
                                                        className="gem-item-with-tooltip"
                                                        onMouseMove={handleMouseMove}
                                                        style={{ 
                                                            position: 'relative',
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            gap: '0.5rem',
                                                            background: 'rgba(255,255,255,0.05)',
                                                            padding: '0.5rem 1rem',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <img 
                                                            src={gem.Icon} 
                                                            style={{ width: '28px', height: '28px' }} 
                                                            alt="" 
                                                        />
                                                        <span style={{ 
                                                            color: gem.Grade === '전설' ? '#F99200' : '#ce43fc',
                                                            fontSize: '0.85rem'
                                                        }}>
                                                            {gemInfo.name}
                                                        </span>
                                                        <div className="gem-tooltip-box" style={{
                                                            display: 'none',
                                                            position: 'fixed',
                                                            top: tooltipPos.y,
                                                            left: tooltipPos.x,
                                                            width: '350px',
                                                            maxHeight: '80vh',
                                                            overflowY: 'auto',
                                                            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                                                            border: '1px solid rgba(255,215,0,0.3)',
                                                            borderRadius: '8px',
                                                            padding: '1rem',
                                                            zIndex: 9999,
                                                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                                                            wordWrap: 'break-word',
                                                            overflowWrap: 'break-word',
                                                            whiteSpace: 'normal'
                                                        }}>
                                                            <div style={{ 
                                                                color: gem.Grade === '전설' ? '#F99200' : '#ce43fc',
                                                                fontWeight: 700,
                                                                marginBottom: '0.75rem',
                                                                fontSize: '0.95rem'
                                                            }} dangerouslySetInnerHTML={{ __html: gemInfo.name }} />
                                                            <div 
                                                                style={{ fontSize: '0.85rem', color: '#ccc', lineHeight: 1.6 }}
                                                                dangerouslySetInnerHTML={{ __html: gemInfo.effect }} 
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            {!fullData && !loading ? (
                <div className="hero-section">
                    <div className="hero-particles">
                        {Array.from({ length: 20 }).map((_, i) => (
                            <div key={i} className="particle" style={{
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 5}s`,
                                animationDuration: `${8 + Math.random() * 4}s`
                            }} />
                        ))}
                    </div>
                    <div className="hero-glow-orb orb-1" />
                    <div className="hero-glow-orb orb-2" />
                    <div className="hero-glow-orb orb-3" />
                    
                    <div className="hero-content">
                        <div className="hero-logo-wrap">
                            <div className="hero-emblem" />
                            <h1 className="hero-title">
                                <span className="title-lost">LOST</span>
                                <span className="title-ark">ARK</span>
                            </h1>
                            <div className="hero-subtitle">캐릭터 검색</div>
                        </div>
                        
                        <form className="search-box-premium" onSubmit={handleSearch}>
                            <div className="search-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="M21 21l-4.35-4.35" />
                                </svg>
                            </div>
                            <input 
                                type="text" 
                                className="search-input-premium" 
                                placeholder="캐릭터명을 입력하세요" 
                                value={characterName} 
                                onChange={(e) => setCharacterName(e.target.value)} 
                            />
                            <button type="submit" className="search-btn-premium">
                                <span>SEARCH</span>
                                <div className="btn-glow" />
                            </button>
                        </form>
                        
                        <div className="hero-features">
                            <div className="feature-tag">
                                <span className="tag-icon">⚔</span>
                                <span>장비 정보</span>
                            </div>
                            <div className="feature-tag">
                                <span className="tag-icon">✦</span>
                                <span>아크 패시브</span>
                            </div>
                            <div className="feature-tag">
                                <span className="tag-icon">★</span>
                                <span>원정대</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="hero-footer">
                        <div className="footer-line" />
                        <span>SEASON 3 · ARK PASSIVE SYSTEM</span>
                        <div className="footer-line" />
                    </div>
                </div>
            ) : null}

            {loading && (
                <div className="loading-screen">
                    <div className="loading-spinner"></div>
                    <h2 style={{ color: 'var(--primary-gold)', letterSpacing: '4px' }}>SYNCHRONIZING...</h2>
                </div>
            )}

            {fullData && (
                <>
                    <div className="main-tabs">
                        <div className={`main-tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>캐릭터 정보</div>
                        <div className={`main-tab ${activeTab === 'skills' ? 'active' : ''}`} onClick={() => setActiveTab('skills')}>스킬</div>
                        <div className={`main-tab ${activeTab === 'arkgrid' ? 'active' : ''}`} onClick={() => setActiveTab('arkgrid')}>아크 그리드</div>
                        <div className={`main-tab ${activeTab === 'siblings' ? 'active' : ''}`} onClick={() => setActiveTab('siblings')}>원정대 정보</div>
                    </div>

                    <div className="re-search-wrapper">
                        <form className="re-search-form" onSubmit={(e) => handleSearch(e)}>
                            <div className="re-search-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="M21 21l-4.35-4.35" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                className="re-search-input"
                                placeholder="다른 캐릭터 검색"
                                value={characterName}
                                onChange={(e) => setCharacterName(e.target.value)}
                            />
                            <button type="submit" className="re-search-btn">
                                <span>SEARCH</span>
                            </button>
                        </form>
                    </div>

                    {activeTab === 'profile' && (
                        <div className="armory-layout">
                            <div className="portrait-card">
                                <div className="portrait-frame">
                                    <img src={profile.CharacterImage || "https://via.placeholder.com/400x600"} alt="" />
                                </div>
                                <div className="identity-bar">
                                    <div className="identity-name">{profile.CharacterName}</div>
                                    <div className="identity-sub">Lv.{profile.CharacterLevel} {profile.CharacterClassName}</div>
                                </div>
                                <div className="info-list-card" style={{ marginTop: '0.5rem' }}>
                                    <span className="stat-label" style={{ marginBottom: '0.6rem' }}>전투 특성</span>
                                    <div className="stats-grid">
                                        {profile.Stats?.slice(0, 6).map((s, i) => (
                                            <div key={i} className="stat-item">
                                                <span className="stat-type">{s.Type}</span>
                                                <span className="stat-num">{s.Value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="info-list-card" style={{ marginTop: '0.5rem' }}>
                                    <span className="stat-label" style={{ marginBottom: '0.6rem' }}>성향</span>
                                    <div className="stats-grid">
                                        {profile.Tendencies?.map((t, i) => (
                                            <div key={i} className="stat-item">
                                                <span className="stat-type">{t.Type}</span>
                                                <span className="stat-num">{t.Point}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="stats-panel">
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div className="stat-box-premium" style={{ flex: 1 }}>
                                        <span className="stat-label">아이템 레벨</span>
                                        <span className="stat-value">{extractItemLevel(profile)}</span>
                                    </div>
                                    <div className="stat-box-premium" style={{ flex: 1 }}>
                                        <span className="stat-label">전투력</span>
                                        <span className="stat-value">{profile.CombatPower ? profile.CombatPower.toLocaleString() : '-'}</span>
                                    </div>
                                </div>
                                <div className="info-list-card">
                                    <div className="info-row"><span className="info-key">서버</span><span className="info-val">@{profile.ServerName}</span></div>
                                    <div className="info-row"><span className="info-key">원정대 레벨</span><span className="info-val">{profile.ExpeditionLevel}</span></div>
                                    <div className="info-row"><span className="info-key">길드</span><span className="info-val">{profile.GuildName || '-'}</span></div>
                                    <div className="info-row"><span className="info-key">칭호</span><span className="info-val">{profile.Title || '-'}</span></div>
                                </div>

                                <div className="gems-section">
                                    <div className="gems-split-container">
                                        <div className="gems-sub-section">
                                            <div className="gems-sub-header">
                                                <span className="gem-type-label damage">⚔ 공격력</span>
                                            </div>
                                            <div className="gems-horizontal-list">
                                                {(Array.isArray(gems) ? gems : gems?.Gems || [])
                                                    ?.filter(gem => getGemType(gem.Tooltip) === 'damage')
                                                    ?.sort((a, b) => (b.Level || 0) - (a.Level || 0))
                                                    ?.map((gem, i) => (
                                                        <div key={i} className="gem-icon-item">
                                                            <img src={gem.Icon} alt="" />
                                                            <div className="gem-level-badge">Lv.{gem.Level || 1}</div>
                                                            <div className="gem-tooltip-h">
                                                                <div className="tooltip-name">{stripHtml(gem.Name)}</div>
                                                                <div className="tooltip-effect">{extractGemEffect(gem.Tooltip)}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                        <div className="gems-sub-section">
                                            <div className="gems-sub-header">
                                                <span className="gem-type-label cooldown">⏱ 쿨타임</span>
                                            </div>
                                            <div className="gems-horizontal-list">
                                                {(Array.isArray(gems) ? gems : gems?.Gems || [])
                                                    ?.filter(gem => getGemType(gem.Tooltip) === 'cooldown')
                                                    ?.sort((a, b) => (b.Level || 0) - (a.Level || 0))
                                                    ?.map((gem, i) => (
                                                        <div key={i} className="gem-icon-item">
                                                            <img src={gem.Icon} alt="" />
                                                            <div className="gem-level-badge">Lv.{gem.Level || 1}</div>
                                                            <div className="gem-tooltip-h">
                                                                <div className="tooltip-name">{stripHtml(gem.Name)}</div>
                                                                <div className="tooltip-effect">{extractGemEffect(gem.Tooltip)}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="cards-section">
                                    <div className="summary-header">
                                        <span className="summary-icon card-icon">◇</span>
                                        <span>카드</span>
                                        {cardEffects[0]?.Items?.[0]?.Name && (() => {
                                            const fullName = cardEffects[0].Items[0].Name
                                            const setName = fullName.replace(/\s*\d+세트.*$/, '').replace(/\s*\(\d+각성합계\).*$/, '')
                                            return <span className="card-set-name">[ {setName} ]</span>
                                        })()}
                                        <div className="card-help-icon">
                                            <div className="card-help-tooltip">
                                                <div className="card-awake-sum">각성 합계: {totalAwake}</div>
                                                {cardEffects.map((effect, idx) => (
                                                    <div key={idx} className="card-set-effects">
                                                        {effect.Items?.map((item, i) => {
                                                            const awakeMatch = item.Name.match(/\\((\d+)각성합계\\)/)
                                                            const setMatch = item.Name.match(/(\d+)세트/)
                                                            const required = awakeMatch ? parseInt(awakeMatch[1]) : (setMatch ? parseInt(setMatch[1]) : 0)
                                                            const isActive = awakeMatch ? totalAwake >= required : (cardList.length >= required)
                                                            return (
                                                                <div key={i} className={`card-effect-item ${isActive ? 'active' : 'inactive'}`}>
                                                                    <div className="card-effect-name">{item.Name}</div>
                                                                    <div className="card-effect-desc">{item.Description}</div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="cards-horizontal-list">
                                        {cardList.map((card, i) => (
                                            <div key={i} className="card-icon-item">
                                                <img src={card.Icon} alt="" />
                                                <div className="card-awake-dots">
                                                    {[1, 2, 3, 4, 5].map(n => (
                                                        <div key={n} className={`awake-dot ${n <= (card.AwakeCount || 0) ? 'filled' : 'empty'}`} />
                                                    ))}
                                                </div>
                                                <div className="card-tooltip-h">
                                                    <div className="tooltip-name">{stripHtml(card.Name)}</div>
                                                    <div className="tooltip-awake">각성: {card.AwakeCount || 0} / {card.AwakeTotal || 5}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="stats-ark-row">
                                    <div className="summary-card-half" style={{ flex: 1 }}>
                                        <div className="summary-header">
                                            <span className="summary-icon">✦</span>
                                            <span>아크 패시브</span>
                                        </div>
                                        <div className="ark-sections">
                                            {['진화', '깨달음', '도약'].map(category => {
                                                const point = arkpassive?.Points?.find(p => p.Name === category);
                                                const effects = (Array.isArray(arkpassive?.Effects) ? arkpassive.Effects : arkpassive?.Effects?.Effects || [])
                                                    ?.filter(eff => {
                                                        const cat = getArkCategory(eff);
                                                        return cat === category || (cat === '기타' && category === '도약');
                                                    });
                                                
                                                return (
                                                    <div key={category} className="ark-section">
                                                        <div className="ark-section-header">
                                                            <span className="ark-section-title">{category}</span>
                                                            <span className="ark-section-point">{point?.Value || 0} / 120</span>
                                                        </div>
                                                        <div className="ark-section-effects">
                                                            {effects?.map((eff, i) => (
                                                                <div key={i} className="ark-eff-row">
                                                                    <img src={eff.Icon} alt="" />
                                                                    <span className="ark-eff-name">{eff.Name}</span>
                                                                    <span className="ark-eff-desc" dangerouslySetInnerHTML={{ __html: eff.Description }} />
                                                                </div>
                                                            ))}
                                                            {(!effects || effects.length === 0) && (
                                                                <span className="no-effect">효과 없음</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'skills' && (
                        <div className="skills-tab-container">
                            <div className="skills-header">
                                <h2 style={{ color: 'var(--primary-gold)', fontWeight: 900, fontSize: '2rem' }}>스킬트리</h2>
                                <button 
                                    className={`skill-code-btn ${copiedSkillCode ? 'copied' : ''}`}
                                    onClick={copySkillCode}
                                >
                                    {copiedSkillCode ? '복사 완료!' : '스킬 코드 복사'}
                                </button>
                            </div>
                            
                            {(() => {
                                const normalSkills = skills?.filter(s => s.SkillType === 0 && s.Tripods?.some(t => t.IsSelected)) || []
                                const arkSkills = skills?.filter(s => s.SkillType === 1) || []
                                const awakeningSkills = skills?.filter(s => s.SkillType === 100 || s.SkillType === 101) || []
                                
                                const renderSkillCard = (skill, i, isArk = false, isAwakening = false) => {
                                    const tierMap = { 0: 1, 1: 2, 2: 3 }
                                    
                                    return (
                                        <div key={i} className={`skill-card-full ${isArk ? 'ark' : ''} ${isAwakening ? 'awakening' : ''}`}>
                                            <div className="skill-card-header">
                                                <img src={skill.Icon} alt="" className="skill-icon-large" />
                                                <div className="skill-title-area">
                                                    <div className="skill-name-row">
                                                        <span className="skill-name-large">{skill.Name}</span>
                                                        {skill.Tripods && (() => {
                                                            const getSelectedIndex = (tier) => {
                                                                const tierTripods = skill.Tripods?.filter(t => t.Tier === tier) || []
                                                                const selected = tierTripods.find(t => t.IsSelected)
                                                                if (!selected) return null
                                                                return tierTripods.indexOf(selected) + 1
                                                            }
                                                            const t1 = getSelectedIndex(0)
                                                            const t2 = getSelectedIndex(1)
                                                            const t3 = getSelectedIndex(2)
                                                            if (!t1 && !t2 && !t3) return null
                                                            return (
                                                                <span className="tripod-indicators">
                                                                    <span className="tripod-tier t1">{t1 || '-'}</span>
                                                                    <span className="tripod-separator">/</span>
                                                                    <span className="tripod-tier t2">{t2 || '-'}</span>
                                                                    <span className="tripod-separator">/</span>
                                                                    <span className="tripod-tier t3">{t3 || '-'}</span>
                                                                </span>
                                                            )
                                                        })()}
                                                    </div>
                                                    <div className="skill-meta">
                                                        <span className="skill-level">Lv.{skill.Level}</span>
                                                        <span className="skill-type">{skill.Type}</span>
                                                    </div>
                                                    {skill.Rune && (
                                                        <div className="skill-rune-info">
                                                            <img src={skill.Rune.Icon} alt="" />
                                                            <span>{skill.Rune.Name}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {skill.Tripods && skill.Tripods.length > 0 && (
                                                <div className="skill-tripods-list">
                                                    {[0, 1, 2].map(tier => {
                                                        const tierTripods = skill.Tripods?.filter(t => t.Tier === tier) || []
                                                        if (tierTripods.length === 0) return null
                                                        const hasSelected = tierTripods.some(t => t.IsSelected)
                                                        
                                                        return (
                                                            <div key={tier} className={`tripod-tier-group ${hasSelected ? 'has-selected' : ''}`}>
                                                                <div className="tier-label">T{tierMap[tier]}</div>
                                                                <div className="tier-options">
                                                                    {tierTripods.map((tripod, j) => (
                                                                        <div 
                                                                            key={j} 
                                                                            className={`tripod-option ${tripod.IsSelected ? 'selected' : ''}`}
                                                                        >
                                                                            {tripod.Name}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )
                                }
                                
                                return (
                                    <>
                                        {normalSkills.length > 0 && (
                                            <div className="skill-category-section">
                                                <h3 className="skill-category-title">일반 스킬</h3>
                                                <div className="skills-list-full">
                                                    {normalSkills.map((skill, i) => renderSkillCard(skill, i))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {arkSkills.length > 0 && (
                                            <div className="skill-category-section">
                                                <h3 className="skill-category-title ark">아크 스킬</h3>
                                                <div className="skills-list-full">
                                                    {arkSkills.map((skill, i) => renderSkillCard(skill, i, true))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {awakeningSkills.length > 0 && (
                                            <div className="skill-category-section">
                                                <h3 className="skill-category-title awakening">각성기</h3>
                                                <div className="skills-list-full">
                                                    {awakeningSkills.map((skill, i) => renderSkillCard(skill, i, false, true))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )
                            })()}
                        </div>
                    )}

                    {activeTab === 'arkgrid' && renderArkGridView()}

                    {activeTab === 'siblings' && (
                        <div style={{ animation: 'slideUp 0.5s ease' }}>
                            <h2 style={{ marginBottom: '2rem', fontSize: '2.5rem', fontWeight: 900, color: 'var(--primary-gold)' }}>원정대 정보</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                {siblings?.sort((a, b) => parseFloat(extractItemLevel(b)) - parseFloat(extractItemLevel(a))).map((sib, i) => (
                                    <div key={i} className="stat-box-premium" style={{ cursor: 'pointer', textAlign: 'left', padding: '1.5rem' }} onClick={() => handleSearch(null, sib.CharacterName)}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginBottom: '5px' }}>{sib.CharacterName}</div>
                                        <div style={{ color: 'var(--primary-gold)', fontWeight: 800, fontSize: '1.2rem' }}>Lv.{extractItemLevel(sib)}</div>
                                        <div style={{ color: 'var(--text-secondary)', marginTop: '5px' }}>{sib.CharacterClassName}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default App
