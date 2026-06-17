import { Character, TimelineEvent, EventType, SentimentType } from './types';

export const defaultCharacters: Character[] = [
  {
    id: "Hugo",
    name: "Hugo🌴",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120",
    color: "#128c7e", // Hugo's signature color
    relationshipToHugo: "男主角，夾在穩定與悸動之間，在尋求自我與責任的平衡點。"
  },
  {
    id: "Heidi",
    name: "Heidi豬🐽",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120",
    color: "#ec4899", // Pink
    relationshipToHugo: "與 Hugo 穩定交往 4 年的女朋友。性格務實、溫柔，渴望穩定的婚姻生活，但最近感覺到 Hugo 的心不在焉與冷淡。"
  },
  {
    id: "Angie",
    name: "Angie小公主👸",
    avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=120",
    color: "#eab308", // Yellow
    relationshipToHugo: "Hugo 在藝術寫生班認識的女孩。富有藝術氣息、隨性熱烈、富有靈性與創作力，對 Hugo 展現出濃烈的愛意與崇拜。"
  }
];

export const defaultTimelineEvents: TimelineEvent[] = [
  {
    id: "event_1",
    date: "2026-04-10",
    time: "20:30",
    characterId: "Heidi",
    receiverId: "Hugo",
    content: "「今晚又要加班嗎？我煮了你最愛吃的人參雞湯，快點回來喔 ❤️」",
    type: EventType.CHAT,
    sentiment: SentimentType.POSITIVE,
    isImportant: false,
    order: 10,
    createdAt: 1718000001000
  },
  {
    id: "event_2",
    date: "2026-04-10",
    time: "22:15",
    characterId: "Hugo",
    receiverId: "Heidi",
    content: "「嗯，公司在拼這個重大的提案，明天還要見客。我可能要12點後才回到，妳先睡，別等我了。」",
    type: EventType.CHAT,
    sentiment: SentimentType.NEUTRAL,
    isImportant: false,
    order: 20,
    createdAt: 1718000002000
  },
  {
    id: "event_3",
    date: "2026-04-10",
    time: "23:45",
    characterId: "Angie",
    receiverId: "Hugo",
    content: "「Hugo，剛剛聽你彈那首結他，真的好有感覺 🎸✨。謝謝你今晚陪我在露台吹風傾偈，我覺得靈感都回來了！」",
    type: EventType.CHAT,
    sentiment: SentimentType.POSITIVE,
    isImportant: true,
    order: 30,
    createdAt: 1718000003000
  },
  {
    id: "event_4",
    date: "2026-04-11",
    time: "00:15",
    characterId: "Hugo",
    receiverId: "",
    content: "【男主角內心獨白】\n坐在回家的的士上，看著窗外倒退的霓虹燈。一邊是 Heidi 煲好已經變涼的雞湯，另一邊是 Angie 手機螢幕上閃爍著的星光... 我突然感到一陣強烈的罪惡感與不知所措。",
    type: EventType.NARRATIVE,
    sentiment: SentimentType.NEGATIVE,
    isImportant: false,
    order: 40,
    createdAt: 1718000004000
  },
  {
    id: "event_5",
    date: "2026-04-18",
    time: "14:20",
    characterId: "Heidi",
    receiverId: "Hugo",
    content: "「我們好像很久沒有好好的拍拖了。今個星期日，我們去西貢行山野餐好嗎？」",
    type: EventType.CHAT,
    sentiment: SentimentType.NEUTRAL,
    isImportant: false,
    order: 50,
    createdAt: 1718000005000
  },
  {
    id: "event_6",
    date: "2026-04-18",
    time: "15:05",
    characterId: "Hugo",
    receiverId: "Heidi",
    content: "「行山我怕會很累，下週可能還要高強度工作... 我們在家看 Netflix 休息吧。」",
    type: EventType.CHAT,
    sentiment: SentimentType.NEGATIVE,
    isImportant: false,
    order: 60,
    createdAt: 1718000006000
  },
  {
    id: "event_7",
    date: "2026-04-25",
    time: "21:10",
    characterId: "Angie",
    receiverId: "Hugo",
    content: "「你看！這是我新畫的設計草圖，背景用了你推薦的那個湛藍色，超好看！週末我要去西九文化區寫生，要不要一起去搵靈感？」",
    type: EventType.CHAT,
    sentiment: SentimentType.POSITIVE,
    isImportant: false,
    order: 70,
    createdAt: 1718000007000
  },
  {
    id: "event_8",
    date: "2026-04-25",
    time: "21:30",
    characterId: "Hugo",
    receiverId: "Angie",
    content: "「好啊，我也剛好想買幾本攝影集。星期六下午 2 點不見不散！」",
    type: EventType.CHAT,
    sentiment: SentimentType.POSITIVE,
    isImportant: false,
    order: 80,
    createdAt: 1718000008000
  },
  {
    id: "event_9",
    date: "2026-04-26",
    time: "18:30",
    characterId: "Hugo",
    receiverId: "Angie",
    content: "【西九寫生截圖紀錄】\n黃昏時分，海風輕輕吹過。我和 Angie 坐在草地上，她靠在我的肩膀上睡著了，身邊散落著畫筆。我拍下了這一幕，這是我很久沒有體會過的自由與心跳... 📸",
    imageUrl: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80&w=400",
    type: EventType.SCREENSHOT,
    sentiment: SentimentType.POSITIVE,
    isImportant: true,
    order: 90,
    createdAt: 1718000009000
  },
  {
    id: "event_10",
    date: "2026-05-02",
    time: "08:15",
    characterId: "Heidi",
    receiverId: "Hugo",
    content: "「Hugo，我星期六幫你洗衣服的時候，在你外套口袋發現了一張西九文化區的精品店收據。上週六你不是說跟同事開會嗎？為什麼收據上買了女生的水彩畫冊？」",
    type: EventType.CHAT,
    sentiment: SentimentType.NEGATIVE,
    isImportant: true,
    order: 100,
    createdAt: 1718000010000
  },
  {
    id: "event_11",
    date: "2026-05-02",
    time: "09:00",
    characterId: "Hugo",
    receiverId: "Heidi",
    content: "「那是幫一個新同事買的參考書，開會順便給她的，你別想太多好嗎？我很累了，想再睡一下。」",
    type: EventType.CHAT,
    sentiment: SentimentType.NEGATIVE,
    isImportant: false,
    order: 110,
    createdAt: 1718000011000
  },
  {
    id: "event_12",
    date: "2026-05-15",
    time: "23:10",
    characterId: "Angie",
    receiverId: "Hugo",
    content: "「Hugo... 我知道我不應該這樣，但我發覺我越來越習慣有你在身邊。我好像，真的喜歡上你了。如果可以，我們在一起好嗎？」",
    type: EventType.CHAT,
    sentiment: SentimentType.POSITIVE,
    isImportant: true,
    order: 120,
    createdAt: 1718000012000
  },
  {
    id: "event_13",
    date: "2026-05-16",
    time: "01:25",
    characterId: "Hugo",
    receiverId: "",
    content: "【深夜抉擇】\n一邊是交往四年，所有親友都認定會結婚、生活平實卻缺乏火花的 Heidi。\n另一邊是如同璀璨煙火，帶給我熱烈靈魂震撼與創作激情、卻不知能否長久的 Angie。\n我在對話框輸入了無數遍「對不起」，又刪除了無數遍...",
    type: EventType.NARRATIVE,
    sentiment: SentimentType.NEGATIVE,
    isImportant: true,
    order: 130,
    createdAt: 1718000013000
  },
  {
    id: "event_14",
    date: "2026-06-05",
    time: "19:00",
    characterId: "Heidi",
    receiverId: "Hugo",
    content: "「我們談談吧。今天晚上 8 點，在我們第一次表白的那間深夜咖啡廳。如果今天你不來，我想我們就到此為止了。」",
    type: EventType.CHAT,
    sentiment: SentimentType.NEGATIVE,
    isImportant: true,
    order: 140,
    createdAt: 1718000014000
  },
  {
    id: "event_15",
    date: "2026-06-05",
    time: "19:45",
    characterId: "Angie",
    receiverId: "Hugo",
    content: "「Hugo，我今晚在畫廊等你的決定。你說過要一起去巴黎辦展覽的，機票我都訂好了... 你看，這是日落的塞納河，真的很美 ✨✈️」",
    imageUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=400",
    type: EventType.SCREENSHOT,
    sentiment: SentimentType.POSITIVE,
    isImportant: true,
    order: 150,
    createdAt: 1718000015000
  },
  {
    id: "event_16",
    date: "2026-06-12",
    time: "11:00",
    characterId: "Hugo",
    receiverId: "",
    content: "【站在十字路口】\n今天是抉擇的那一天。無論我走向哪一端，我都會傷害其中一個深愛著我的女孩，也必將重新定義我自己的人生道路。",
    type: EventType.MARKER,
    sentiment: SentimentType.NEUTRAL,
    isImportant: true,
    order: 160,
    createdAt: 1718000016000
  }
];
