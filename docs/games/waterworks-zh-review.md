# 石犀工坊 · Waterworks — zh-CN review checklist

> **Purpose:** every Chinese string on the page, for native-speaker + heritage review
> **before this page is shared externally** (the gate named in `waterworks-design.md` §7).
> Strings live in `src/locales/zh-CN/common.json` under `waterworks.*`.
> ⚠️ = uncertain / wants native judgment. Heritage-card rows also need **historical-accuracy** review.

## A. Page shell + navigation (UI)

| Key | English | 中文 | Flag |
|---|---|---|---|
| shell.credit | Inspired by the 2,300-year-old Dujiangyan waterworks of Chengdu | 灵感来自成都两千三百年历史的都江堰 | |
| title.tagline | What will you build? | 你想造什么？ | |
| title.pickLevel | Pick your level | 选择难度 | |
| title.bandK2 | K–2 · Guided | K–2 · 引导 | ⚠️ 引导 as a band label — natural? |
| title.bandG35 | Grades 3–5 | 3–5 年级 | |
| title.bandG68 | Grades 6–8 · Open | 6–8 年级 · 自由 | |
| title.resume | Keep building my river | 继续造我的河 | |
| gallery.title | My Waterworks | 我的水利工坊 | |
| gallery.back | Back | 返回 | |
| gallery.create | New river | 造新河 | |
| gallery.openAria | Open {{name}} | 打开{{name}} | |
| gallery.empty | No rivers yet — build one! | 还没有河——快来造一条吧！ | |
| build.defaultName | New River | 我的河 | ⚠️ deliberately "我的河" (prototype voice), not literal 新河 |
| build.renameAria | River name — tap to change | 河的名字——点一下改名 | |
| build.save | Save | 保存 | |
| build.saved | Saved ✓ | 已保存 ✓ | |
| build.savedLocalOff | This device is full — your river stays until you leave the page. | 这台设备存满了——离开页面前你的河还在。 | ⚠️ phrasing of quota message for kids |
| build.levels | Levels | 关卡 | |
| build.boardAria | River building board | 造河板 | ⚠️ coinage; screen-reader only |
| build.cellAria | Row {{r}}, column {{c}}: {{what}} | 第{{r}}行第{{c}}列：{{what}} | |
| build.flow | Let it flow! 💧 | 放水啦！💧 | |
| build.rain | Rain | 下雨 | |
| build.rainOn | 🌧️ Rain: ON | 🌧️ 下雨：开 | |
| build.clear | Clear | 清空 | |
| build.caption | 💧 run the water · 🌧️ storm test | 💧放水 · 🌧️暴雨考验 | |
| build.swipeHint | Swipe to see more | 左右滑动看更多 | |
| build.swipeHintDismiss | Dismiss swipe hint | 关闭滑动提示 | |
| name.title | Name your river! | 给你的河起个名字！ | |
| name.placeholder | New River | 我的河 | |
| name.save | Save it! | 保存！ | |
| name.later | Later | 以后再说 | |
| reflect.keepBuilding | Keep building | 继续造 | |
| help.button / help.title | How to play | 怎么玩 | |
| help.step1 | Tap a part, then tap the land to build it. | 点一个零件，再点土地，就造好啦。 | |
| help.step2 | Press the green "Let it flow!" to run the water. | 按绿色的"放水啦！"，水就流起来。 | |
| help.step3 | Try "Rain" — does your river still work? | 试试"下雨"——你的河还好用吗？ | |
| help.partsTitle | What the parts do | 这些零件做什么 | |
| help.note | There's no wrong way — just build and watch! 🌊 | 怎么造都可以——造好就放水看看！🌊 | |
| help.go | Let's build! | 开始造！ | |

## B. Parts + hints (UI)

| Key | English | 中文 | Flag |
|---|---|---|---|
| part.channel | Channel 水渠 | 水渠 | |
| part.gate | Gate 水闸 | 水闸 | |
| part.fishmouth | Fish Mouth 鱼嘴 | 鱼嘴 | |
| part.sandweir | Flying Sand Weir 飞沙堰 | 飞沙堰 | |
| part.bottleneck | Bottle-Neck 宝瓶口 | 宝瓶口 | |
| part.field | Field 农田 | 农田 | |
| part.erase | Erase | 擦除 | |
| part.land | open land | 空地 | |
| hint.channel | Carries water along the path. | 沿着小路把水送过去。 | |
| hint.gate | Tap it to open or close. Closed blocks water. | 点它开或关，关上就挡住水。 | |
| hint.fishmouth | Splits the river — build channels up AND down from it. | 把河分两股——从它往上、往下各造一条水渠。 | |
| hint.sandweir | Lets extra water spill away safely. | 让多余的水安全地流走。 | |
| hint.bottleneck | Squeezes the flow so fields don't flood. | 让水流变小，农田就不会被淹。 | |
| hint.field | Turns green when watered, dark when flooded. | 有水变绿，水太多变深蓝。 | |
| hint.erase | 🧽 Tap a part to rub it out. | 🧽 点零件把它擦掉。 | |

## C. Shíxī's voice — targets, unlocks, wonderings (tone: curious, never corrective)

| Key | English | 中文 | Flag |
|---|---|---|---|
| target.k2Water1 | Try this: can you water a field? Put a 🌱 at the end of your channel! | 试试看：能让水浇到农田吗？在水渠末端放一块🌱！ | |
| target.k2Water2 | Try this: can you water 2 fields in one run? | 试试看：一次放水能浇到两块农田吗？ | |
| target.k2RainSafe | Try this: turn on Rain — can you keep every field green? | 试试看：打开下雨——能让每块农田都保持绿色吗？ | |
| target.g35Water3 | Try this: water 3 fields in one run — the Fish Mouth helps! | 试试看：一次放水浇到三块农田——鱼嘴能帮上忙！ | |
| target.g35RainZeroFlood | Try this: survive the Rain with zero flooded fields. | 试试看：下雨时一块农田都不被淹。 | |
| target.g35HousesDry | Try this: keep every house dry in the Rain. | 试试看：下雨时让每座房子都不进水。 | |
| target.g68Storm | Try this: design a river where the storm changes nothing. | 试试看：设计一条暴雨也影响不了的河。 | |
| target.dismiss | Dismiss suggestion | 关闭建议 | |
| target.met | You did it — that was one of the try-this ideas! ⭐ | 你做到啦——这正是"试试看"里的点子！⭐ | |
| unlock.fishmouth | You earned the Fish Mouth! 鱼嘴 — split your river two ways! | 你赢得了鱼嘴！——把河分成两条吧！ | ⚠️ 赢得 vs 获得 for kids? |
| unlock.gate | You earned the Gate! 水闸 — open and close the flow! | 你赢得了水闸！——开关水流！ | ⚠️ same |
| unlock.sandweir | The flood showed you why Li Bing built this! You earned the Flying Sand Weir! 飞沙堰 | 洪水让你明白李冰为什么造它！你赢得了飞沙堰！ | ⚠️ same |
| unlock.bottleneck | And the Bottle-Neck! 宝瓶口 — it squeezes the flow so fields don't drown. | 还有宝瓶口！——它让水流变小，农田就不会被淹。 | |
| unlock.tryIt | Tap to try it! | 点一下试试！ | |
| wonder.stormInvite | Your river has never seen a flood… want to try Rain? 🌧️ | 你的河还没遇到过洪水……要不要试试下雨？🌧️ | |
| wonder.flood | Whoa — the water went everywhere! What could keep it out? | 哎呀——水漫出来了！怎样才能挡住它呢？ | |
| wonder.clean | {{count}} green fields and no floods! What would make your river even better? | {{count}}块农田都绿了，还没有洪水！怎样让你的河更棒？ | |
| wonder.next | What would you try next? | 接下来你想试试什么？ | |
| wonder.dry | The fields stayed dry this time. How could the water reach them? | 这次农田还是干的。水怎样才能流到那里？ | |
| wonder.favorite | What's your favorite part of your river? | 你最喜欢你的河的哪个部分？ | |
| wonder.newPart.fishmouth | Your new Fish Mouth split the river! Where else could the water go? | 你的新鱼嘴把河分开了！水还能流去哪里？ | |
| wonder.newPart.gate | Your new Gate changed the flow! What happens if you close it? | 你的新水闸改变了水流！关上它会怎样？ | |
| wonder.newPart.sandweir | Your Flying Sand Weir spilled the extra water away! Did it help? | 你的飞沙堰把多余的水送走了！它帮上忙了吗？ | |
| wonder.newPart.bottleneck | Your Bottle-Neck squeezed the flow! Which field did it protect? | 你的宝瓶口让水流变小了！它保护了哪块农田？ | |

## D. Pattern book

| Key | English | 中文 | Flag |
|---|---|---|---|
| patterns.open | Show me ideas 📖 | 给我看看点子 📖 | |
| patterns.title | River ideas 📖 | 河的点子 📖 | |
| patterns.use | Build from this | 照这个造 | |
| patterns.confirm | Replace my river? | 替换我的河？ | |
| patterns.close | Keep my river | 保留我的河 | |
| pattern.splitRiver | The Split River | 两条河 | |
| pattern.safeFarm | The Safe Farm | 平安农田 | |
| pattern.stormProofVillage | The Storm-Proof Village | 防洪村 | |

## E. Heritage cards — ⚠️ ALL rows need native + historical review

| Key | English | 中文 | Flag |
|---|---|---|---|
| heritage.learnMore | Learn more about it! 📜 | 了解它的故事！📜 | |
| heritage.learnMoreAria | Learn about the real {{part}} | 了解真正的{{part}} | |
| heritage.whatLabel | The real thing: | 真实的它： | ⚠️ label coinage |
| heritage.builtLabel | Li Bing's idea: | 李冰的妙想： | ⚠️ label coinage |
| heritage.riverLabel | In YOUR river: | 在你的河里： | |
| heritage.close | Cool! | 真棒！ | |
| heritage.fishmouth.what | At Dujiangyan, a long stone island shaped like a fish's mouth sits in the middle of the Min River. | 在都江堰，一座像鱼嘴一样的长石堤立在岷江中间。 | ⚠️ history |
| heritage.fishmouth.built | Li Bing built it 2,300 years ago to split one wild river into two calmer ones — no dam, just clever shape. | 两千三百年前，李冰用它把一条汹涌的大河分成两条温顺的河——不筑坝，全靠巧妙的形状。 | ⚠️ history |
| heritage.fishmouth.river | In your river, the Fish Mouth splits the water two ways — dig channels above and below it! | 在你的河里，鱼嘴把水分成两路——在它的上面和下面挖水渠吧！ | |
| heritage.sandweir.what | The Flying Sand Weir is a low spillway that lets floodwater and sand escape over its edge. | 飞沙堰是一道矮矮的溢流堰，洪水和泥沙会从它上面翻过去流走。 | ⚠️ history |
| heritage.sandweir.built | Li Bing made it just low enough: normal water flows past, but flood water spills safely away. | 李冰把它修得刚刚好：平时水安静地流过，发洪水时多余的水安全地溢走。 | ⚠️ history |
| heritage.sandweir.river | In your river, the Sand Weir spills extra water off the map — watch the 💦 when a flood hits it! | 在你的河里，飞沙堰把多余的水排走——洪水来时看它冒出的💦！ | |
| heritage.bottleneck.what | The Bottle-Neck is a narrow gap Li Bing's team cut through a whole mountain of rock. | 宝瓶口是李冰的队伍在整座石山上凿出的窄窄的口子。 | ⚠️ history |
| heritage.bottleneck.built | It took 8 years of heating the rock with fire and cooling it with water to crack it open — no explosives existed! | 他们用火烧热岩石、再用水浇凉，让山石裂开——整整花了八年，那时可没有炸药！ | ⚠️ history: the fire-and-water account is traditional; "8 years" varies by source |
| heritage.bottleneck.river | In your river, the Bottle-Neck lets only a gentle flow through, so your fields drink without drowning. | 在你的河里，宝瓶口只放温和的水流过去，农田喝饱水也不会被淹。 | |

---
**Review status: PENDING.** Once reviewed, record the reviewer + date here and clear the ⚠️ rows.
