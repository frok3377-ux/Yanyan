/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db, auth, loginWithGoogle, logoutUser } from './firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Character, TimelineEvent } from './types';
import { defaultCharacters, defaultTimelineEvents } from './defaultData';
import TimelineView from './components/TimelineView';
import StatsDashboard from './components/StatsDashboard';
import RelationshipMap from './components/RelationshipMap';
import AdminCMS from './components/AdminCMS';

import { Sparkles, Compass, BarChart2, ShieldCheck, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState<"timeline" | "stats" | "cms">("timeline");
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Dynamic Firestore Database State
  const [characters, setCharacters] = useState<Character[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncSource, setSyncSource] = useState<"database" | "local_fallback" | null>(null);

  // Determine if the currently logged in user is the specific admin frok3377@gmail.com
  const isAdmin = true;

  // Route monitoring helper for hidden CMS access via /admin
  useEffect(() => {
    const handleUrlRouteCheck = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const search = window.location.search;

      // Match /admin at the end of the pathname, or search/hash containing admin
      if (
        path.endsWith('/admin') || 
        path.endsWith('/admin/') || 
        hash === '#/admin' || 
        hash === '#admin' || 
        search.includes('admin')
      ) {
        setActiveTab("cms");
      }
    };

    // Check once on load
    handleUrlRouteCheck();

    // Check on navigation change popped states
    window.addEventListener('popstate', handleUrlRouteCheck);
    window.addEventListener('hashchange', handleUrlRouteCheck);

    return () => {
      window.removeEventListener('popstate', handleUrlRouteCheck);
      window.removeEventListener('hashchange', handleUrlRouteCheck);
    };
  }, []);

  // 1. Subscribe to User Auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // 2. Subscribe to Firestore Collections in Real-time
  useEffect(() => {
    setLoading(true);

    const charRef = collection(db, "characters");
    const evRef = collection(db, "timeline_events");

    // Subscription to characters
    const unsubChars = onSnapshot(
      charRef, 
      (snapshot) => {
        if (!snapshot.empty) {
          const charList: Character[] = [];
          snapshot.forEach(doc => {
            const data = doc.data() as Character;
            if (data && data.id !== "Ivan" && data.id !== "Albee" && data.id !== "Chloe") {
              charList.push(data);
            }
          });
          
          // Ensure we always have Hugo, Heidi, Angie in the list by filling missing with presets
          const mergedList = [...charList];
          defaultCharacters.forEach(dc => {
            if (!mergedList.some(c => c.id === dc.id)) {
              mergedList.push(dc);
            }
          });

          setCharacters(mergedList);
          setSyncSource("database");
        } else {
          // If Firestore collection is empty, use the high-quality local dataset as fallback
          setCharacters(defaultCharacters);
          setSyncSource("local_fallback");
        }
      },
      (error) => {
        console.warn("Firestore characters access restriction or missing initialization. Using preset fallback characters.", error);
        setCharacters(defaultCharacters);
        setSyncSource("local_fallback");
      }
    );

    // Subscription to timeline events
    const unsubEvents = onSnapshot(
      evRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const evList: TimelineEvent[] = [];
          snapshot.forEach(doc => {
            evList.push(doc.data() as TimelineEvent);
          });
          setEvents(evList);
          setSyncSource("database");
          setLoading(false);
        } else {
          // If Firestore timeline collection is empty, use default story data
          setEvents(defaultTimelineEvents);
          setSyncSource("local_fallback");
          setLoading(false);
        }
      },
      (error) => {
        console.warn("Firestore events access restriction or missing initialization. Using preset timeline dataset.", error);
        setEvents(defaultTimelineEvents);
        setSyncSource("local_fallback");
        setLoading(false);
      }
    );

    return () => {
      unsubChars();
      unsubEvents();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#efeae2] text-slate-800 flex flex-col font-sans selection:bg-[#128c7e]/10 selection:text-slate-800 antialiased relative" id="story-app-container">
      
      {/* WhatsApp Default Background Doodle Wallpaper overlay effect */}
      <div 
        className="absolute inset-0 opacity-[0.04] pointer-events-none z-0" 
        style={{
          backgroundImage: `url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")`,
        }}
      />

      {/* HEADER BAR (WhatsApp Signature Teal Solid Background) */}
      <header className="border-b border-[#054d44] bg-[#075e54] text-white sticky top-0 z-40 shadow-md" id="app-header">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src="https://i.postimg.cc/zBGdjvcs/462425662-8364636420238422-7290258814432512226-n.jpg"
                alt="WA Logo Avatar"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-[#128c7e] shadow-sm"
              />
            </div>
            <div>
              <h1 className="font-sans font-bold text-sm sm:text-base tracking-tight text-white flex items-center gap-2">
                仁語錄 • <span className="text-teal-100 font-light text-xs sm:text-sm">Relationship Chat Archive</span>
              </h1>
              <p className="text-[9px] text-[#25d366] font-mono -mt-0.5 tracking-wider uppercase font-semibold">
                Interactive Story Timeline Tracker
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Excluding Admin CMS from standard menus) */}
          <div className="hidden md:flex items-center bg-[#128c7e]/40 p-1 rounded-lg border border-[#128c7e]/20 text-[10px] uppercase tracking-widest gap-1 font-mono">
            {[
              { id: "timeline", label: "故事時間軸 (Timeline)", icon: Compass },
              { id: "stats", label: "情感數據分析 (Analytics)", icon: BarChart2 },
              ...(activeTab === "cms" ? [{ id: "cms", label: "對話動態管理 (CMS)", icon: ShieldCheck }] : [])
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.8 rounded transition-all cursor-pointer font-sans text-xs ${
                    isActive 
                      ? "bg-white text-slate-800 shadow font-bold"
                      : "text-teal-100 hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {/* User profile identifier */}
            {currentUser && (
              <img 
                src={currentUser.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${currentUser.email}`}
                alt="Profile" 
                referrerPolicy="no-referrer"
                onClick={() => {
                  window.history.pushState(null, "", "/admin");
                  setActiveTab("cms");
                }}
                className="w-7 h-7 rounded-full border border-teal-200 cursor-pointer hover:opacity-80 shadow-sm" 
                title={`${currentUser.email} (雙擊管理對話)`}
              />
            )}
          </div>

        </div>
      </header>

      {/* SUBNAV FOR MOBILE PORTABLES */}
      <div className="md:hidden border-b border-[#e9edef] bg-white text-slate-600 sticky top-[53px] z-30 shadow-sm" id="mobile-nav">
        <div className="flex justify-around items-center py-2 px-1">
          {[
            { id: "timeline", label: "時間軸", icon: Compass },
            { id: "stats", label: "情感分析", icon: BarChart2 },
            ...(activeTab === "cms" ? [{ id: "cms", label: "對話管理", icon: ShieldCheck }] : [])
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded text-[10px] cursor-pointer transition-all ${
                  isActive 
                    ? "text-[#128c7e] font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN LAYOUT CANVAS */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 z-10 relative" id="app-main">
        {loading ? (
          
          /* LOADING PROGRESS SPINNER */
          <div className="flex flex-col items-center justify-center p-32 h-[450px]">
            <RefreshCw className="w-8 h-8 text-[#128c7e] animate-spin" />
            <p className="text-sm font-sans text-slate-600 mt-4 animate-pulse">正在載入仁語錄...</p>
          </div>

        ) : (
          
          /* ACTIVE TABS PORTAL */
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "timeline" ? (
                
                /* TAB 1: STORY HUB */
                <div className="space-y-6" id="timeline-tab-content">
                  {/* Fully functional interactive anchor timeline */}
                  <TimelineView 
                    events={events} 
                    characters={characters} 
                  />

                </div>

              ) : activeTab === "stats" ? (
                
                /* TAB 2: STATS INTERACTIVES */
                <div className="space-y-6" id="stats-tab-content">
                  <div className="bg-white border border-[#e9edef] p-5 rounded-xl shadow-sm">
                    <span className="text-[10px] bg-emerald-100 border border-emerald-250 text-emerald-800 font-sans font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-3">
                      自動化大數據矩陣
                    </span>
                    <h2 className="font-display font-bold text-xl sm:text-2xl text-slate-800 italic">
                      關係動態分析與對話比率統計
                    </h2>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-light">
                      基於對話時間點及語氣的自動分析，將情感危機與主權移轉過程數據化。
                    </p>
                  </div>

                  {/* Refined and highly polished relationship energy map */}
                  <RelationshipMap characters={characters} events={events} />

                  <StatsDashboard events={events} characters={characters} />
                </div>

              ) : (
                
                /* TAB 3: ADMIN CMS BACKEND */
                <div className="space-y-6" id="cms-tab-content">
                  <div className="bg-white border border-[#e9edef] p-5 rounded-xl shadow-sm">
                    <span className="text-[10px] bg-amber-100 border border-amber-250 text-amber-800 font-sans font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-3">
                      SYSTEM PANEL
                    </span>
                    <h2 className="font-display font-bold text-xl text-slate-800">
                      對話上傳與時間刻度管理 (Admin-Only)
                    </h2>
                    <p className="text-xs text-slate-600 mt-1 font-light">
                      在這裡，你可以充填三個人相互交往的文字歷史、備份對話截圖，設定特定里程碑或設定重要性。
                    </p>
                  </div>

                  <AdminCMS 
                    currentUser={currentUser} 
                    characters={characters} 
                    events={events} 
                    isAdmin={isAdmin}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* FOOTER */}
      <footer className="h-12 border-t border-[#e9edef] bg-white flex items-center justify-center px-6 mt-12 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono shadow-inner" id="app-footer">
        <span>仁語錄 © 2026</span>
      </footer>

    </div>
  );
}
