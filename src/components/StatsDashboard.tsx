/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TimelineEvent, Character, SentimentType } from '../types';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { ChartBar, TrendingUp, Clock } from 'lucide-react';

interface StatsDashboardProps {
  events: TimelineEvent[];
  characters: Character[];
}

export default function StatsDashboard({ events, characters }: StatsDashboardProps) {
  
  // 1. Process Timeline Events for Interaction Frequency chart (by Date)
  const getFrequencyData = () => {
    // Collect distinct dates
    const dates = Array.from(new Set(events.map(e => e.date))).sort();
    
    // For each date, sum count of interactions
    return dates.map(date => {
      const dayEvents = events.filter(e => e.date === date);
      
      const heidiGroupCount = dayEvents.filter(e => {
        // Sender or receiver is Heidi/Albee
        const isSenderHeidi = e.characterId === "Heidi" || e.characterId === "Albee";
        const isReceiverHeidi = e.receiverId === "Heidi" || e.receiverId === "Albee";
        if (isSenderHeidi || isReceiverHeidi) return true;
        
        // Hugo's narrative/content referring to Heidi
        if (e.characterId === "Hugo" || e.characterId === "Ivan") {
          const lowerContent = e.content.toLowerCase();
          return lowerContent.includes("heidi") || lowerContent.includes("albee") || lowerContent.includes("雞湯") || lowerContent.includes("交往") || lowerContent.includes("女朋友");
        }
        return false;
      }).length;

      const angieGroupCount = dayEvents.filter(e => {
        // Sender or receiver is Angie/Chloe
        const isSenderAngie = e.characterId === "Angie" || e.characterId === "Chloe";
        const isReceiverAngie = e.receiverId === "Angie" || e.receiverId === "Chloe";
        if (isSenderAngie || isReceiverAngie) return true;
        
        // Hugo's narrative/content referring to Angie
        if (e.characterId === "Hugo" || e.characterId === "Ivan") {
          const lowerContent = e.content.toLowerCase();
          return lowerContent.includes("angie") || lowerContent.includes("chloe") || lowerContent.includes("結他") || lowerContent.includes("靈感") || lowerContent.includes("寫生");
        }
        return false;
      }).length;
      
      // Formatting date label to MM-DD
      const dateParts = date.split('-');
      const label = dateParts.length >= 3 ? `${dateParts[1]}/${dateParts[2]}` : date;

      return {
        date: label,
        'Hugo ✕ Heidi 豬🐽 (Heidi 組)': heidiGroupCount,
        'Hugo ✕ Angie 小公主👸 (Angie 組)': angieGroupCount,
      };
    });
  };

  // 2. Process Hourly distribution
  const getHourlyData = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    const heidiHours = Array(24).fill(0);
    const angieHours = Array(24).fill(0);

    events.forEach(e => {
      const hourStr = e.time.split(':')[0];
      const hour = parseInt(hourStr, 10);
      if (!isNaN(hour) && hour >= 0 && hour < 24) {
        if (e.characterId === "Heidi" || e.characterId === "Albee") heidiHours[hour]++;
        if (e.characterId === "Angie" || e.characterId === "Chloe") angieHours[hour]++;
      }
    });

    // Grouping into intervals for cleaner display
    const periods = [
      { name: "早上 (06-12)", "Heidi": 0, "Angie": 0 },
      { name: "下午 (12-18)", "Heidi": 0, "Angie": 0 },
      { name: "晚上 (18-22)", "Heidi": 0, "Angie": 0 },
      { name: "深夜 (22-06)", "Heidi": 0, "Angie": 0 }
    ];

    hours.forEach(h => {
      if (h >= 6 && h < 12) {
        periods[0]["Heidi"] += heidiHours[h];
        periods[0]["Angie"] += angieHours[h];
      } else if (h >= 12 && h < 18) {
        periods[1]["Heidi"] += heidiHours[h];
        periods[1]["Angie"] += angieHours[h];
      } else if (h >= 18 && h < 22) {
        periods[2]["Heidi"] += heidiHours[h];
        periods[2]["Angie"] += angieHours[h];
      } else {
        periods[3]["Heidi"] += heidiHours[h];
        periods[3]["Angie"] += angieHours[h];
      }
    });

    return periods;
  };

  // 3. Process Sentiment Distribution
  const getSentimentStats = (charId: string, alternateId: string) => {
    const charEvents = events.filter(e => e.characterId === charId || e.characterId === alternateId);
    const positive = charEvents.filter(e => e.sentiment === SentimentType.POSITIVE).length;
    const neutral = charEvents.filter(e => e.sentiment === SentimentType.NEUTRAL).length;
    const negative = charEvents.filter(e => e.sentiment === SentimentType.NEGATIVE).length;
    const suggestive = charEvents.filter(e => e.sentiment === SentimentType.SUGGESTIVE).length;
    
    return [
      { name: "正面 ❤️", value: positive, color: "#10b981" },
      { name: "常態 💬", value: neutral, color: "#64748b" },
      { name: "張力 ⚡", value: negative, color: "#ef4444" },
      { name: "性暗示 🫦", value: suggestive, color: "#d946ef" }
    ].filter(item => item.value > 0);
  };

  const heidiSentiments = getSentimentStats("Heidi", "Albee");
  const angieSentiments = getSentimentStats("Angie", "Chloe");
  const hugoSentiments = getSentimentStats("Hugo", "Ivan");

  const frequencyData = getFrequencyData();
  const hourlyData = getHourlyData();

  // 4. Extract and calculate the frequency of Emojis used across dialogues by character
  const getEmojiFrequencyByCharacter = (charId: string, alternateId: string) => {
    const counts: { [emoji: string]: number } = {};
    // Match common emojis including faces, hearts, animals, and symbols
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{27BF}]/gu;
    
    events
      .filter(e => e.characterId === charId || e.characterId === alternateId)
      .forEach(e => {
        if (!e.content) return;
        const matches = e.content.match(emojiRegex);
        if (matches) {
          matches.forEach(emoji => {
            counts[emoji] = (counts[emoji] || 0) + 1;
          });
        }
      });

    return Object.entries(counts)
      .map(([emoji, count]) => ({ emoji, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  };

  const hugoEmojiData = getEmojiFrequencyByCharacter("Hugo", "Ivan");
  const heidiEmojiData = getEmojiFrequencyByCharacter("Heidi", "Albee");
  const angieEmojiData = getEmojiFrequencyByCharacter("Angie", "Chloe");

  return (
    <div className="space-y-6" id="stats-dashboard">
      
      {/* Visual Analytics Title */}
      <div className="flex items-center gap-3 bg-white/80 p-5 rounded-xl border border-[#e9edef] shadow-md backdrop-blur-md">
        <ChartBar className="w-5 h-5 text-[#128c7e]" />
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#128c7e] font-bold block">Analytics • 數據分析</span>
          <h3 className="font-display font-medium text-lg text-slate-800 mt-0.5">情感波動及互動頻率數據中心</h3>
          <p className="text-xs text-slate-500 mt-1">自動抓取與主角 Hugo 互動之 WhatsApp、內心對白對話記錄之多維度統計</p>
        </div>
      </div>
 
      {/* Grid of main analytical charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 
        {/* 1. Interaction Frequency Trend over Time */}
        <div className="bg-white p-5 rounded-xl border border-[#e9edef] shadow-sm">
          <span className="text-[9px] font-mono text-[#128c7e] uppercase tracking-widest block mb-1">STREAMS</span>
          <h4 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#128c7e]" />
            互動頻率時間分佈 (Interaction Flow)
          </h4>
          <div className="h-64 text-xs font-mono">
            {frequencyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={frequencyData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e9edef", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}
                    labelStyle={{ color: "#334155", fontWeight: "bold" }}
                  />
                  <Legend wrapperStyle={{ paddingTop: 10 }} />
                  <Line type="monotone" dataKey="Hugo ✕ Heidi 豬🐽 (Heidi 組)" stroke="#ec4899" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Hugo ✕ Angie 小公主👸 (Angie 組)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 italic">暫無對話頻率數據</div>
            )}
          </div>
        </div>
 
        {/* 2. Chat Timeline Hours Distribution */}
        <div className="bg-white p-5 rounded-xl border border-[#e9edef] shadow-sm">
          <span className="text-[9px] font-mono text-emerald-600 uppercase tracking-widest block mb-1">DYNAMICS</span>
          <h4 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            對話時段偏好 (Time of Day Dynamics)
          </h4>
          <div className="h-64 text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e9edef", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}
                  labelStyle={{ color: "#334155", fontWeight: "bold" }}
                />
                <Legend wrapperStyle={{ paddingTop: 10 }} />
                <Bar dataKey="Heidi" fill="#ec4899" radius={[2, 2, 0, 0]} name="Heidi豬🐽" />
                <Bar dataKey="Angie" fill="#10b981" radius={[2, 2, 0, 0]} name="Angie小公主👸" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Grid of Sentiment Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* 3. Sentiment breakdown Hugo */}
        <div className="bg-white p-5 rounded-xl border border-[#e9edef] shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#128c7e]" />
              Hugo 🌴 的語調屬性分佈
            </h4>
            <p className="text-[11px] text-slate-400 mb-4">反映男主角在親密關係中所表達的關切、防備與內心掙扎</p>
          </div>
          <div className="grid grid-cols-1 gap-4 items-center">
            <div className="h-40 font-mono text-xs">
              {hugoSentiments.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={hugoSentiments}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {hugoSentiments.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e9edef", borderRadius: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 italic text-center">暫無數據</div>
              )}
            </div>
            <div className="space-y-1.5 text-xs">
              {hugoSentiments.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                  <span className="flex items-center gap-2 text-slate-600 font-medium">
                    <span className="w-2 rounded-full h-2" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                  <span className="font-mono text-slate-800 font-bold">{item.value} 條</span>
                </div>
              ))}
              {hugoSentiments.length === 0 && (
                <span className="text-slate-400 text-[11px] font-mono">未檢測到對話記錄</span>
              )}
            </div>
          </div>
        </div>
 
        {/* 4. Sentiment breakdown Heidi */}
        <div className="bg-white p-5 rounded-xl border border-[#e9edef] shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
              Heidi 豬🐽 的語調屬性分佈
            </h4>
            <p className="text-[11px] text-slate-400 mb-4">反映穩定長期對話中的生活日常與矛盾反動</p>
          </div>
          <div className="grid grid-cols-1 gap-4 items-center">
            <div className="h-40 font-mono text-xs">
              {heidiSentiments.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={heidiSentiments}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {heidiSentiments.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e9edef", borderRadius: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 italic text-center">暫無數據</div>
              )}
            </div>
            <div className="space-y-1.5 text-xs">
              {heidiSentiments.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                  <span className="flex items-center gap-2 text-slate-600 font-medium">
                    <span className="w-2 rounded-full h-2" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                  <span className="font-mono text-slate-800 font-bold">{item.value} 條</span>
                </div>
              ))}
              {heidiSentiments.length === 0 && (
                <span className="text-slate-400 text-[11px] font-mono">未檢測到對話記錄</span>
              )}
            </div>
          </div>
        </div>
 
        {/* 5. Sentiment breakdown Angie */}
        <div className="bg-white p-5 rounded-xl border border-[#e9edef] shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Angie 小公主👸 的語調屬性分佈
            </h4>
            <p className="text-[11px] text-slate-400 mb-4">反映深夜對話及工作合作中的靈感爆發與情感攀升</p>
          </div>
          <div className="grid grid-cols-1 gap-4 items-center">
            <div className="h-40 font-mono text-xs">
              {angieSentiments.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={angieSentiments}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {angieSentiments.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e9edef", borderRadius: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 italic text-center">暫無數據</div>
              )}
            </div>
            <div className="space-y-1.5 text-xs">
              {angieSentiments.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100 font-sans">
                  <span className="flex items-center gap-2 text-slate-600 font-medium">
                    <span className="w-2 rounded-full h-2" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                  <span className="font-mono text-slate-800 font-bold">{item.value} 條</span>
                </div>
              ))}
              {angieSentiments.length === 0 && (
                <span className="text-slate-400 text-[11px] font-mono block text-center py-2">未檢測到對話記錄</span>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Character-Specific Emoji Frequency Bistro */}
      <div className="bg-white p-5 rounded-xl border border-[#e9edef] shadow-sm">
        <div className="mb-6">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#128c7e] font-bold block mb-1 font-sans">EMOJI RADAR • 角色專屬表情解密</span>
          <h4 className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-2">
            📊 角色表情符號頻率分析 (Character-Specific Emoji Usage)
          </h4>
          <p className="text-xs text-slate-500">
            分析各個角色在對話與心靈獨白中私下最常傳遞的符號，揭示深層潛意識、愛意和壓抑焦慮。
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* 1. Hugo Card */}
          <div className="bg-[#128c7e]/5 border border-[#128c7e]/15 p-4 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-4 pb-2 border-b border-[#128c7e]/10">
                <span className="text-2xl">🌴</span>
                <div>
                  <h5 className="font-bold text-sm text-[#128c7e]">Hugo (主角)</h5>
                  <span className="text-[9px] text-slate-400 block font-mono">椰子島・狀態游移與掙扎</span>
                </div>
              </div>

              <div className="h-44 mb-4 select-none">
                {hugoEmojiData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={hugoEmojiData}
                      layout="vertical"
                      margin={{ top: 0, right: 15, left: -25, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" fontSize={9} />
                      <YAxis dataKey="emoji" type="category" stroke="#94a3b8" fontSize={14} width={30} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: 11 }}
                        formatter={(value: any) => [`${value} 次`, 'Hugo 使用']}
                      />
                      <Bar dataKey="count" fill="#128c7e" radius={[0, 4, 4, 0]}>
                        {hugoEmojiData.map((_, i) => (
                          <Cell key={`hugo-${i}`} fill={["#128c7e", "#0b645a", "#159e8e", "#20b3a1", "#41c6b5", "#64dacf"][i % 6]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 italic text-xs font-mono text-center">暫無對話表情</div>
                )}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-[#128c7e]/10">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">最常使用</span>
              <div className="grid grid-cols-2 gap-1.5">
                {hugoEmojiData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 p-1.5 rounded bg-white/70 border border-slate-100 text-[11px] font-sans">
                    <span className="text-sm shrink-0">{item.emoji}</span>
                    <span className="font-bold text-[#128c7e] font-mono">{item.count}次</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-sans italic leading-normal">
                主用 🌴 象徵放空退縮；👍 / 😊 顯示壓抑和冷淡敷衍。
              </p>
            </div>
          </div>

          {/* 2. Heidi Card */}
          <div className="bg-pink-50/50 border border-pink-100 p-4 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-4 pb-2 border-b border-pink-200/40">
                <span className="text-2xl">🐽</span>
                <div>
                  <h5 className="font-bold text-sm text-pink-600 font-sans">Heidi (女友)</h5>
                  <span className="text-[9px] text-slate-400 block font-mono">交往4年・日常羈絆與安全感</span>
                </div>
              </div>

              <div className="h-44 mb-4 select-none">
                {heidiEmojiData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={heidiEmojiData}
                      layout="vertical"
                      margin={{ top: 0, right: 15, left: -25, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" fontSize={9} />
                      <YAxis dataKey="emoji" type="category" stroke="#94a3b8" fontSize={14} width={30} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #fbcfe8", borderRadius: "6px", fontSize: 11 }}
                        formatter={(value: any) => [`${value} 次`, 'Heidi 使用']}
                      />
                      <Bar dataKey="count" fill="#ec4899" radius={[0, 4, 4, 0]}>
                        {heidiEmojiData.map((_, i) => (
                          <Cell key={`heidi-${i}`} fill={["#db2777", "#ec4899", "#f43f5e", "#f472b6", "#fbcfe8", "#fda4af"][i % 6]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 italic text-xs font-mono text-center">暫無對話表情</div>
                )}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-pink-200/40">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">最常使用</span>
              <div className="grid grid-cols-2 gap-1.5">
                {heidiEmojiData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 p-1.5 rounded bg-white/70 border border-pink-100 text-[11px] font-sans">
                    <span className="text-sm shrink-0">{item.emoji}</span>
                    <span className="font-bold text-pink-600 font-mono">{item.count}次</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-sans italic leading-normal">
                熱用 🐽、😘 展現日常撒嬌；出現 ⚡、😭 則代表嚴重不安全感。
              </p>
            </div>
          </div>

          {/* 3. Angie Card */}
          <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-4 pb-2 border-b border-emerald-200/40">
                <span className="text-2xl">👸</span>
                <div>
                  <h5 className="font-bold text-sm text-emerald-600 font-sans">Angie (同事)</h5>
                  <span className="text-[9px] text-slate-400 block font-mono">新世界・樂理音樂靈魂共振</span>
                </div>
              </div>

              <div className="h-44 mb-4 select-none">
                {angieEmojiData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={angieEmojiData}
                      layout="vertical"
                      margin={{ top: 0, right: 15, left: -25, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" fontSize={9} />
                      <YAxis dataKey="emoji" type="category" stroke="#94a3b8" fontSize={14} width={30} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #a7f3d0", borderRadius: "6px", fontSize: 11 }}
                        formatter={(value: any) => [`${value} 次`, 'Angie 使用']}
                      />
                      <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]}>
                        {angieEmojiData.map((_, i) => (
                          <Cell key={`angie-${i}`} fill={["#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#c6f6d5"][i % 6]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 italic text-xs font-mono text-center">暫無對話表情</div>
                )}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-emerald-200/40">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">最常使用</span>
              <div className="grid grid-cols-2 gap-1.5">
                {angieEmojiData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 p-1.5 rounded bg-white/70 border border-emerald-100 text-[11px] font-sans">
                    <span className="text-sm shrink-0">{item.emoji}</span>
                    <span className="font-bold text-emerald-600 font-mono">{item.count}次</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-sans italic leading-normal">
                高頻 🎸、👸 呼應樂理與靈感；💖 的出現預示情感防禦正在融化。
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
