/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Character, TimelineEvent, SentimentType } from '../types';
import { Heart, HeartCrack, Zap, MessageSquare, Sparkles, Compass } from 'lucide-react';
import { motion } from 'motion/react';

interface RelationshipMapProps {
  characters: Character[];
  events: TimelineEvent[];
}

export default function RelationshipMap({ characters, events }: RelationshipMapProps) {
  const hugo = characters.find(c => c.id === "Hugo") || characters.find(c => c.id === "Ivan");
  const heidi = characters.find(c => c.id === "Heidi") || characters.find(c => c.id === "Albee");
  const angie = characters.find(c => c.id === "Angie") || characters.find(c => c.id === "Chloe");

  // Calculate some fun live scores based on the timeline contents!
  const calculateMetrics = (charId: string) => {
    const charEvents = events.filter(e => 
      e.characterId === charId || 
      (e.type === "chat" && (e.characterId === "Hugo" || e.characterId === "Ivan") && events.find(prev => prev.id === e.id)?.characterId === charId)
    );
    const totalMessages = charEvents.length;
    
    const positiveCount = charEvents.filter(e => e.sentiment === SentimentType.POSITIVE).length;
    const negativeCount = charEvents.filter(e => e.sentiment === SentimentType.NEGATIVE).length;
    
    // Proximity calculated from sent/received ratio + sentiments
    let proximityScore = 50; // default baseline
    if (charId === "Heidi" || charId === "Albee") {
      proximityScore = 80; // started very high
      // decreases with negative and late-timeline conflicts
      const recentEvents = events.slice(Math.floor(events.length / 2));
      const conflictCount = recentEvents.filter(e => 
        (e.characterId === "Heidi" || e.characterId === "Albee") && e.sentiment === SentimentType.NEGATIVE
      ).length;
      proximityScore -= conflictCount * 12;
      proximityScore += positiveCount * 5;
      proximityScore = Math.max(10, Math.min(100, proximityScore));
    } else if (charId === "Angie" || charId === "Chloe") {
      proximityScore = 10; // started low
      proximityScore += totalMessages * 6; // increases rapidly with interaction volume
      proximityScore += positiveCount * 4;
      proximityScore -= negativeCount * 8;
      proximityScore = Math.max(15, Math.min(100, proximityScore));
    }

    // Tension calculated from negative sentiments
    const tensionScore = Math.min(100, Math.max(0, (negativeCount * 25) + (charId === "Heidi" || charId === "Albee" ? 15 : 5)));

    return { totalMessages, proximityScore, tensionScore };
  };

  const heidiMetrics = calculateMetrics(heidi?.id || "Heidi");
  const angieMetrics = calculateMetrics(angie?.id || "Angie");

  return (
    <div className="bg-white/80 p-6 rounded-xl border border-[#e9edef] shadow-md backdrop-blur-md relative overflow-hidden" id="relationship-map">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#128c7e]/5 blur-3xl rounded-full" />
      
      <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#128c7e] font-bold block">Analytics • 關係張力</span>
          <h2 className="font-display font-medium text-lg text-slate-800 flex items-center gap-2 mt-1">
            <Sparkles className="w-4 h-4 text-amber-500" />
            關係張力模型 (Relationship Energy Map)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            基於 WhatsApp 對話頻率及情感語調自動分析之張力變化
          </p>
        </div>
      </div>
 
      {/* Modern Three-Point Connection Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch py-2">
        
        {/* Female A: Heidi */}
        {heidi && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col justify-between items-center p-5 bg-slate-50/50 rounded-xl border border-slate-100 shadow-inner text-center relative group transition-all"
            id="char-heidi"
          >
            <div className="text-center w-full">
              <div className="relative inline-block mx-auto">
                <img 
                  src={heidi.avatarUrl} 
                  alt={heidi.name} 
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-full object-cover ring-2 ring-pink-500/20 group-hover:scale-105 transition-transform" 
                />
                <div className="absolute -bottom-1 -right-1 bg-pink-500 text-white rounded-full p-1 shadow-md">
                  <Heart className="w-3.5 h-3.5 fill-white" />
                </div>
              </div>
              
              <h3 className="font-display font-bold text-pink-600 mt-3 text-sm">{heidi.name}</h3>
              <span className="text-[9px] font-mono text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider mt-1.5 inline-block">穩定交往 4 年</span>
              
              {heidi.bio && (
                <p className="text-[11px] text-slate-400 mt-2 font-normal max-w-xs mx-auto leading-normal">
                  {heidi.bio}
                </p>
              )}
              
              <p className="text-xs text-slate-700 text-center mt-2 leading-relaxed italic bg-white p-3 rounded-lg border border-slate-100 font-light shadow-sm">
                情感關係："{heidi.relationshipToHugo}"
              </p>
            </div>
 
            {/* Metrics Info */}
            <div className="w-full mt-5 pt-4 border-t border-slate-200/60 space-y-3.5 text-left text-xs text-slate-700">
              <div>
                <div className="flex justify-between items-center text-[11px] mb-1">
                  <span className="text-slate-500 flex items-center gap-1"><Heart className="w-3 h-3 text-pink-500 fill-pink-500" /> 親密指數:</span>
                  <span className="font-mono font-bold text-pink-600">{heidiMetrics.proximityScore}%</span>
                </div>
                <div className="w-full bg-white border border-slate-100 rounded-full h-1.5">
                  <div className="bg-pink-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${heidiMetrics.proximityScore}%` }} />
                </div>
              </div>
 
              <div>
                <div className="flex justify-between items-center text-[11px] pt-1 mb-1">
                  <span className="text-slate-500 flex items-center gap-1"><HeartCrack className="w-3 h-3 text-rose-500" /> 情感張力 / 危機:</span>
                  <span className="font-mono font-bold text-rose-600">{heidiMetrics.tensionScore}%</span>
                </div>
                <div className="w-full bg-white border border-slate-100 rounded-full h-1.5">
                  <div className="bg-rose-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${heidiMetrics.tensionScore}%` }} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
 
        {/* Central Actor: Hugo */}
        {hugo && (() => {
          const hugoDilemma = Math.floor(Math.min(95, Math.max(15, (angieMetrics.proximityScore * 0.75) + (heidiMetrics.tensionScore * 0.35))));
          const hugoStamina = Math.floor(Math.max(10, Math.min(100, 100 - (heidiMetrics.tensionScore * 0.45) - (angieMetrics.proximityScore * 0.25))));
          
          return (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col justify-between items-center p-5 bg-slate-50/50 rounded-xl border border-slate-100 shadow-inner text-center relative group transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
              id="char-hugo"
            >
              <div className="text-center w-full">
                <div className="relative inline-block mx-auto">
                  <img 
                    src={hugo.avatarUrl} 
                    alt={hugo.name} 
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 rounded-full object-cover ring-2 ring-[#128c7e]/20 group-hover:scale-105 transition-transform" 
                  />
                  <div className="absolute -bottom-1 -right-1 bg-[#128c7e] text-white rounded-full p-1 shadow-md">
                    <Compass className="w-3.5 h-3.5" />
                  </div>
                </div>
                
                <h3 className="font-display font-bold text-[#128c7e] mt-3 text-sm">{hugo.name}</h3>
                <span className="text-[9px] font-mono text-[#128c7e] bg-teal-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider mt-1.5 inline-block">故事主角 / 抉擇人</span>
                
                {hugo.bio && (
                  <p className="text-[11px] text-slate-400 mt-2 font-normal max-w-xs mx-auto leading-normal">
                    {hugo.bio}
                  </p>
                )}
                
                <p className="text-xs text-slate-700 text-center mt-2 leading-relaxed italic bg-white p-3 rounded-lg border border-slate-100 font-light shadow-sm">
                  主角現狀："{hugo.relationshipToHugo}"
                </p>
              </div>

              {/* Metrics block for perfect vertical layout consistency */}
              <div className="w-full mt-5 pt-4 border-t border-slate-200/60 space-y-3.5 text-left text-xs text-slate-700">
                <div>
                  <div className="flex justify-between items-center text-[11px] mb-1">
                    <span className="text-slate-500 flex items-center gap-1"><Compass className="w-3 h-3 text-slate-400" /> 決策選擇迷茫值:</span>
                    <span className="font-mono font-bold text-amber-600">{hugoDilemma}%</span>
                  </div>
                  <div className="w-full bg-white border border-slate-100 rounded-full h-1.5">
                    <div className="bg-amber-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${hugoDilemma}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-[11px] pt-1 mb-1">
                    <span className="text-slate-500 flex items-center gap-1"><Sparkles className="w-3 h-3 text-[#128c7e]" /> 情感承載極限值:</span>
                    <span className="font-mono font-bold text-teal-600">{hugoStamina}%</span>
                  </div>
                  <div className="w-full bg-white border border-slate-100 rounded-full h-1.5">
                    <div className="bg-[#128c7e] h-1.5 rounded-full transition-all duration-500" style={{ width: `${hugoStamina}%` }} />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })()}
 
        {/* Female B: Angie */}
        {angie && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col justify-between items-center p-5 bg-slate-50/50 rounded-xl border border-slate-100 shadow-inner text-center relative group transition-all"
            id="char-angie"
          >
            <div className="text-center w-full">
              <div className="relative inline-block mx-auto">
                <img 
                  src={angie.avatarUrl} 
                  alt={angie.name} 
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-full object-cover ring-2 ring-emerald-500/20 group-hover:scale-105 transition-transform" 
                />
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-1 shadow-md">
                  <Zap className="w-3.5 h-3.5 fill-white" />
                </div>
              </div>
              
              <h3 className="font-display font-bold text-emerald-600 mt-3 text-sm">{angie.name}</h3>
              <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider mt-1.5 inline-block">靈魂共鳴 / 創作夥伴</span>
              
              {angie.bio && (
                <p className="text-[11px] text-slate-400 mt-2 font-normal max-w-xs mx-auto leading-normal">
                  {angie.bio}
                </p>
              )}
              
              <p className="text-xs text-slate-700 text-center mt-2 leading-relaxed italic bg-white p-3 rounded-lg border border-slate-100 font-light shadow-sm">
                情感關係："{angie.relationshipToHugo}"
              </p>
            </div>
 
            {/* Metrics Info */}
            <div className="w-full mt-5 pt-4 border-t border-slate-200/60 space-y-3.5 text-left text-xs text-slate-700">
              <div>
                <div className="flex justify-between items-center text-[11px] mb-1">
                  <span className="text-slate-500 flex items-center gap-1"><Heart className="w-3 h-3 text-emerald-500 fill-emerald-500" /> 靈魂共振值:</span>
                  <span className="font-mono font-bold text-emerald-600">{angieMetrics.proximityScore}%</span>
                </div>
                <div className="w-full bg-white border border-slate-100 rounded-full h-1.5">
                  <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${angieMetrics.proximityScore}%` }} />
                </div>
              </div>
 
              <div>
                <div className="flex justify-between items-center text-[11px] pt-1 mb-1">
                  <span className="text-slate-500 flex items-center gap-1"><MessageSquare className="w-3 h-3 text-teal-500" /> 互動頻率活性:</span>
                  <span className="font-mono font-bold text-teal-600">{angieMetrics.tensionScore}%</span>
                </div>
                <div className="w-full bg-white border border-slate-100 rounded-full h-1.5">
                  <div className="bg-[#128c7e] h-1.5 rounded-full transition-all duration-500" style={{ width: `${angieMetrics.tensionScore}%` }} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
 
      </div>
    </div>
  );
}
