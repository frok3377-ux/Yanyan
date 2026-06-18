/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { TimelineEvent, Character, EventType, SentimentType } from '../types';
import { Calendar, MessageSquare, Search, Sparkles, SlidersHorizontal, Info, Navigation, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TimelineViewProps {
  events: TimelineEvent[];
  characters: Character[];
  onSelectEvent?: (event: TimelineEvent) => void;
}

export default function TimelineView({ events, characters, onSelectEvent }: TimelineViewProps) {
  const [filterType, setFilterType] = useState<string>("all"); // all, Heidi, Angie, narrative, important
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeAnchor, setActiveAnchor] = useState<string>("");
  const [currentVisibleDate, setCurrentVisibleDate] = useState<string>("");

  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Group characters by ID for fast lookup
  const characterMap = React.useMemo(() => {
    return characters.reduce((acc, char) => {
      acc[char.id] = char;
      return acc;
    }, {} as Record<string, Character>);
  }, [characters]);

  // Filtering events based on user selections
  const filteredEvents = React.useMemo(() => {
    // Safe timestamp fetcher helper for stable sorting
    const getEventTimestamp = (ev: TimelineEvent): number => {
      if (!ev.createdAt) return 0;
      if (typeof ev.createdAt === 'number') return ev.createdAt;
      if (ev.createdAt?.seconds) return ev.createdAt.seconds * 1000 + Math.floor((ev.createdAt.nanoseconds || 0) / 1000000);
      if (ev.createdAt?.toMillis) return ev.createdAt.toMillis();
      if (ev.createdAt instanceof Date) return ev.createdAt.getTime();
      const ms = Date.parse(ev.createdAt);
      return isNaN(ms) ? 0 : ms;
    };

    return events
      .filter(event => {
        // Character filters
        if (filterType === "Heidi" && event.characterId !== "Heidi" && event.characterId !== "Albee" && event.receiverId !== "Heidi" && event.receiverId !== "Albee" && !((event.characterId === "Hugo" || event.characterId === "Ivan") && (event.content.includes("Heidi") || event.content.includes("Albee")))) return false;
        if (filterType === "Angie" && event.characterId !== "Angie" && event.characterId !== "Chloe" && event.receiverId !== "Angie" && event.receiverId !== "Chloe" && !((event.characterId === "Hugo" || event.characterId === "Ivan") && (event.content.includes("Angie") || event.content.includes("Chloe")))) return false;
        // Type filters
        if (filterType === "narrative" && event.type !== EventType.NARRATIVE) return false;
        if (filterType === "important" && !event.isImportant) return false;

        // Search query filter
        if (searchQuery.trim() !== "") {
          const query = searchQuery.toLowerCase();
          const contentMatch = event.content.toLowerCase().includes(query);
          const dateMatch = event.date.includes(query);
          const charName = characterMap[event.characterId]?.name?.toLowerCase() || "";
          const charMatch = charName.includes(query);
          return contentMatch || dateMatch || charMatch;
        }

        return true;
      })
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        
        const timeCompare = a.time.localeCompare(b.time);
        if (timeCompare !== 0) return timeCompare;
        
        // Stable sort: when dates are equal, sort by actual database insertion order
        const aMs = getEventTimestamp(a);
        const bMs = getEventTimestamp(b);
        return aMs - bMs || (a.order || 0) - (b.order || 0) || a.id.localeCompare(b.id);
      });
  }, [events, filterType, searchQuery, characterMap]);

  // Extract critical anchoring milestones (important dates & system markers)
  const anchorMilestones = React.useMemo(() => {
    return events
      .filter(e => e.isImportant || e.type === EventType.MARKER)
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        const timeCompare = a.time.localeCompare(b.time);
        if (timeCompare !== 0) return timeCompare;
        return (a.order || 0) - (b.order || 0);
      });
  }, [events]);

  // Scroll smoothly to a specific event ID and mark as active
  const handleAnchorClick = (eventId: string, date: string) => {
    setActiveAnchor(eventId);
    
    // Check if the event is in the currently filtered list
    const isEventVisible = filteredEvents.some(e => e.id === eventId);
    
    if (!isEventVisible) {
      // Safety reset filters so that the target event becomes visible
      setFilterType("all");
      setSearchQuery("");
    }

    // Use setTimeout to allow the re-render to complete if filters were reset
    setTimeout(() => {
      const element = document.getElementById(`event-card-${eventId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add a brief subtle flash animation to highlighted block
        element.classList.add("ring-2", "ring-[#128c7e]", "duration-1000");
        setTimeout(() => {
          element.classList.remove("ring-2", "ring-[#128c7e]");
        }, 2000);
      }
    }, isEventVisible ? 50 : 250);
  };

  // Watch screen scrolling to update active display date badge
  React.useEffect(() => {
    if (filteredEvents.length > 0) {
      const firstEvent = filteredEvents[0];
      const dateSplit = firstEvent.date.split("-");
      const formatted = dateSplit.length >= 3 ? `${dateSplit[1]}月${dateSplit[2]}日` : firstEvent.date;
      setCurrentVisibleDate(formatted);
    } else {
      setCurrentVisibleDate("");
    }

    const handleScroll = () => {
      const cards = document.querySelectorAll('[id^="event-card-"]');
      let currentTopDate = "";
      
      const threshold = window.innerWidth < 768 ? 140 : 190;
      let minDistance = Infinity;

      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const distance = Math.abs(rect.top - threshold);
        
        if (distance < minDistance) {
          minDistance = distance;
          const id = card.id.replace("event-card-", "");
          const ev = filteredEvents.find(e => e.id === id);
          if (ev) {
            currentTopDate = ev.date;
          }
        }
      });

      if (currentTopDate) {
        const dateSplit = currentTopDate.split("-");
        const formatted = dateSplit.length >= 3 ? `${dateSplit[1]}月${dateSplit[2]}日` : currentTopDate;
        setCurrentVisibleDate(formatted);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    const timer = setTimeout(handleScroll, 100);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timer);
    };
  }, [filteredEvents]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 relative font-sans" id="timeline-explorer">
      
      {/* LEFT AREA: Floating Chronicle Date & Landmark Anchor Hub */}
      <div className="xl:col-span-3 order-1 xl:order-1">
        <div className="xl:sticky xl:top-24 space-y-4 bg-white/90 p-5 rounded-xl border border-[#e9edef] shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
            <Navigation className="w-4 h-4 text-[#128c7e]" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#128c7e] font-bold">Chronicle • 時空定位</span>
          </div>
          <p className="text-xs text-slate-500 pb-2 leading-relaxed font-light">
            快照定位：點擊下方關鍵里程碑，即可將對話流平滑滾動並錨定至對應的歷史紀錄中。
          </p>
 
          <div className="flex xl:flex-col gap-2 overflow-x-auto pb-2 xl:pb-0 scrollbar-none max-h-[300px] xl:max-h-[500px] overflow-y-auto">
            {anchorMilestones.map((milestone) => {
              const character = characterMap[milestone.characterId];
              const isActive = activeAnchor === milestone.id;
              
              // Format date readable
              const dateSplit = milestone.date.split("-");
              const formattedDate = dateSplit.length >= 3 ? `${dateSplit[1]}月${dateSplit[2]}日` : milestone.date;

              // Safe resolve of indicator dot color and character label
              let resolvedColor = "rgb(148, 163, 184)"; // default slate gray color
              let resolvedName = milestone.characterId;

              if (character) {
                resolvedColor = character.color;
                resolvedName = character.name.replace(/🌴|豬🐽|小公主👸/g, '').trim() || character.name;
              } else {
                // Legacy system or auto-cleaning fallback logic 
                const cidNorm = milestone.characterId.toLowerCase();
                if (cidNorm === "heidi" || cidNorm === "albee" || cidNorm.includes("豬") || cidNorm.includes("girl")) {
                  resolvedColor = "#ec4899"; // Heidi's trademark pink
                  resolvedName = "Heidi";
                } else if (cidNorm === "angie" || cidNorm === "chloe" || cidNorm.includes("公主")) {
                  resolvedColor = "#eab308"; // Angie's characteristic amber yellow
                  resolvedName = "Angie";
                } else if (cidNorm === "hugo" || cidNorm === "ivan" || cidNorm.includes("樹仁")) {
                  resolvedColor = "#128c7e"; // Hugo's brand green
                  resolvedName = "Hugo";
                }
              }
 
              return (
                <button
                  key={milestone.id}
                  onClick={() => handleAnchorClick(milestone.id, milestone.date)}
                  className={`flex-shrink-0 text-left w-[180px] xl:w-full p-2.5 rounded xl:rounded-lg border text-xs transition-all duration-300 flex items-start gap-2.5 group cursor-pointer ${
                    isActive 
                      ? "bg-[#d9fdd3] border-[#128c7e]/30 shadow-sm" 
                      : "bg-slate-50/70 border-slate-100 hover:bg-[#f0f2f5] hover:border-slate-200"
                  }`}
                >
                  <Calendar className={`w-3.5 h-3.5 mt-0.5 ${isActive ? "text-[#128c7e]" : "text-slate-400 group-hover:text-slate-600"}`} />
                  <div className="overflow-hidden w-full">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`font-mono font-bold tracking-tight ${isActive ? "text-[#075e54]" : "text-slate-700"}`}>{formattedDate}</span>
                      <span className="text-[9px] font-mono text-slate-400">{milestone.time}</span>
                    </div>
                    <p className={`text-[11px] truncate mt-1 ${isActive ? "text-slate-800" : "text-slate-500 group-hover:text-slate-700"} font-light`}>
                      {milestone.content.replace(/「|」|【|】/g, '')}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ backgroundColor: resolvedColor }} />
                      <span className="text-[10px] text-slate-400 tracking-wider font-mono uppercase font-medium truncate">{resolvedName}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
            
            {anchorMilestones.length === 0 && (
              <div className="text-slate-400 text-xs italic p-4 text-center font-mono">
                暫無標記的重要日期里程碑
              </div>
            )}
          </div>
        </div>

      {/* RIGHT AREA: Active Scroll Timeline Stream */}
      <div className="xl:col-span-9 order-2 xl:order-2 space-y-4">
        
        {/* Timeline Control Station (Search + Filter Pills) */}
        <div className="bg-white/90 p-4 rounded-xl border border-[#e9edef] shadow-sm backdrop-blur-md space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#128c7e] absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="輸入關鍵字搜尋對話（例如：西九、巴黎、人參雞湯、喜歡）..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.8 pl-9 pr-4 text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:border-[#128c7e] transition-colors"
              />
            </div>
 
            {/* Filter Pill List */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 md:pb-0 font-mono text-[10px] uppercase tracking-widest">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 mr-2.5 hidden md:block" />
              {[
                { id: "all", label: "全故事線" },
                { id: "Heidi", label: "與 Heidi" },
                { id: "Angie", label: "與 Angie" },
                { id: "narrative", label: "獨白" },
                { id: "important", label: "重要 🐣" }
              ].map(pill => (
                <button
                  key={pill.id}
                  onClick={() => setFilterType(pill.id)}
                  className={`text-[10px] px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer flex-shrink-0 font-sans tracking-wide border ${
                    filterType === pill.id
                      ? "bg-[#128c7e] text-white font-semibold border-[#128c7e] shadow-sm"
                      : "bg-white text-slate-500 hover:text-slate-800 border-slate-200"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
 
          </div>
        </div>
 
        {/* Floating WhatsApp-Style Date Indicator Box */}
        {currentVisibleDate && (
          <div className="sticky top-[105px] md:top-[74px] z-30 flex justify-center py-2 pointer-events-none transition-all duration-300">
            <div className="bg-[#e1f3fc]/95 backdrop-blur-md border border-[#bae6fd] text-[#0369a1] text-[11px] md:text-xs font-bold font-sans tracking-wide px-4 py-1.5 rounded-full shadow-md flex items-center gap-1.5 pointer-events-auto hover:bg-[#cfe9f7] transition-all">
              <Calendar className="w-3.5 h-3.5 text-[#0284c7]" />
              <span>{currentVisibleDate}</span>
            </div>
          </div>
        )}

        {/* Narrative Streams */}
        <div 
          ref={timelineContainerRef}
          className="relative pl-4 md:pl-10 space-y-6 before:content-[''] before:absolute before:left-[10px] md:before:left-9 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-[#128c7e]/20 before:via-slate-200 before:to-[#ec4899]/20"
        >
          <AnimatePresence mode="popLayout">
            {filteredEvents.map((event) => {
              const character = characterMap[event.characterId];
              const dateSplit = event.date.split("-");
              const formattedDate = dateSplit.length >= 3 ? `${dateSplit[1]}月${dateSplit[2]}日` : event.date;

              const isHugo = event.characterId === "Hugo" || event.characterId === "Ivan";

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  key={event.id}
                  id={`event-card-${event.id}`}
                  className="relative timeline-node group"
                  onClick={() => onSelectEvent?.(event)}
                >
                  
                  {/* Glowing Node Indicator on Left Line */}
                  <div className={`absolute left-[-10px] md:left-[-31px] top-4.5 w-3.5 h-3.5 rounded-full border bg-white flex items-center justify-center transition-all z-10 ${
                    event.isImportant 
                      ? "border-amber-400 scale-125 shadow-[0_0_8px_rgba(245,158,11,0.6)]" 
                      : event.characterId === "Heidi" || event.characterId === "Albee"
                        ? "border-pink-500 shadow-[0_0_6px_rgba(236,72,153,0.3)]" 
                        : event.characterId === "Angie" || event.characterId === "Chloe"
                          ? "border-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.3)]" 
                          : "border-slate-300"
                  }`}>
                    {event.isImportant && (
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                    )}
                  </div>
 
                  {/* Event Render Categories */}
                  {event.type === EventType.MARKER ? (
                    
                    /* Category A: Milestone Marker (Small system message in classic WhatsApp style) */
                    <div className="max-w-md mx-auto text-center my-4" id={`marker-${event.id}`}>
                      <div className="inline-block bg-white/90 border border-[#e9edef] rounded-lg px-3 py-1.5 text-xs text-slate-600 shadow-sm max-w-sm font-light leading-relaxed">
                        <span className="font-mono font-bold text-amber-600 block text-[9px] uppercase tracking-wider mb-0.5">⚠️ 故事重要節點</span>
                        <span className="font-semibold">{formattedDate} {event.time}</span> • {event.content}
                      </div>
                    </div>
 
                  ) : event.type === EventType.NARRATIVE ? (
 
                    /* Category B: Inner Narrative Thought (Beautifully integrated paper-note style) */
                    <div className="bg-amber-50/70 border border-amber-200/50 rounded-xl p-4.5 max-w-2xl transition-all hover:bg-amber-50/90 shadow-sm" id={`narrative-${event.id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-mono uppercase tracking-widest text-amber-700 font-bold bg-amber-100 px-2.5 py-0.5 rounded-full">
                          主角 Hugo 深夜獨白 • {formattedDate} {event.time}
                        </span>
                        {event.isImportant && (
                          <span className="text-[9px] font-semibold bg-rose-100 border border-rose-200/50 text-rose-600 px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> 關鍵抉擇
                          </span>
                        )}
                      </div>
                      <p className="text-xs md:text-sm text-slate-800 leading-relaxed italic whitespace-pre-wrap font-light border-l-2 border-amber-400 pl-3">
                        {event.content}
                      </p>
                    </div>
 
                  ) : event.type === EventType.SCREENSHOT ? (
 
                    /* Category C: Screenshot Snippet Showcase (Styled like a modern media attachment) */
                    <div className="relative group max-w-sm my-2" id={`screenshot-${event.id}`}>
                      <div className="relative bg-[#f0f2f5] border border-[#e9edef] rounded-xl overflow-hidden shadow-md transition-all hover:border-slate-300">
                        {/* Sub-header */}
                        <div className="bg-white p-2.5 border-b border-[#e9edef] flex items-center justify-between text-xs text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                              備份影像_{event.id.toUpperCase().slice(0, 4)}.PNG
                            </span>
                          </div>
                          <span className="font-mono text-[9px] text-slate-400">{formattedDate} {event.time}</span>
                        </div>
                        
                        {/* Image Viewer */}
                        {event.imageUrl ? (
                          <div className="relative aspect-video overflow-hidden bg-slate-900">
                            <img 
                              src={event.imageUrl} 
                              alt="WhatsApp Screenshot snippet" 
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover opacity-95 group-hover:opacity-100 transition-opacity" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2.5">
                              <span className="text-[10px] italic text-slate-200 font-light">對話備份紀錄</span>
                            </div>
                          </div>
                        ) : (
                          <div className="h-40 bg-slate-200 flex items-center justify-center text-slate-400 text-xs italic font-mono">
                            暫無上傳截圖資料
                          </div>
                        )}
 
                        {/* Snippet text */}
                        <div className="p-3 bg-white space-y-2">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: character?.color || '#94a3b8' }} />
                            <span className="text-[10px] font-bold text-slate-600 font-mono tracking-wider">{character?.name || event.characterId}</span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed italic bg-slate-50 p-2.5 rounded border border-slate-100 font-light">
                            {event.content}
                          </p>
                        </div>
                      </div>
                    </div>
 
                  ) : (
 
                    /* Category D: Realistic WhatsApp Conversations Chat Bubble */
                    <div className={`flex flex-col w-full ${isHugo ? "items-end ml-auto" : "items-start"}`} id={`chat-${event.id}`}>
                      
                      {/* Bubble design with accurate WhatsApp light mode styles */}
                      <div 
                        className={`p-3 px-4 rounded-xl shadow-sm border leading-relaxed relative text-sm max-w-[85%] sm:max-w-[70%] group/bubble transition-all hover:shadow-md ${
                          isHugo
                            ? "bg-[#d9fdd3] border-[#c1f1ba] rounded-tr-none text-slate-800"
                            : "bg-white border-[#e9edef] rounded-tl-none text-slate-800"
                        }`}
                      >
                        {/* Name inside Bubble (Hidden if Hugo, classic WhatsApp style) */}
                        <span className={`text-[10px] font-bold block mb-1 tracking-tight ${
                          isHugo
                            ? "text-[#00a884] hidden"
                            : event.characterId === "Heidi" || event.characterId === "Albee"
                              ? "text-pink-600"
                              : "text-emerald-600"
                        }`}>
                          {character?.name || event.characterId}
                        </span>
 
                        <p className="text-xs md:text-sm leading-relaxed whitespace-pre-line text-slate-800 font-light">
                          {event.content}
                        </p>
                        
                        {/* Time & tick marks */}
                        <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-slate-400 font-mono select-none">
                          <span>{event.time}</span>
                          {isHugo && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] ml-0.5 inline shrink-0" />}
                        </div>
 
                        {/* Sentiment indicator flag inside bubble on hover */}
                        {event.sentiment && (
                          <div className="absolute top-1/2 -translate-y-1/2 hidden group-hover/bubble:flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-[#e9edef] text-[9px] font-medium tracking-wider uppercase shadow-md z-20" style={{
                            right: isHugo ? 'auto' : '-85px',
                            left: isHugo ? '-85px' : 'auto',
                          }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{
                              backgroundColor: event.sentiment === SentimentType.POSITIVE ? '#10b981' : event.sentiment === SentimentType.NEGATIVE ? '#ef4444' : event.sentiment === SentimentType.SUGGESTIVE ? '#d946ef' : '#94a3b8'
                            }} />
                            <span className="text-slate-500 font-sans">
                              {event.sentiment === SentimentType.POSITIVE ? "熱絡" : event.sentiment === SentimentType.NEGATIVE ? "壓抑" : event.sentiment === SentimentType.SUGGESTIVE ? "暗示" : "平穩"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
 
                  )}
 
                </motion.div>
              );
            })}
 
            {filteredEvents.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white p-8 rounded-xl border border-slate-200 text-center max-w-xl mx-auto shadow-sm"
              >
                <Info className="w-8 h-8 text-[#128c7e] mx-auto mb-3" />
                <h4 className="font-sans text-xs font-semibold text-slate-700 mb-10">找不到相關的對話或獨白</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-light">
                  可嘗試調整上方篩選條件為「全故事線」或清空搜尋欄位再試試看。
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
 
      </div>
 
    </div>
  );
}
