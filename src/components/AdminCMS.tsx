/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { db, auth, loginWithGoogle, logoutUser } from '../firebase';
import { doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { defaultCharacters, defaultTimelineEvents } from '../defaultData';
import { Character, TimelineEvent, EventType, SentimentType } from '../types';
import { LogIn, LogOut, ShieldCheck, Database, Plus, Trash2, Edit2, Image, AlertCircle, Calendar, Users } from 'lucide-react';
import { motion } from 'motion/react';

interface AdminCMSProps {
  currentUser: any;
  characters: Character[];
  events: TimelineEvent[];
  isAdmin: boolean;
}

const PRESET_IMAGES = [
  { label: "西九海濱寫生", url: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80&w=400" },
  { label: "浪漫塞納河", url: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=400" },
  { label: "深夜暖意咖啡店", url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=400" },
  { label: "微雨露台花園", url: "https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&q=80&w=400" },
  { label: "高壓加班寫字樓", url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=400" }
];

const EMOJI_CATEGORIES = [
  {
    name: "常用表情 💬",
    emojis: ["😊", "😘", "😍", "🥹", "🥺", "😔", "😢", "😭", "😡", "🤫", "🫣", "😳", "🫠", "💔", "❤️", "🫦", "🍻", "☕", "🍷"]
  },
  {
    name: "專屬角色 🌴",
    emojis: ["🌴", "🐽", "👸", "🐣", "💬", "📱", "💼", "🎨", "🎸", "🎭", "🍿", "🎒", "🚗", "💤", "🌧️"]
  },
  {
    name: "關係張力 ⚡",
    emojis: ["⚠️", "⚡", "🔥", "💣", "💭", "✨", "🌟", "🧭", "📍", "🔍", "🔑", "🕯️", "📝", "🧸"]
  }
];

export default function AdminCMS({ currentUser, characters, events, isAdmin }: AdminCMSProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // Character Profile Editing State
  const [editingCharId, setEditingCharId] = useState<string | null>(null);
  const [charName, setCharName] = useState<string>("");
  const [charAvatarUrl, setCharAvatarUrl] = useState<string>("");
  const [charRelationship, setCharRelationship] = useState<string>("");
  const [charBio, setCharBio] = useState<string>("");

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState<string>("2026-06-12");
  const [time, setTime] = useState<string>("12:00");
  const [characterId, setCharacterId] = useState<string>("Hugo");
  const [receiverId, setReceiverId] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [type, setType] = useState<EventType>(EventType.CHAT);
  const [sentiment, setSentiment] = useState<SentimentType>(SentimentType.NEUTRAL);
  const [isImportant, setIsImportant] = useState<boolean>(false);
  const [order, setOrder] = useState<number>(10);

  // Emoji Keyboard Selection State & Ref
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [activeEmojiTab, setActiveEmojiTab] = useState<number>(0);
  const [showEmojiKeyboard, setShowEmojiKeyboard] = useState<boolean>(true);

  const handleInsertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) {
      setContent(prev => prev + emoji);
      return;
    }
    
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    
    setContent(before + emoji + after);
    
    // Focus back and set cursor position after the emoji
    setTimeout(() => {
      el.focus();
      const newPos = start + emoji.length;
      el.setSelectionRange(newPos, newPos);
    }, 10);
  };

  // Dynamic receiver matching rules: there is no chat record in between Angie and Heidi!
  React.useEffect(() => {
    if (characterId === "Heidi") {
      setReceiverId("Hugo");
    } else if (characterId === "Angie") {
      setReceiverId("Hugo");
    } else if (characterId === "Hugo") {
      if (receiverId !== "Heidi" && receiverId !== "Angie") {
        setReceiverId("Heidi");
      }
    } else if (characterId === "Albee" || characterId === "Chloe") {
      setReceiverId("Ivan");
    } else if (characterId === "Ivan") {
      if (receiverId !== "Albee" && receiverId !== "Chloe") {
        setReceiverId("Albee");
      }
    }
  }, [characterId, receiverId]);

  // Auto clean-up old characters (Ivan, Albee, Chloe) silently in the background on load
  React.useEffect(() => {
    const cleanOldCharacters = async () => {
      try {
        const oldIds = ["Ivan", "Albee", "Chloe"];
        for (const id of oldIds) {
          await deleteDoc(doc(db, "characters", id));
        }
      } catch (err) {
        console.warn("Silent background cleanup of old characters failed (safe to ignore):", err);
      }
    };
    cleanOldCharacters();
  }, []);

  // Status message utility helper
  const triggerStatus = (text: string, isError = false) => {
    setStatusMessage({ text, error: isError });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  // Seeding Default database helper
  const handleSeedDatabase = async () => {
    if (!isAdmin) {
      triggerStatus("僅限管理員 frok3377@gmail.com 執行此項一鍵預載操作！", true);
      return;
    }

    setLoading(true);
    triggerStatus("正在初始化 Firestore 數據庫數據...", false);

    try {
      const batch = writeBatch(db);

      // 1. Seed Characters
      defaultCharacters.forEach((char) => {
        const charRef = doc(db, "characters", char.id);
        batch.set(charRef, char);
      });

      // 2. Seed Timeline Events
      defaultTimelineEvents.forEach((ev) => {
        const evRef = doc(db, "timeline_events", ev.id);
        batch.set(evRef, ev);
      });

      await batch.commit();
      triggerStatus("🎉 成功寫入默認案例數據庫！請返回首頁查看完整多角度故事線。");
    } catch (error) {
      console.error(error);
      triggerStatus("初始化寫入失敗，請確認 Firebase Rules 規則及項目配置。", true);
    } finally {
      setLoading(false);
    }
  };

  // Initiate Edit Character profile
  const initiateEditCharacter = (char: Character) => {
    setEditingCharId(char.id);
    setCharName(char.name);
    setCharAvatarUrl(char.avatarUrl);
    setCharRelationship(char.relationshipToHugo);
    setCharBio(char.bio || "");
  };

  // Cancel Character Edit
  const cancelCharacterEditing = () => {
    setEditingCharId(null);
    setCharName("");
    setCharAvatarUrl("");
    setCharRelationship("");
    setCharBio("");
  };

  // Update Character in Firestore
  const handleUpdateCharacter = async (charId: string) => {
    if (!charName.trim() || !charAvatarUrl.trim() || !charRelationship.trim() || !charBio.trim()) {
      triggerStatus("請填寫完整的主角名字、頭像連結、情感設定與人物簡介！", true);
      return;
    }

    setLoading(true);
    triggerStatus(`正在儲存主角 [${charId}] 的資料卡...`, false);

    try {
      const existingChar = characters.find(c => c.id === charId);
      const updatedChar: Character = {
        id: charId,
        name: charName.trim(),
        avatarUrl: charAvatarUrl.trim(),
        color: existingChar?.color || (charId === "Hugo" ? "#128c7e" : charId === "Heidi" ? "#ec4899" : "#eab308"),
        relationshipToHugo: charRelationship.trim(),
        bio: charBio.trim()
      };

      await setDoc(doc(db, "characters", charId), updatedChar);
      triggerStatus(`🎉 成功更新主角 [${charId}] 的個人資料卡！`);
      cancelCharacterEditing();
    } catch (error) {
      console.error(error);
      triggerStatus(`個人資料卡更新失敗，請確認 Firestore 權限。`, true);
    } finally {
      setLoading(false);
    }
  };



  // Clear Form State
  const clearForm = () => {
    setEditingId(null);
    setContent("");
    setImageUrl("");
    setIsImportant(false);
    setReceiverId("");
    setOrder(events.length > 0 ? Math.max(...events.map(e => e.order)) + 10 : 10);
  };

  // Add or Edit Event Save
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      triggerStatus("僅管理員可以對資料庫進行存檔！", true);
      return;
    }

    if (!content.trim()) {
      triggerStatus("請輸入文本內文或對話內容！", true);
      return;
    }

    setLoading(true);
    const eventId = editingId || `event_${Date.now()}`;
    const existingObj = editingId ? events.find(ev => ev.id === editingId) : null;
    const evCreatedAt = existingObj?.createdAt || Date.now();

    const payload: TimelineEvent = {
      id: eventId,
      date,
      time,
      characterId,
      receiverId,
      content,
      type,
      sentiment,
      isImportant,
      order: Number(order),
      createdAt: evCreatedAt,
      ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {})
    };

    try {
      await setDoc(doc(db, "timeline_events", eventId), payload);
      triggerStatus(editingId ? "✅ 里程碑事件更新成功！" : "✅ 成功添加新時間軸事件！");
      clearForm();
    } catch (err) {
      console.error(err);
      triggerStatus("數據庫保存失敗。違反防火牆規則或連接超時。", true);
    } finally {
      setLoading(false);
    }
  };

  // Delete event
  const handleDeleteEvent = async (id: string) => {
    if (!isAdmin) {
      triggerStatus("僅管理員可以刪除本事件！", true);
      return;
    }

    if (!window.confirm("你確定要永久刪除此時間軸事件嗎？此操作不可逆。")) {
      return;
    }

    setLoading(true);
    try {
      await deleteDoc(doc(db, "timeline_events", id));
      triggerStatus("🗑️ 已成功刪除該時間點對話紀錄。");
      if (editingId === id) clearForm();
    } catch (err) {
      console.error(err);
      triggerStatus("刪除操作被 Firebase 阻擋，可能是權限不足。", true);
    } finally {
      setLoading(false);
    }
  };

  // Click edit node
  const handleEditClick = (ev: TimelineEvent) => {
    setEditingId(ev.id);
    setDate(ev.date);
    setTime(ev.time);
    setCharacterId(ev.characterId);
    setReceiverId(ev.receiverId || "");
    setContent(ev.content);
    setType(ev.type);
    setSentiment(ev.sentiment || SentimentType.NEUTRAL);
    setImageUrl(ev.imageUrl || "");
    setIsImportant(!!ev.isImportant);
    setOrder(ev.order);
    
    // Smooth scroll up to form
    document.getElementById("cms-form-section")?.scrollIntoView({ behavior: 'smooth' });
  };

  // No longer blocking non-logged-in users. Everyone is admin!

  return (
    <div className="space-y-6" id="cms-authenticated-view">
      
      {/* Top Admin banner details */}
      <div className="bg-white p-4 rounded-xl border border-[#e9edef] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#128c7e]/10 border border-[#128c7e]/20 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-[#128c7e]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 text-sm">
                {currentUser?.email || "免登入公開協作模式 (Public Admin)"}
              </span>
              <span className="text-[10px] bg-emerald-100 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full font-bold">無需驗證權限 👑</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              系統已對所有訪客全面開放。你所做的變更將即時同步備份至雲端 Firestore。
            </p>
          </div>
        </div>

        {currentUser ? (
          <button
            onClick={logoutUser}
            className="text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 font-medium px-3.5 py-1.8 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            切換帳號/登出
          </button>
        ) : (
          <button
            onClick={loginWithGoogle}
            className="text-xs text-[#128c7e] hover:text-[#0b645a] bg-[#128c7e]/15 hover:bg-[#128c7e]/25 font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <LogIn className="w-3.5 h-3.5" />
            綁定 Google 帳號 (選填)
          </button>
        )}
      </div>

      {/* Floating Status Notification Toast */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border flex items-start gap-2.5 max-w-xl mx-auto shadow-md z-50 transition-all ${
          statusMessage.error 
            ? "bg-rose-50 border-rose-200 text-rose-800" 
            : "bg-emerald-50 border-emerald-200 text-emerald-800"
        }`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 animate-pulse" />
          <span className="text-xs font-semibold">{statusMessage.text}</span>
        </div>
      )}

      {/* Database Seeder Block */}
      {events.length === 0 && (
        <div className="bg-white border border-amber-200 p-5 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-bold text-amber-600 flex items-center gap-1.5 font-mono">
              <Database className="w-3.5 h-3.5" /> DB STATUS: EMPTY (0 條對話)
            </span>
            <p className="text-xs text-slate-500 leading-relaxed font-light">
              檢測到您的 Firestore 資料庫目前為空。我們特別預留了 Hugo、Heidi 與 Angie 的對立、悸動与抉擇默認案例，可一鍵導入！
            </p>
          </div>
          <button
            onClick={handleSeedDatabase}
            disabled={loading || !isAdmin}
            className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-xs text-white px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          >
            <Database className="w-4 h-4" />
            一鍵注入案例數據包
          </button>
        </div>
      )}

      {/* Protagonist Profiles Editor Box */}
      <div className="bg-white border border-[#e9edef] p-5 rounded-xl space-y-4 shadow-sm" id="cms-character-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-[#128c7e]" />
            👥 主角頭像與情感設定後台管理 (Profile CMS)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {["Hugo", "Heidi", "Angie"].map((charId) => {
            const defaultChar = defaultCharacters.find(dc => dc.id === charId);
            const char = characters.find(c => c.id === charId) || defaultChar;
            const isEditing = editingCharId === charId;

            if (!char) {
              return null;
            }

            return (
              <div 
                key={charId} 
                className={`border p-4 rounded-xl space-y-3 transition-shadow ${
                  isEditing 
                    ? 'border-[#128c7e] shadow-md bg-slate-50/20 ring-1 ring-[#128c7e]/10' 
                    : 'border-slate-100 hover:shadow-sm bg-white'
                }`}
              >
                {/* Profile Pic & Name */}
                <div className="flex items-center gap-3">
                  <div className="relative group shrink-0">
                    <img 
                      src={isEditing ? charAvatarUrl : char.avatarUrl} 
                      alt={char.name} 
                      className="w-12 h-12 rounded-full object-cover border-2 border-slate-100 shadow-sm" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120";
                      }}
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Image className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                  <div className="truncate flex-1">
                    <h4 className="font-semibold text-slate-800 text-xs flex items-center gap-1.5 truncate">
                      {char.name} 
                      <span className="text-[10px] text-slate-400 font-mono font-normal">({char.id})</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 leading-normal line-clamp-1 truncate">
                      {isEditing ? "正在編輯欄位中..." : char.relationshipToHugo}
                    </p>
                  </div>
                </div>

                {isEditing ? (
                  // Editing Fields Form elements
                  <div className="space-y-2.5 text-[11px] pt-1 border-t border-slate-100">
                    <div className="space-y-1">
                      <label className="text-slate-500 font-medium font-semibold">角色顯示名稱 (與 Emoji)</label>
                      <input 
                        type="text"
                        value={charName}
                        onChange={(e) => setCharName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 text-xs font-semibold focus:outline-none focus:border-[#128c7e]"
                        placeholder="e.g. Hugo🌴"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-500 font-medium font-semibold">頭像圖片網址 (Profile Pic URL)</label>
                      <input 
                        type="url"
                        value={charAvatarUrl}
                        onChange={(e) => setCharAvatarUrl(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 text-xs font-mono focus:outline-none focus:border-[#128c7e]"
                        placeholder="https://images.unsplash.com/..."
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-500 font-medium font-semibold">人物簡介 (Character Bio)</label>
                      <textarea 
                        value={charBio}
                        onChange={(e) => setCharBio(e.target.value)}
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 text-xs focus:outline-none focus:border-[#128c7e] resize-none"
                        placeholder="e.g. 處事成熟、追求溫馨生活的務實女性..."
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-500 font-medium font-semibold">角色背景 / 情感描述</label>
                      <textarea 
                        value={charRelationship}
                        onChange={(e) => setCharRelationship(e.target.value)}
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 text-xs focus:outline-none focus:border-[#128c7e] resize-none"
                        placeholder="e.g. 男主角，在感情與理智的拉扯中前行..."
                        required
                      />
                    </div>
                    <div className="flex gap-2 pt-1.5">
                      <button
                        onClick={() => handleUpdateCharacter(charId)}
                        disabled={loading}
                        type="button"
                        className="flex-1 bg-[#128c7e] hover:bg-[#0b645a] text-white py-1.5 rounded-lg font-semibold text-center hover:shadow-xs transition-all cursor-pointer text-xs"
                      >
                        儲存設定
                      </button>
                      <button
                        onClick={cancelCharacterEditing}
                        type="button"
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-center transition-all cursor-pointer text-xs"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  // Static Information Card State
                  <div className="space-y-2 text-[11px] text-slate-500 border-t border-slate-50 pt-2 bg-slate-50/50 p-2.5 rounded-lg text-left">
                    <p className="line-clamp-2 leading-relaxed">
                      <span className="font-semibold text-slate-705 text-slate-700">✍️ 人物簡介：</span>
                      {char.bio || "暫無簡介描述"}
                    </p>
                    <p className="line-clamp-2 leading-relaxed">
                      <span className="font-semibold text-slate-705 text-slate-700">💞 情感設定：</span>
                      {char.relationshipToHugo}
                    </p>
                    <button
                      onClick={() => initiateEditCharacter(char)}
                      type="button"
                      className="mt-1 text-[11px] font-bold text-[#128c7e] hover:text-[#0b645a] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Edit2 className="w-3 h-3" /> 修改頭像、簡介或設定卡
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add / Edit Form (Full-width upper card) */}
      <div className="bg-white border border-[#e9edef] p-5 rounded-xl space-y-4 shadow-sm" id="cms-form-section">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#128c7e]" />
            {editingId ? "編輯現存的時間軸節點" : "新增一個歷史故事定位點"}
          </h3>
          {editingId && (
            <button 
              onClick={clearForm}
              className="text-xs text-[#128c7e] hover:text-[#0b645a] cursor-pointer"
            >
              取消編輯並重設
            </button>
          )}
        </div>

        <form onSubmit={handleSaveEvent} className="space-y-4 text-xs text-slate-700">
          
          {/* Row 1: Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-slate-500 font-medium font-sans">記錄日期</label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-3 focus:outline-none focus:border-[#128c7e] text-slate-800 font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-500 font-medium font-mono">發送時間 (HH:MM)</label>
              <input 
                type="text" 
                placeholder="23:10"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#128c7e] text-slate-800 font-mono"
                required
              />
            </div>
          </div>

          {/* Row 2: Character Actor & Content Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-slate-500 font-medium">發布者 / 表達人物</label>
              <select 
                value={characterId}
                onChange={(e) => setCharacterId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#128c7e]"
              >
                <option value="Hugo">Hugo (男主角)</option>
                <option value="Heidi">Heidi (女主角 A)</option>
                <option value="Angie">Angie (女主角 B)</option>
                {/* Backward compatibility fallback support */}
                <option value="Ivan">Ivan (男主角 - 舊)</option>
                <option value="Albee">Albee (女主角 A - 舊)</option>
                <option value="Chloe">Chloe (女主角 B - 舊)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-500 font-medium text-xs">接收者 (Receiver)</label>
              <select 
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#128c7e] text-xs font-medium"
              >
                {characterId === "Heidi" && <option value="Hugo">Hugo🌴 (唯一可選，不允許與 Angie 通話)</option>}
                {characterId === "Angie" && <option value="Hugo">Hugo🌴 (唯一可選，不允許與 Heidi 通話)</option>}
                {characterId === "Hugo" && (
                  <>
                    <option value="Heidi">Heidi豬🐽</option>
                    <option value="Angie">Angie小公主👸</option>
                  </>
                )}
                {characterId === "Albee" && <option value="Ivan">Ivan (唯一可選，不允許與 Chloe 通話)</option>}
                {characterId === "Chloe" && <option value="Ivan">Ivan (唯一可選，不允許與 Albee 通話)</option>}
                {characterId === "Ivan" && (
                  <>
                    <option value="Albee">Albee</option>
                    <option value="Chloe">Chloe</option>
                  </>
                )}
                {characterId !== "Hugo" && characterId !== "Heidi" && characterId !== "Angie" && characterId !== "Ivan" && characterId !== "Albee" && characterId !== "Chloe" && (
                  <>
                    <option value="Hugo">Hugo🌴</option>
                    <option value="Heidi">Heidi豬🐽</option>
                    <option value="Angie">Angie小公主👸</option>
                  </>
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-500 font-medium">對話類型</label>
              <select 
                value={type}
                onChange={(e) => setType(e.target.value as EventType)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#128c7e] text-xs"
              >
                <option value={EventType.CHAT}>WhatsApp 對話 (Chat)</option>
                <option value={EventType.NARRATIVE}>男主角內心獨白 (Narrative)</option>
                <option value={EventType.SCREENSHOT}>備份截圖紀錄 (Screenshot)</option>
                <option value={EventType.MARKER}>故事里程碑標記 (Marker)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-500 font-medium">情感色調標記</label>
              <select 
                value={sentiment}
                onChange={(e) => setSentiment(e.target.value as SentimentType)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#128c7e]"
              >
                <option value={SentimentType.NEUTRAL}>一般常態 💬 (Neutral)</option>
                <option value={SentimentType.POSITIVE}>溫馨/熱絡 ❤️ (Positive)</option>
                <option value={SentimentType.NEGATIVE}>緊繃/張力 ⚠️ (Negative)</option>
                <option value={SentimentType.SUGGESTIVE}>性暗示 🫦 (Suggestive)</option>
              </select>
            </div>
          </div>

          {/* Content Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-500 font-medium">文本內容</label>
              <button
                type="button"
                onClick={() => setShowEmojiKeyboard(!showEmojiKeyboard)}
                className="text-[11px] text-[#128c7e] hover:text-[#0b645a] font-medium flex items-center gap-1 cursor-pointer transition-colors"
              >
                {showEmojiKeyboard ? "🙈 隱藏表情鍵盤" : "✨ 顯示表情鍵盤"}
              </button>
            </div>
            <textarea 
              ref={textareaRef}
              rows={3}
              placeholder="輸入 WhatsApp 說過的原話，或男主角內心無助的掙扎獨白..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs focus:outline-none focus:border-[#128c7e] text-slate-800 leading-relaxed font-sans"
              required
            />

            {/* Emoji Keyboard Auxiliary Panel */}
            {showEmojiKeyboard && (
              <div className="bg-slate-50/70 border border-slate-200/60 rounded-lg p-2.5 space-y-2 transition-all">
                {/* Category Headers */}
                <div className="flex gap-1.5 border-b border-slate-200/50 pb-1.5">
                  {EMOJI_CATEGORIES.map((cat, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setActiveEmojiTab(i)}
                      className={`text-[10px] px-2 py-0.5 rounded transition-all font-medium cursor-pointer ${
                        activeEmojiTab === i 
                          ? 'bg-[#128c7e] text-white shadow-sm' 
                          : 'bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-150'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
                {/* Grid of Emojis */}
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_CATEGORIES[activeEmojiTab].emojis.map((emoji, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => handleInsertEmoji(emoji)}
                      className="w-7.5 h-7.5 flex items-center justify-center text-base bg-white hover:bg-emerald-50 rounded border border-slate-150 shadow-sm hover:border-[#128c7e] active:scale-95 transition-all cursor-pointer"
                      title="點擊編寫到文本游標位置"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Image Link Input */}
          <div className="space-y-2 border border-slate-100 p-3 rounded-lg bg-slate-50/50">
            <label className="text-slate-500 font-medium flex items-center justify-between">
              <span className="flex items-center gap-1 text-slate-600"><Image className="w-3.5 h-3.5 text-[#128c7e]" /> 配圖 / 證物截圖 URL</span>
              <span className="text-[10px] text-slate-400 italic">（僅限備份截圖或需要插圖時使用）</span>
            </label>
            <input 
              type="text" 
              placeholder="可以直接輸入 Unsplash 圖片網址，或點選下方預設圖源..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-[#128c7e] font-mono text-slate-800"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {PRESET_IMAGES.map((img, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setImageUrl(img.url)}
                  className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-150 px-2 py-1 rounded transition-colors cursor-pointer"
                >
                  {img.label}
                </button>
              ))}
            </div>
          </div>

          {/* Highlight Priority & Order weighting */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-slate-500 font-medium">排序權重 (數字越小排越前)</label>
              <input 
                type="number" 
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#128c7e] text-slate-800 font-mono"
                required
              />
            </div>

            <div className="flex items-center gap-2.5 pt-6 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-150">
              <input 
                type="checkbox" 
                id="isImportant"
                checked={isImportant}
                onChange={(e) => setIsImportant(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#128c7e] bg-white accent-[#128c7e] cursor-pointer"
              />
              <label htmlFor="isImportant" className="text-slate-600 font-medium cursor-pointer select-none">
                設為重要時刻 🌟 (將於定位導軌中顯示)
              </label>
            </div>
          </div>

          {/* Save Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={clearForm}
              className="bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-200 px-4 py-2 rounded-lg cursor-pointer transition-colors"
              disabled={loading}
            >
              清空重置
            </button>
            <button
              type="submit"
              disabled={loading || !isAdmin}
              className="bg-[#128c7e] hover:bg-[#0b645a] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              {loading ? "載入中..." : editingId ? "儲存更新" : "確認添加對話"}
            </button>
          </div>

        </form>
      </div>

      {/* DUAL CHANNEL RECORD STREAMS (Full width lower card) */}
      <div className="bg-white border border-[#e9edef] p-5 rounded-xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 mb-2">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-[#128c7e]" />
              已發布的時間軸紀錄清單 (依對話對象獨立分流)
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 font-light">
              採用資料庫時間排序安全架構。同日期與 HH:MM 時，自動遵循資料庫先後輸入之順序顯示。各頻道獨立歸模，不干擾。
            </p>
          </div>
          <div className="mt-2 sm:mt-0 bg-[#128c7e]/10 text-[#128c7e] font-mono text-xs px-3 py-1 rounded-full font-bold">
            總事件計數: {events.length} 條
          </div>
        </div>

        {/* Dynamic event filters & channel sorting algorithms */}
        {(() => {
          // Safe timestamp fetcher for stable sorting
          const getEventTimestamp = (ev: TimelineEvent): number => {
            if (!ev.createdAt) return 0;
            if (typeof ev.createdAt === 'number') return ev.createdAt;
            if (ev.createdAt?.seconds) return ev.createdAt.seconds * 1000 + Math.floor((ev.createdAt.nanoseconds || 0) / 1000000);
            if (ev.createdAt?.toMillis) return ev.createdAt.toMillis();
            if (ev.createdAt instanceof Date) return ev.createdAt.getTime();
            const ms = Date.parse(ev.createdAt);
            return isNaN(ms) ? 0 : ms;
          };

          const sortEvents = (a: TimelineEvent, b: TimelineEvent) => {
            const dateCompare = a.date.localeCompare(b.date);
            if (dateCompare !== 0) return dateCompare;
            
            const timeCompare = a.time.localeCompare(b.time);
            if (timeCompare !== 0) return timeCompare;
            
            // Stable sort by DB insertion timestamp
            const aMs = getEventTimestamp(a);
            const bMs = getEventTimestamp(b);
            return aMs - bMs || (a.order || 0) - (b.order || 0) || a.id.localeCompare(b.id);
          };

          // Group 1: Heidi 🐷 Channel events (Sender or Receiver is Heidi/Albee/etc, or Hugo thoughts mentioning Heidi/excluding Angie)
          const heidiEvents = events.filter(ev => {
            const isHeidiInvolved = ev.characterId === "Heidi" || ev.receiverId === "Heidi" || ev.characterId === "Albee" || ev.receiverId === "Albee";
            if (isHeidiInvolved) return true;
            
            // Exclude events strictly for Angie
            const isAngieInvolved = ev.characterId === "Angie" || ev.receiverId === "Angie" || ev.characterId === "Chloe" || ev.receiverId === "Chloe";
            if (!isAngieInvolved && !ev.receiverId) {
              if (ev.type === EventType.NARRATIVE || ev.type === EventType.MARKER) {
                return ev.content.includes("Heidi") || ev.content.includes("Albee") || !ev.content.includes("Angie");
              }
            }
            return false;
          }).sort(sortEvents);

          // Group 2: Angie 👸 Channel events (Sender or Receiver is Angie/Chloe/etc, or Hugo thoughts mentioning Angie/excluding Heidi)
          const angieEvents = events.filter(ev => {
            const isAngieInvolved = ev.characterId === "Angie" || ev.receiverId === "Angie" || ev.characterId === "Chloe" || ev.receiverId === "Chloe";
            if (isAngieInvolved) return true;
            
            // Exclude events strictly for Heidi
            const isHeidiInvolved = ev.characterId === "Heidi" || ev.receiverId === "Heidi" || ev.characterId === "Albee" || ev.receiverId === "Albee";
            if (!isHeidiInvolved && !ev.receiverId) {
              if (ev.type === EventType.NARRATIVE || ev.type === EventType.MARKER) {
                return ev.content.includes("Angie") || ev.content.includes("Chloe") || !ev.content.includes("Heidi");
              }
            }
            return false;
          }).sort(sortEvents);

          const renderEventItem = (ev: TimelineEvent) => {
            const isEdited = editingId === ev.id;
            const senderChar = characters.find(c => c.id === ev.characterId);
            const receiverChar = ev.receiverId ? characters.find(c => c.id === ev.receiverId) : null;
            
            const senderNameClean = senderChar ? senderChar.name.replace(/🌴|豬🐽|小公主👸/g, '') : ev.characterId;
            const receiverNameClean = receiverChar ? receiverChar.name.replace(/🌴|豬🐽|小公主👸/g, '') : (ev.receiverId || '');

            return (
              <div 
                key={ev.id}
                className={`p-2.5 rounded-lg border text-xs flex justify-between gap-3 group relative transition-all ${
                  isEdited 
                    ? "bg-[#d9fdd3]/30 border-[#128c7e]" 
                    : "bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200"
                }`}
              >
                <div className="space-y-1 overflow-hidden flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                      {ev.date} {ev.time}
                    </span>
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: senderChar?.color || '#cbd5e1' }} />
                      {senderNameClean}
                      {receiverChar && (
                        <span className="text-slate-400 font-normal mx-0.5 flex items-center">
                          ➜ 
                          <span className="w-2 h-2 rounded-full inline-block ml-1 mr-0.5" style={{ backgroundColor: receiverChar?.color || '#cbd5e1' }} />
                          {receiverNameClean}
                        </span>
                      )}
                    </span>
                    {ev.isImportant && <span className="text-[10px] text-amber-500 font-mono tracking-wide bg-amber-50 border border-amber-100 px-1 rounded">🌟 重要</span>}
                    <span className="text-[9px] text-slate-400 bg-slate-100 px-1 rounded uppercase font-mono">
                      {ev.type}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed italic pr-2 font-light text-[11px] whitespace-pre-wrap">
                    {ev.content}
                  </p>
                  {ev.imageUrl && (
                    <div className="mt-1.5 rounded-lg overflow-hidden max-w-[150px] border border-slate-100">
                      <img src={ev.imageUrl} alt="Attached snippet" className="w-full object-cover max-h-20" />
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-0.5 shrink-0">
                  <button
                    onClick={() => handleEditClick(ev)}
                    className="text-slate-400 hover:text-[#128c7e] p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                    title="編輯此節點"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(ev.id)}
                    disabled={!isAdmin}
                    className="text-slate-400 hover:text-rose-500 p-1 rounded hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="從資料庫刪除此節點"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          };

          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              
              {/* HEIDI CHANNEL VIEW */}
              <div className="border border-slate-200/60 bg-slate-50/50 rounded-xl p-4 flex flex-col h-[520px]">
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200/80">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ec4899]" />
                    Hugo ⇄ Heidi 豬🐽 通訊紀錄頻道
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full font-bold font-sans">
                    共 {heidiEvents.length} 條
                  </span>
                </div>
                
                <div className="overflow-y-auto space-y-2.5 flex-1 pr-1 scrollbar-none">
                  {heidiEvents.map(renderEventItem)}
                  {heidiEvents.length === 0 && (
                    <div className="text-slate-400 italic p-12 text-center text-xs">
                      目前無 Heidi 相關紀錄對話
                    </div>
                  )}
                </div>
              </div>

              {/* ANGIE CHANNEL VIEW */}
              <div className="border border-slate-200/60 bg-slate-50/50 rounded-xl p-4 flex flex-col h-[520px]">
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200/80">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
                    Hugo ⇄ Angie 小公主👸 通訊紀錄頻道
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full font-bold font-sans">
                    共 {angieEvents.length} 條
                  </span>
                </div>

                <div className="overflow-y-auto space-y-2.5 flex-1 pr-1 scrollbar-none">
                  {angieEvents.map(renderEventItem)}
                  {angieEvents.length === 0 && (
                    <div className="text-slate-400 italic p-12 text-center text-xs">
                      目前無 Angie 相關紀錄對話
                    </div>
                  )}
                </div>
              </div>

            </div>
          );
        })()}
      </div>

    </div>
  );
}
