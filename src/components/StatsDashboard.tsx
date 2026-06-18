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
                <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                  <span className="flex items-center gap-2 text-slate-600 font-medium">
                    <span className="w-2 rounded-full h-2" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                  <span className="font-mono text-slate-800 font-bold">{item.value} 條</span>
                </div>
              ))}
              {angieSentiments.length === 0 && (
                <span className="text-slate-400 text-[11px] font-mono">未檢測到對話記錄</span>
              )}
            </div>
          </div>
        </div>
 
      </div>
    </div>
  );
}
