# Set 2 Polish Gap Analysis

## Current State vs "1.5x Premium" Target

### GameShell
| Area | Current | Gap |
|---|---|---|
| Briefing | Plain card with emoji, text, tips list | No chapter/sector identity, no animated entry, feels like a form |
| Results | Static stars, basic score grid, plain achievements | Stars don't animate in, no celebratory motion, achievements are flat pills |
| Transitions | None — instant phase swap | No fade/slide between briefing → game → results |
| Star display | Lucide Star icons with scale class | No stagger animation, no glow, no earned-vs-empty visual contrast |

### Tank Trek
| Area | Current | Gap |
|---|---|---|
| Maze tiles | Flat solid colors, 1px border | No gradients, no tile texture, walls are plain gray blocks |
| Robot | Static 🤖 emoji, rotates on direction | No idle bounce, no success/fail expression, no personality |
| Command queue | Small colored pills with arrow symbols | No execution highlight during run, no active-command indicator |
| Level header | Plain text with counter | No chapter theme badge, no star-condition preview, no progress strip |
| Feedback | Simple colored banner | No animated entry, no confetti/sparkle on success |
| Level complete | Banner + 2 buttons | No collectible count, no efficiency stat, no unlock reveal |
| Chapter themes | None — all levels look identical | No visual distinction between Training Lab / Logic Factory / Smart Core |

### Quantum Quest
| Area | Current | Gap |
|---|---|---|
| Space field | Dark gradient with random white dots | Static stars, no depth layers, no sector-specific color |
| Targets | Solid indigo circles with number | No glow, no orbit trail, no hover ring, no hit particle burst |
| HUD | Functional but flat | No animated streak escalation, lives are emoji repeat string |
| Sector complete | Plain centered text + button | No medal, no progress reveal, no celebration animation |
| Hit feedback | Green/red background swap | No pulse ring, no screen flash, no shake on wrong |
| Power-ups | None | Missing entirely — big opportunity for replay depth |
| Streak visual | `animate-pulse` on orange pill | Subtle, doesn't escalate visually with higher streaks |

### Shared Gaps
1. No CSS keyframe animations for game-specific effects
2. No particle/sparkle system
3. No reduced-motion support
4. No achievement toast component
5. No level progress strip
6. No chapter/sector theme system
7. No animated count-up for scores

## Priority Ranking (Impact vs Effort)

1. **Animated star reveal + score count-up** — high impact, low effort
2. **Maze tile theming + chapter colors** — high impact, medium effort
3. **Robot expressions + movement bounce** — high impact, low effort
4. **Command execution highlight** — high impact, low effort
5. **Target glow + hit pulse** — high impact, low effort
6. **Sector theme colors + layered starfield** — high impact, medium effort
7. **Streak escalation visual** — medium impact, low effort
8. **Achievement toast with animation** — medium impact, medium effort
9. **Level progress strip** — medium impact, low effort
10. **Power-ups (QQ)** — medium impact, high effort
11. **Confetti/sparkle system** — medium impact, medium effort
12. **Reduced-motion support** — low visual impact, important for accessibility
