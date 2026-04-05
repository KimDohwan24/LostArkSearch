import { useState, useEffect } from 'react'
import './index.css'

function App() {
    const [characterName, setCharacterName] = useState('')
    const [fullData, setFullData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [activeTab, setActiveTab] = useState('profile')
    const [arkSubTab, setArkSubTab] = useState('깨달음')
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
    const [goldData, setGoldData] = useState([])
    const [calculatingGold, setCalculatingGold] = useState(false)
    const [raidInfoData, setRaidInfoData] = useState([])
    const [loadingRaidInfo, setLoadingRaidInfo] = useState(false)
    const [selectedRaidName, setSelectedRaidName] = useState('')
    const [selectedDifficulty, setSelectedDifficulty] = useState('')
    const [goldEarners, setGoldEarners] = useState([])
    
    // History & Favorites state
    const [recentSearches, setRecentSearches] = useState(() => {
        try { return JSON.parse(localStorage.getItem('recentSearches') || '[]'); } 
        catch (e) { return []; }
    });
    const [favorites, setFavorites] = useState(() => {
        try { return JSON.parse(localStorage.getItem('favorites') || '[]'); } 
        catch (e) { return []; }
    });

    useEffect(() => {
        localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
    }, [recentSearches]);

    useEffect(() => {
        localStorage.setItem('favorites', JSON.stringify(favorites));
    }, [favorites]);

    useEffect(() => {
        const calculateGold = async () => {
            if (!fullData?.siblings || fullData.siblings.length === 0) return;
            setCalculatingGold(true);
            try {
                const res = await fetch('/api/raids');
                const allRaids = await res.json();
                
                const getLevel = (char) => {
                    const itemLv = char.ItemMaxLevel || char.itemMaxLevel || char.ItemAvgLevel || char.itemAvgLevel;
                    return itemLv ? parseFloat(String(itemLv).replace(/,/g, '')) : 0;
                };

                const allChars = [...fullData.siblings]
                    .sort((a, b) => getLevel(b) - getLevel(a));
                
                if (goldEarners.length === 0) {
                    setGoldEarners(allChars.slice(0, 6).map(c => c.CharacterName));
                }

                const charGoldInfo = allChars.map((char) => {
                    const charLevel = getLevel(char);
                    const availableSteps = allRaids.filter(r => r.level <= charLevel && r.difficulty !== '싱글');
                    
                    const raidMap = {}; 
                    availableSteps.forEach(r => {
                        if (!raidMap[r.name]) raidMap[r.name] = {};
                        if (!raidMap[r.name][r.difficulty]) raidMap[r.name][r.difficulty] = 0;
                        raidMap[r.name][r.difficulty] += r.gold;
                    });
                    
                    const bestRaids = [];
                    for (const name in raidMap) {
                        let bestDiff = '';
                        let maxGold = 0;
                        for (const diff in raidMap[name]) {
                            if (raidMap[name][diff] > maxGold) {
                                maxGold = raidMap[name][diff];
                                bestDiff = diff;
                            }
                        }
                        bestRaids.push({ name, difficulty: bestDiff, gold: maxGold });
                    }
                    
                    bestRaids.sort((a, b) => b.gold - a.gold);
                    const top3 = bestRaids.slice(0, 3);
                    const totalGold = top3.reduce((sum, r) => sum + r.gold, 0);
                    
                    return {
                        characterName: char.CharacterName,
                        className: char.CharacterClassName,
                        level: charLevel,
                        top3Raids: top3,
                        totalGold
                    };
                });
                
                setGoldData(charGoldInfo);
            } catch (err) {
                console.error("Gold calculate error:", err);
            } finally {
                setCalculatingGold(false);
            }
        };
        
        if (activeTab === 'gold' && fullData?.siblings?.length > 0 && goldData.length === 0) {
            calculateGold();
        }
    }, [activeTab, fullData?.siblings, goldData.length]);

    useEffect(() => {
        const fetchRaidInfo = async () => {
            setLoadingRaidInfo(true);
            try {
                const res = await fetch('/api/raids');
                const allRaids = await res.json();
                
                const raidMap = {};
                allRaids.forEach(r => {
                    if (!raidMap[r.name]) {
                        raidMap[r.name] = { name: r.name, minLevel: 9999, difficulties: {} };
                    }
                    if (r.level < raidMap[r.name].minLevel && r.difficulty !== '싱글') {
                        raidMap[r.name].minLevel = r.level;
                    }
                    
                    if (!raidMap[r.name].difficulties[r.difficulty]) {
                        raidMap[r.name].difficulties[r.difficulty] = {
                            difficulty: r.difficulty,
                            level: r.level,
                            steps: []
                        };
                    }
                    raidMap[r.name].difficulties[r.difficulty].steps.push(r);
                });
                
                const raidArray = Object.values(raidMap).sort((a, b) => a.minLevel - b.minLevel);
                setRaidInfoData(raidArray);
                if (raidArray.length > 0) {
                    setSelectedRaidName(raidArray[0].name);
                    const diffs = Object.keys(raidArray[0].difficulties);
                    if (diffs.length > 0) setSelectedDifficulty(diffs[0]);
                }
            } catch(e) {
                console.error("Raid fetch info error:", e);
            } finally {
                setLoadingRaidInfo(false);
            }
        };

        if (activeTab === 'raidInfo' && raidInfoData.length === 0) {
            fetchRaidInfo();
        }
    }, [activeTab, raidInfoData.length]);

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
                    // 블레이드, 데모닉 등 알려진 직업명만 괄호 안에서 제거하여, '버스트' 등 이름이 훼손되지 않게 함.
                    .replace(/\[(워로드|버서커|디스트로이어|홀리나이트|슬레이어|스트라이커|배틀마스터|인파이터|기공사|창술사|브레이커|데빌헌터|블래스터|호크아이|스카우터|건슬링어|바드|서머너|아르카나|소서리스|블레이드|데모닉|리퍼|소울이터|도화가|기상술사|암살자|전사|무도가|마법사|헌터|스페셜리스트)\]\s*/gi, '')
                    .replace(/\[.*?\]\s*/gi, '') // 그래도 남는 태그 대비용이긴 하나, 위에서 주요 직업이 제거됨
                    .trim()
                return cleanEffect
            }
        } catch (e) {}
        return ''
    }

    const getGemSkillIcon = (gem, skillList) => {
        if (!gem?.Tooltip) return null;
        
        // 1. Tooltip URL 정규식 (따옴표 종류 무관하게 URL 파싱)
        try {
            const urlMatches = gem.Tooltip.matchAll(/(https:\/\/cdn-lostark\.game\.onstove\.com\/[^'"\\]+\.png)/gi);
            for (const match of urlMatches) {
                const src = match[1];
                if (src && !src.includes('emoticon') && !src.includes('grade') && !src.includes('tier') && src.includes('skill')) {
                    return src;
                }
            }
        } catch(e) {}

        // 2. 텍스트 매칭
        if (skillList) {
            // 원본 툴팁에서 직접 스킬명 매칭 (직업명 제거 등으로 훼손되기 전 상태 우선 검사)
            const rawTooltip = gem.Tooltip.replace(/<[^>]*>/g, '');
            for (const s of skillList) {
                if (rawTooltip.includes(s.Name)) {
                    return s.Icon;
                }
            }
        }

        // 3. 특별 아이덴티티 스킬 고정 이미지 (텍스트에 특정 문자열 포함 시)
        // 공식 CDN 주소 난독화로 실시간 파싱이 어려운 직업 전용 스킬들은 아래에 이미지 주소를 등록합니다.
        const IDENTITY_ICONS = {
            '버스트': 'https://cdn-lostark.game.onstove.com/efui_iconatlas/bl_skill/bl_skill_01_21.png', // 실제 버스트 스킬 인게임 아이콘
            '악마화': 'https://cdn-lostark.game.onstove.com/2018/obt/assets/images/pc/profile/demonic.png',
            '싱크': 'https://cdn-lostark.game.onstove.com/2018/obt/assets/images/pc/profile/scouter.png',
            '포격': 'https://cdn-lostark.game.onstove.com/2018/obt/assets/images/pc/profile/blaster.png'
        };

        const rawTooltipStr = gem.Tooltip.replace(/<[^>]*>/g, '');
        for (const [key, iconUrl] of Object.entries(IDENTITY_ICONS)) {
            if (rawTooltipStr.includes(key)) return iconUrl;
        }

        return null;
    }

    const getGemType = (tooltip) => {
        const effect = extractGemEffect(tooltip)
        if (effect.includes('공격력') || effect.includes('피해')) return 'damage'
        if (effect.includes('쿨타임') || effect.includes('재사용')) return 'cooldown'
        return 'unknown'
    }

    const handleGoHome = () => {
        setFullData(null);
        setCharacterName('');
        setGoldData([]);
        setGoldEarners([]);
        setRaidInfoData([]);
        setError(null);
    };

    const handleSearch = async (e, nameToSearch = null) => {
        if (e) e.preventDefault()
        const targetName = nameToSearch || characterName
        if (!targetName) return

        if (nameToSearch) setCharacterName(nameToSearch)

        setLoading(true)
        setError(null)
        setFullData(null)
        setGoldData([])
        setGoldEarners([])

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
            
            // Save to recent searches
            setRecentSearches(prev => {
                const newSearches = [targetName, ...prev.filter(name => name !== targetName)].slice(0, 10);
                return newSearches;
            });
        } catch (err) {
            console.error("[DEBUG] Search Error:", err);
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const toggleGoldEarner = (charName) => {
        setGoldEarners(prev => {
            if (prev.includes(charName)) {
                return prev.filter(name => name !== charName);
            } else {
                if (prev.length >= 6) {
                    alert('골드 획득 지정은 최대 6캐릭터까지만 가능합니다.');
                    return prev;
                }
                return [...prev, charName];
            }
        });
    };

    const toggleFavorite = (name, e) => {
        if (e) e.stopPropagation();
        setFavorites(prev => {
            if (prev.includes(name)) {
                return prev.filter(f => f !== name);
            } else {
                return [...prev, name];
            }
        });
    };

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

                        {/* Recent Searches & Favorites */}
                        {(recentSearches.length > 0 || favorites.length > 0) && (
                            <div className="history-favorites-container" style={{ marginTop: '3rem', width: '100%', display: 'flex', gap: '2rem', textAlign: 'left', animation: 'fadeInUp 1s ease-out 0.8s backwards' }}>
                                {favorites.length > 0 && (
                                    <div className="fav-section" style={{ flex: 1, background: 'rgba(10, 14, 20, 0.6)', border: '1px solid rgba(255, 215, 0, 0.2)', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                                        <div style={{ color: 'var(--primary-gold)', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '1.2rem' }}>★</span> 나의 즐겨찾기
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {favorites.map((name, i) => (
                                                <div key={i} className="history-pill" style={{ display: 'flex', alignItems: 'center', background: 'rgba(200, 161, 77, 0.1)', padding: '8px 14px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid rgba(200, 161, 77, 0.3)' }} onClick={() => handleSearch(null, name)}>
                                                    <span style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 600 }}>{name}</span>
                                                    <button onClick={(e) => toggleFavorite(name, e)} style={{ background: 'none', border: 'none', color: '#ffb300', marginLeft: '8px', cursor: 'pointer', padding: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center' }}>★</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {recentSearches.length > 0 && (
                                    <div className="recent-section" style={{ flex: 1, background: 'rgba(10, 14, 20, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                                        <div style={{ color: '#aaa', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '1.2rem' }}>🕒</span> 최근 검색 기록
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {recentSearches.map((name, i) => (
                                                <div key={i} className="history-pill" style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '8px 14px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.1)' }} onClick={() => handleSearch(null, name)}>
                                                    <span style={{ fontSize: '0.95rem', color: '#ccc' }}>{name}</span>
                                                    <button onClick={(e) => {
                                                        e.stopPropagation();
                                                        setRecentSearches(prev => prev.filter(n => n !== name));
                                                    }} style={{ background: 'none', border: 'none', color: '#888', marginLeft: '8px', cursor: 'pointer', padding: 0, fontSize: '1rem', display: 'flex', alignItems: 'center' }}>✕</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
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
                        <button 
                            className="home-btn" 
                            title="메인 화면으로"
                            onClick={handleGoHome}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                        </button>
                        <div className={`main-tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>캐릭터 정보</div>
                        <div className={`main-tab ${activeTab === 'skills' ? 'active' : ''}`} onClick={() => setActiveTab('skills')}>스킬</div>
                        <div className={`main-tab ${activeTab === 'arkgrid' ? 'active' : ''}`} onClick={() => setActiveTab('arkgrid')}>아크 그리드</div>
                        <div className={`main-tab ${activeTab === 'siblings' ? 'active' : ''}`} onClick={() => setActiveTab('siblings')}>원정대 정보</div>
                        <div className={`main-tab ${activeTab === 'gold' ? 'active' : ''}`} onClick={() => setActiveTab('gold')}>주간 레이드 골드</div>
                        <div className={`main-tab ${activeTab === 'raidInfo' ? 'active' : ''}`} onClick={() => setActiveTab('raidInfo')}>레이드 정보</div>
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
                                    <div className="identity-name" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                        {profile.CharacterName}
                                        <button 
                                            onClick={(e) => toggleFavorite(profile.CharacterName, e)}
                                            style={{ background: 'none', border: 'none', fontSize: '2.2rem', cursor: 'pointer', color: favorites.includes(profile.CharacterName) ? '#ffb300' : '#555', transition: 'color 0.2s', display: 'flex', alignItems: 'center' }}
                                            title="즐겨찾기"
                                        >
                                            {favorites.includes(profile.CharacterName) ? '★' : '☆'}
                                        </button>
                                    </div>
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
                                                            <div className="gem-images-wrapper">
                                                                <img src={gem.Icon} alt="" className="main-gem-img" />
                                                                {(() => {
                                                                    const skillIcon = getGemSkillIcon(gem, skills);
                                                                    return skillIcon ? <img src={skillIcon} alt="" className="gem-skill-mini-icon" /> : null;
                                                                })()}
                                                            </div>
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
                                                            <div className="gem-images-wrapper">
                                                                <img src={gem.Icon} alt="" className="main-gem-img" />
                                                                {(() => {
                                                                    const skillIcon = getGemSkillIcon(gem, skills);
                                                                    return skillIcon ? <img src={skillIcon} alt="" className="gem-skill-mini-icon" /> : null;
                                                                })()}
                                                            </div>
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
                            </div>
                            
                            {(() => {
                                const normalSkills = skills?.filter(s => s.SkillType === 0 && s.Tripods?.some(t => t.IsSelected)) || []
                                const arkSkills = skills?.filter(s => s.SkillType === 1) || []
                                const awakeningSkills = skills?.filter(s => s.SkillType === 100 || s.SkillType === 101) || []
                                
                                const renderSkillCard = (skill, i, isArk = false, isAwakening = false) => {
                                    const tierMap = { 0: 1, 1: 2, 2: 3 }
                                    const skillGems = (Array.isArray(gems) ? gems : gems?.Gems || [])
                                        .filter(gem => {
                                            if (!gem.Tooltip) return false;
                                            const rawTooltip = gem.Tooltip.replace(/<[^>]*>/g, "");
                                            return rawTooltip.includes(skill.Name);
                                        })
                                        .sort((a, b) => {
                                            const typeA = getGemType(a.Tooltip);
                                            const typeB = getGemType(b.Tooltip);
                                            if (typeA === 'damage' && typeB !== 'damage') return -1;
                                            if (typeA !== 'damage' && typeB === 'damage') return 1;
                                            return (b.Level || 0) - (a.Level || 0);
                                        });
                                    
                                    return (
                                        <div key={i} className={`skill-card-full ${isArk ? 'ark' : ''} ${isAwakening ? 'awakening' : ''}`}>
                                            <div className="skill-card-header">
                                                <img src={skill.Icon} alt="" className="skill-icon-large" />
                                                <div className="skill-title-area">
                                                    <div className="skill-name-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                                            {skillGems.length > 0 && (
                                                <div className="skill-gems-bottom" style={{ padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.15)', borderRadius: '6px', marginTop: '0.5rem', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600, marginRight: '4px' }}>보석 효과</span>
                                                    {skillGems.map((gem, gi) => {
                                                        const isDamage = getGemType(gem.Tooltip) === 'damage';
                                                        const isCooldown = getGemType(gem.Tooltip) === 'cooldown';
                                                        const gemLabel = isDamage ? '피해' : (isCooldown ? '감소' : '');
                                                        return (
                                                            <div key={gi} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                                <img src={gem.Icon} alt="" style={{ width: '18px', height: '18px' }} />
                                                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isDamage ? '#F99200' : (isCooldown ? '#49c2ff' : '#ccc') }}>
                                                                    Lv.{gem.Level || 1} {gemLabel}
                                                                </span>
                                                            </div>
                                                        );
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

                    {activeTab === 'gold' && (
                        <div style={{ animation: 'slideUp 0.5s ease' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                                <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--primary-gold)', margin: 0 }}>주간 레이드 골드 획득량</h2>
                                {!calculatingGold && goldData.length > 0 && (
                                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #ffd700', whiteSpace: 'nowrap' }}>
                                        원정대 총 수익: <span style={{ color: '#ffd700' }}>{goldData.filter(d => goldEarners.includes(d.characterName)).reduce((sum, d) => sum + d.totalGold, 0).toLocaleString()} 골드</span>
                                    </div>
                                )}
                            </div>

                            {calculatingGold ? (
                                <div className="stat-box-premium" style={{ padding: '3rem', textAlign: 'center' }}>
                                    <div className="loading-spinner" style={{ margin: '0 auto 1rem auto' }}></div>
                                    <div style={{ color: 'var(--primary-gold)', fontWeight: 700, letterSpacing: '2px' }}>CALCULATING EARNINGS...</div>
                                </div>
                            ) : goldData.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                                    {goldData.map((data, i) => {
                                        const isEarner = goldEarners.includes(data.characterName);
                                        return (
                                            <div key={i} className="stat-box-premium" style={{ textAlign: 'left', padding: '1.5rem', opacity: isEarner ? 1 : 0.6, position: 'relative', transition: 'opacity 0.2s ease' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.8rem' }}>
                                                    <div>
                                                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {data.characterName}
                                                            <button 
                                                                onClick={() => toggleGoldEarner(data.characterName)}
                                                                style={{ 
                                                                    fontSize: '0.75rem', 
                                                                    fontWeight: 700, 
                                                                    border: isEarner ? '1px solid var(--primary-gold)' : '1px solid #555', 
                                                                    background: isEarner ? 'var(--primary-gold)' : 'transparent',
                                                                    color: isEarner ? '#000' : '#888',
                                                                    padding: '2px 8px', 
                                                                    borderRadius: '4px', 
                                                                    letterSpacing: '0',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s ease'
                                                                }}
                                                            >
                                                                {isEarner ? '수익 포함' : '수익 제외'}
                                                            </button>
                                                        </div>
                                                        <div style={{ color: '#aaa', fontSize: '0.9rem', marginTop: '4px' }}>Lv.{data.level} | {data.className}</div>
                                                    </div>
                                                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: isEarner ? 'var(--primary-gold)' : '#888' }}>
                                                        {data.totalGold.toLocaleString()} 골드
                                                    </div>
                                                </div>
                                            
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {data.top3Raids.map((raid, j) => (
                                                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '0.8rem 1rem', borderRadius: '6px' }}>
                                                        <span style={{ color: '#ddd' }}>{raid.name} <span style={{ fontSize: '0.8rem', color: raid.difficulty === '하드' ? '#ff6060' : '#49c2ff', marginLeft: '4px' }}>[{raid.difficulty}]</span></span>
                                                        <span style={{ color: '#ffd700', fontWeight: 600 }}>{raid.gold.toLocaleString()}G</span>
                                                    </div>
                                                ))}
                                                {data.top3Raids.length === 0 && (
                                                    <div style={{ color: '#777', textAlign: 'center', padding: '1rem 0' }}>입장 가능한 레이드가 없습니다.</div>
                                                )}
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="stat-box-premium" style={{ padding: '3rem', textAlign: 'center' }}>
                                    <div style={{ color: '#aaa', fontSize: '1rem' }}>데이터를 불러올 수 없거나 캐릭터 정보가 없습니다.</div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'raidInfo' && (() => {
                        const currentRaid = raidInfoData.find(r => r.name === selectedRaidName);
                        const currentDifficultyData = currentRaid && currentRaid.difficulties ? currentRaid.difficulties[selectedDifficulty] : null;

                        return (
                            <div style={{ animation: 'slideUp 0.5s ease' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                                    <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#49c2ff', margin: 0 }}>상세 레이드 정보</h2>
                                    <div style={{ fontSize: '1rem', color: '#aaa' }}>보스 및 난이도 선택 방식</div>
                                </div>

                                {loadingRaidInfo ? (
                                    <div className="stat-box-premium" style={{ padding: '3rem', textAlign: 'center' }}>
                                        <div className="loading-spinner" style={{ margin: '0 auto 1rem auto' }}></div>
                                        <div style={{ color: '#49c2ff', fontWeight: 700, letterSpacing: '2px' }}>LOADING RAID DATA...</div>
                                    </div>
                                ) : raidInfoData.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        <div className="stat-box-premium" style={{ padding: '1.5rem' }}>
                                            <div style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '0.8rem' }}>참여할 레이드 보스</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1.5rem' }}>
                                                {raidInfoData.map(r => (
                                                    <button 
                                                        key={r.name}
                                                        onClick={() => {
                                                            setSelectedRaidName(r.name);
                                                            const diffs = Object.keys(r.difficulties);
                                                            setSelectedDifficulty(diffs[0] || '');
                                                        }}
                                                        style={{
                                                            padding: '0.6rem 1.2rem', 
                                                            borderRadius: '8px', 
                                                            background: selectedRaidName === r.name ? 'var(--primary-gold)' : 'rgba(255,255,255,0.05)',
                                                            color: selectedRaidName === r.name ? '#000' : '#ccc',
                                                            fontWeight: selectedRaidName === r.name ? 900 : 500,
                                                            border: selectedRaidName === r.name ? '1px solid var(--primary-gold)' : '1px solid rgba(255,255,255,0.1)',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            fontSize: '1rem'
                                                        }}
                                                    >
                                                        {r.name}
                                                    </button>
                                                ))}
                                            </div>

                                            {currentRaid && currentRaid.difficulties && (
                                                <>
                                                    <div style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '0.8rem' }}>난이도</div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                                                        {Object.keys(currentRaid.difficulties).map(d => (
                                                            <button 
                                                                key={d}
                                                                onClick={() => setSelectedDifficulty(d)}
                                                                style={{
                                                                    padding: '0.5rem 1rem', 
                                                                    borderRadius: '8px', 
                                                                    background: selectedDifficulty === d 
                                                                        ? (d === '하드' ? 'rgba(255, 96, 96, 0.2)' : 'rgba(73, 194, 255, 0.2)') 
                                                                        : 'transparent',
                                                                    color: selectedDifficulty === d 
                                                                        ? (d === '하드' ? '#ff6060' : '#49c2ff') 
                                                                        : '#888',
                                                                    fontWeight: selectedDifficulty === d ? 800 : 500,
                                                                    border: selectedDifficulty === d 
                                                                        ? (d === '하드' ? '1px solid #ff6060' : '1px solid #49c2ff') 
                                                                        : '1px solid rgba(255,255,255,0.1)',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s ease',
                                                                    fontSize: '0.95rem'
                                                                }}
                                                            >
                                                                {d}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {currentDifficultyData && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                                                {currentDifficultyData.steps.sort((a,b) => a.step - b.step).map((step, k) => (
                                                    <div key={k} className="stat-box-premium" style={{ padding: '1.5rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.8rem' }}>
                                                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff' }}>{step.step}관문</div>
                                                            <div style={{ fontSize: '1rem', color: '#aaa' }}>입장 레벨: <span style={{ color: 'var(--primary-gold)' }}>Lv.{step.level}</span></div>
                                                        </div>

                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '6px' }}>
                                                                <span style={{ color: '#ccc' }}>클리어 골드</span>
                                                                <span style={{ color: 'var(--primary-gold)', fontWeight: 700 }}>{step.gold.toLocaleString()}G</span>
                                                            </div>
                                                            
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '6px' }}>
                                                                <span style={{ color: '#ccc' }}>더보기 비용</span>
                                                                <span style={{ color: '#ff6b6b', fontWeight: 700 }}>-{step.rewardMoreGoldCost.toLocaleString()}G</span>
                                                            </div>

                                                            {step.rewardItems?.default?.length > 0 && (
                                                                <div style={{ marginTop: '0.5rem' }}>
                                                                    <div style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '0.5rem' }}>기본 보상 재료</div>
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                                        {step.rewardItems.default.map((rtm, ri) => (
                                                                            <span key={ri} style={{ background: 'rgba(73, 194, 255, 0.1)', color: '#49c2ff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                                                                                {rtm.reward} x{rtm.count}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {step.rewardItems?.more?.length > 0 && (
                                                                <div style={{ marginTop: '0.5rem' }}>
                                                                    <div style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '0.5rem' }}>더보기 보상 재료</div>
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                                        {step.rewardItems.more.map((rtm, ri) => (
                                                                            <span key={ri} style={{ background: 'rgba(255, 215, 0, 0.1)', color: 'var(--primary-gold)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                                                                                {rtm.reward} x{rtm.count}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="stat-box-premium" style={{ padding: '3rem', textAlign: 'center' }}>
                                        <div style={{ color: '#aaa', fontSize: '1rem' }}>레이드 정보를 불러올 수 없습니다.</div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </>
            )}
        </div>
    )
}

export default App
