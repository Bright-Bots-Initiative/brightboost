# 都江堰水利工坊 · Waterworks — zh-CN review checklist

> **Purpose:** every Chinese string on the page, for native-speaker + heritage review
> **before this page is shared externally** (the gate named in `waterworks-design.md` §7).
> Strings live in `src/locales/zh-CN/common.json` under `waterworks.*`.
> ⚠️ = uncertain / wants native judgment. Heritage-card rows also need **historical-accuracy** review.

## A. Page shell + navigation (UI)

| Key | English | 中文 | Flag | Suggestions by Olivia |
|---|---|---|---|---|
| shell.credit | Inspired by the 2,300-year-old Dujiangyan waterworks of Chengdu | 灵感来自距今约两千三百年的成都都江堰 | | |
| title.tagline | What will you build? | 你想建造什么？ | | |
| title.pickLevel | Pick your level | 选择难度 | | |
| title.bandK2 | K–2 · Guided | K–2 · 引导模式 | ⚠️There isn't a standard educational label that exactly matches K–2. It is usually referred to as 幼儿园大班和小学1-2年级(upper Kindergarten and grade 1-2 in primary school) | 低年级·引导模式 |
| title.bandG35 | Grades 3–5 | 3–5 年级 | ⚠️ make the name of this level similar to the other two (xx mode. for example, 标准模式standerd mode), instead of grades 3-5 | 3-5年级·标准模式|
| title.bandG68 | Grades 6–8 · Open | 6–8 年级 · 自由模式 | | |
| title.resume | Keep building my river | 继续修建我的河道 | | |
| gallery.title | My Waterworks | 我的水利工坊 | | |
| gallery.back | Back | 返回 | | |
| gallery.create | New river | 修建新的河道 | | |
| gallery.openAria | Open {{name}} | 打开{{name}} | |
| gallery.empty | No rivers yet — build one! | 还没有河道——快来修建吧！ | | |
| build.defaultName | New River | 我的河 | ⚠️ deliberately "我的河" (prototype voice), not literal 新河 | |
| build.renameAria | River name — tap to change | 河的名字——点一下改名 | | |
| build.save | Save | 保存 | | |
| build.saved | Saved ✓ | 已保存 ✓ | | |
| build.savedLocalOff | This device is full — your river stays until you leave the page. | 这台设备储存空间了——退出界面后，你的河会消失 | | | 
| build.draftUnavailable | Autosave is unavailable — keep this tab open so your river isn't lost. | 现在无法自动保存——请不要关闭这个界面，否则你的河会丢失。 | | |
| build.levels | Levels | 关卡 | | |
| build.boardAria | River building board | 造河板 | ⚠️ coinage; screen-reader only | |
| build.cellAria | Row {{r}}, column {{c}}: {{what}} | 第{{r}}行第{{c}}列：{{what}} | | |
| build.flow | Let it flow! 💧 | 放水啦！💧 | | |
| build.rain | Rain | 下雨 | | |
| build.rainOn | 🌧️ Rain: ON | 🌧️ 下雨：开 | | |
| build.clear | Clear | 清空 | | |
| build.caption | 💧 run the water · 🌧️ storm test | 💧放水 · 🌧️暴雨考验 | | |
| build.swipeHint | Swipe to see more | 左右滑动看更多 | | |
| build.swipeHintDismiss | Dismiss swipe hint | 关闭滑动提示 | | |
| build.paletteAria | River parts | 河流部件 | screen-reader only | |
| name.title | Name your river! | 给你的河起个名字！ | | |
| name.placeholder | New River | 我的河 | | |
| name.save | Save it! | 保存！ | | |
| name.later | Later | 以后再说 | | |
| reflect.keepBuilding | Keep building | 继续建造 | | |
| help.button / help.title | How to play | 怎么玩 | | |
| help.step1 | Tap a part, then tap the land to build it. | 点一个零件，再点土地，就造好啦。 | | |
| help.step2 | Press the green "Let it flow!" to run the water. | 按一下绿色的"放水啦！"，水就会流起来。 | | |
| help.step3 | Try "Rain" — does your river still work? | 试试"下雨"——看看你的河会怎么样！| | |
| help.partsTitle | What the parts do | 这些零件有什么用 | | |
| help.note | There's no wrong way — just build and watch! 🌊 | 怎么建造都可以——造好就放水看看！🌊 | | |
| help.go | Let's build! | 开始建造！| | |

## B. Parts + hints (UI)

| Key | English | 中文 | Flag | Suggestions by Olivia|
|---|---|---|---|---|
| part.channel | Channel 水渠 | 水渠 | | |
| part.gate | Gate 水闸 | 水闸 | | |
| part.fishmouth | Fish Mouth 鱼嘴 | 鱼嘴 | | |
| part.sandweir | Flying Sand Weir 飞沙堰 | 飞沙堰 | | |
| part.bottleneck | Bottle-Neck 宝瓶口 | 宝瓶口 | | |
| part.field | Field 农田 | 农田 | | |
| part.erase | Erase | 擦除 | | |
| part.land | open land | 空地 | | |
| hint.channel | Carries water along the path. | 让水沿着水渠流动。 | | |
| hint.gate | Tap it to open or close. Closed blocks water. | 点一下打开或关闭水闸。关上时能挡住水。| | |
| hint.fishmouth | Splits the river — build channels up AND down from it. | 把河流分成两路——沿着两条水路各自修建一条水渠。| | |
| hint.sandweir | Lets extra water spill away safely. | 让多余的水安全地流走。 | | |
| hint.bottleneck | Squeezes the flow so fields don't flood. | 让水流变小，这样农田就不会被淹。 | | |
| hint.field | Turns green when watered, dark when flooded. | 农田浇到水后会变绿，被淹了会变成深蓝。 | | |
| hint.erase | 🧽 Tap a part to rub it out. | 🧽 点击零件把它擦掉。 | | |

## C. Shíxī's voice — targets, unlocks, wonderings (tone: curious, never corrective)

| Key | English | 中文 | Flag | Suggestions by Olivia
|---|---|---|---|---|
| target.k2Water1 | Try this: can you water a field? Put a 🌱 at the end of your channel! | 试试看：你能让水浇到农田吗？在水渠末端放一块🌱 | | |
| target.k2Water2 | Try this: can you water 2 fields in one run? | 试试看：一次放水能浇到两块农田吗？ | | |
| target.k2RainSafe | Try this: turn on Rain — can you keep every field green? | 试试看：开启“下雨”——你能让每块农田都保持绿色吗？ | | |
| target.g35Water3 | Try this: water 3 fields in one run — the Fish Mouth helps! | 试试看：一次放水浇到三块农田——鱼嘴也许能帮上忙！ | | |
| target.g35RainZeroFlood | Try this: survive the Rain with zero flooded fields. | 试试看：在下雨时不让任何一块农田被淹。 | | |
| target.g35HousesDry | Try this: keep every house dry in the Rain. | 试试看：在下雨时不让任何一座房子进水。 | | |
| target.g68Storm | Try this: design a river where the storm changes nothing. | 试试看：设计一条不会被暴雨影响的河道。 | | |
| target.dismiss | Dismiss suggestion | 关闭建议 | | |
| target.met | You did it — that was one of the try-this ideas! ⭐ | 你做到啦——你完成了“试试看”里的目标！⭐ | | |
| unlock.fishmouth | You earned the Fish Mouth! 鱼嘴 — split your river two ways! | 你解锁了鱼嘴！——把河流分成两路吧！ | | |
| unlock.gate | You earned the Gate! 水闸 — open and close the flow! | 你解锁了水闸！——控制水流！ | | |
| unlock.sandweir | The flood showed you why Li Bing built this! You earned the Flying Sand Weir! 飞沙堰 | 洪水来了，你就知道李冰为什么要建造它了——你解锁了飞沙堰！ | | |
| unlock.bottleneck | And the Bottle-Neck! 宝瓶口 — it squeezes the flow so fields don't drown. | 还有宝瓶口！——它让水流变小，这样农田就不会被淹。 | | |
| unlock.tryIt | Tap to try it! | 点一下试试！ | | |
| wonder.stormInvite | Your river has never seen a flood… want to try Rain? 🌧️ | 你的河还没遇到过洪水……下雨后会发生什么？🌧️ | | |
| wonder.flood | Whoa — the water went everywhere! What could keep it out? | 哎呀——水漫出来了！怎样才能挡住它呢？ | | |
| wonder.clean | {{count}} green fields and no floods! What would make your river even better? | {{count}}块农田都绿了，一块也没有被淹！你的河还能变得更棒吗？ | ⚠️ 你的河还能变得更棒吗 sounds a little unnatural | |
| wonder.next | What would you try next? | 接下来你想试试什么？ | | |
| wonder.dry | The fields stayed dry this time. How could the water reach them? | 这次有农田还没有被浇到水。水怎样才能流到那里？ | | |
| wonder.favorite | What's your favorite part of your river? | 在你的河中，你最喜欢哪个部分？ | ⚠️ sounds a little unnatural | |
| wonder.newPart.fishmouth | Your new Fish Mouth split the river! Where else could the water go? | 你用新鱼嘴把水流分成了两路！水还能流到哪里去？ | | |
| wonder.newPart.gate | Your new Gate changed the flow! What happens if you close it? | 你用新水闸改变了水流！把它关上会发生什么？ | | |
| wonder.newPart.sandweir | Your Flying Sand Weir spilled the extra water away! Did it help? | 你用飞沙堰把多余的水排走了！它帮上忙了吗？ | | |
| wonder.newPart.bottleneck | Your Bottle-Neck squeezed the flow! Which field did it protect? | 你用宝瓶口把水流变小了！它保护了哪块农田？ | | |

## D. Pattern book

| Key | English | 中文 | Flag | Suggestions by Olivia |
|---|---|---|---|---|
| patterns.open | Show me ideas 📖 | 给我一些灵感 📖 | | |
| patterns.title | River ideas 📖 | 水利设计灵感 📖 | | |
| patterns.use | Build from this | 按照这个建造 | | |
| patterns.locked | Unlock these parts first | 请先解锁这些部件 | | |
| patterns.confirm | Replace my river? | 换成这个设计？ | | |
| patterns.close | Keep my river | 保留现在的设计 | | |
| pattern.splitRiver | The Split River | 两条河 | | |
| pattern.safeFarm | The Safe Farm | 平安农田 | ⚠️ not sure if this is intended, but sounds like the farm's name is 平安 | |
| pattern.stormProofVillage | The Storm-Proof Village | 防洪村 | ⚠️ also not sure if this is intended, but sounds like the village's name is 防洪 | |

## E. Heritage cards — ⚠️ ALL rows need native + historical review

| Key | English | 中文 | Flag | Suggestions by Olivia |
|---|---|---|---|---|
| heritage.learnMore | Learn more about it! 📜 | 了解它的故事！📜 | |
| heritage.learnMoreAria | Learn about the real {{part}} | 了解现实中的{{part}} | |
| heritage.whatLabel | The real thing: | 现实中的它： | ⚠️ label coinage | |
| heritage.builtLabel | Li Bing's idea: | 李冰的妙想： | ⚠️ label coinage, 妙想 sounds a little unnatural | 李冰的巧思/李冰的设计
| heritage.riverLabel | In YOUR river: | 在你的河里： | | |
| heritage.close | Cool! | 真棒！ | | |
| heritage.fishmouth.what | At Dujiangyan, a long stone island shaped like a fish's mouth sits in the middle of the Min River. | 都江堰的鱼嘴是一道形状像鱼嘴的分水堤，位于岷江中央。 | ⚠️ history. 鱼嘴 is not exactly built with stone. Throughout history, it has been rebuilt many times. In 李冰's time, it was built from 竹笼填石(long sausage-shaped baskets of woven bamboo filled with stones used to protect the riverbed or served as a dam). Since Yuan Dynasty, iron has been used to build 鱼嘴. In modern times, it was reinforced with concrete. <br> suggestion: use 分水堤 (water dividing levee) instead of 长石堤 (long stone island). This introduces the function of 鱼嘴. | |
| heritage.fishmouth.built | Li Bing built it 2,300 years ago to split one wild river into two calmer ones — no dam, just clever shape. | 大约两千三百年前，李冰用它把汹涌的岷江分成两股较为平缓的水流——内江和外江。这样不需要筑坝，全靠巧妙的设计。 | ⚠️ history. 鱼嘴 is not exactly built with stone, and the modern 鱼嘴 isn't the same one as what 李冰 built. <br> The age "2300 years ago" is not exact. suggestion: change it to "about 2300 years ago". | |
| heritage.fishmouth.river | In your river, the Fish Mouth splits the water two ways — dig channels above and below it! | 在你的河里，鱼嘴把水分成两路——试试沿着两条水路分别修建水渠吧！| | |
| heritage.sandweir.what | The Flying Sand Weir is a low spillway that lets floodwater and sand escape over its edge. | 飞沙堰是一道低低的堰，洪水和泥沙可以从上面排出去。| ⚠️ history. The term 堰 alone may be difficuly for young students to understand, more explanation can be added. | |
| heritage.sandweir.built | Li Bing made it just low enough: normal water flows past, but flood water spills safely away. | 李冰把它的高度修得刚刚好：平时水可以正常流过，发洪水时，多余的水会安全地从飞沙堰自行溢出。 | ⚠️ history | |
| heritage.sandweir.river | In your river, the Sand Weir spills extra water off the map — watch the 💦 when a flood hits it! | 在你的河里，飞沙堰能把多余的水排走——在洪水来时看它溢出的💦！ | | |
| heritage.bottleneck.what | The Bottle-Neck is a narrow gap Li Bing's team cut through a whole mountain of rock. | 宝瓶口是李冰带领人们在山中开凿出的狭窄水口。它控制着流入成都平原的水量，让农田和存在既有水用，又不会被洪水淹没。 | ⚠️ history. The role of 宝瓶口 can be more sepcific: it controls the flow of river into Chengdu Plain, where fields and villages are, so they can use the water without being flooded. | 
| heritage.bottleneck.built | It took 8 years of heating the rock with fire and cooling it with water to crack it open — no explosives existed! | 他们先用火烧热岩石、再用水浇凉，反复利用热胀冷缩让山石裂开——据说整整花了八年，那时候可没有炸药！ | ⚠️ history: the fire-and-water account is traditional; "8 years" varies by source. | 
| heritage.bottleneck.river | In your river, the Bottle-Neck lets only a gentle flow through, so your fields drink without drowning. | 你的河里，宝瓶口让水流保持平缓，农田既能得到灌溉又不会被淹没。 | |

---
**Review status:** the ⚠️-flagged rows were native-reviewed on 2026-07-09 (founder-coordinated).
A **full pass over every row** (including unflagged strings) before any external promotion is
tracked as a follow-up; record that reviewer + date here when done.<br>
2026-07-16: all rows are reviewed by Olivia. Suggested translations are included in the column "Suggestions by Olivia". Other comments and flags are included in "Flag"
