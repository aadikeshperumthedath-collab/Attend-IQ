# AttendIQ ⚡
### Smart Student Attendance Command Center for College Students

> **"Never lose track of your attendance again."**  
> AttendIQ tells college students exactly where they stand, how many classes they can safely miss ("bunk allowance"), and how to recover before crossing the minimum attendance threshold.

---

## 🌟 Product Highlights & Startup Features

- **🎯 Precision Attendance Engine**: Real-time mathematically verified calculations for any threshold percentage (default 75%, user adjustable from 50% to 95%).
- **🎟️ Signature "Attendance Budget"**: Calculates your exact safe absence budget and renders them as tangible visual tokens (`[1] [2] [3]...`). Immediately swaps to **Recovery Required** mode if you drop into the danger zone.
- **🔮 Interactive "What-If?" Simulator**: Test future scenarios before skipping. Adjust future missed or attended classes with interactive steppers and sliders to preview projected attendance percentages and risk states with animated transitions.
- **🛡️ Smart Recovery Roadmap**: Generates a sequential milestone journey for subjects below threshold, showing class-by-class progression needed to return to Safe standing.
- **📅 Tomorrow Planner**: Context-aware schedule analyzer that pulls upcoming classes from your timetable and performs high-stakes impact analysis (*"If you attend: 71.9% vs If you miss: 68.8% — Extreme Risk!"*).
- **🗓️ Interactive Monthly Calendar**: Complete attendance calendar with color-coded day markers (Present, Absent, Cancelled) and day schedule inspector.
- **🤖 AttendIQ Assistant**: An intelligent, calculation-focused data copilot that answers natural questions using your live attendance records (e.g. *"Can I miss tomorrow's OS class?"*).
- **🏆 Gamification Layer**: Attendance streak tracking, XP points, dynamic student ranks (*"Level 5: Classroom Commander"*), and unlocked achievement badges.
- **💎 Dark-Mode Startup Aesthetic**: Inspired by Linear, Vercel, and Raycast with subtle gradients, glassmorphism, glowing radial gauges, and micro-interactions.

---

## 📐 Mathematical Formulation

AttendIQ uses exact discrete mathematics for attendance budgeting and deficit recovery.

Let:
- $A$ = Number of classes attended
- $C$ = Total classes conducted ($C \ge A \ge 0$)
- $T$ = Minimum target attendance percentage ($0 < T < 100$)

### 1. Current Attendance Percentage
$$\text{Attendance } \% = \left(\frac{A}{C}\right) \times 100$$

---

### 2. Attendance Budget (Maximum Safe Absences)
When current attendance is $\ge T\%$, the maximum number of future classes $m$ that can be missed while keeping attendance at or above $T\%$ satisfies:
$$\frac{A}{C + m} \ge \frac{T}{100} \implies 100A \ge T(C + m) \implies Tm \le 100A - TC$$

Solving for maximum integer $m$:
$$m = \max\left(0, \; \left\lfloor \frac{100A - T \cdot C}{T} \right\rfloor\right)$$

*Example*: $A = 18, C = 20, T = 75\%$.  
$m = \lfloor (1800 - 1500) / 75 \rfloor = \lfloor 300 / 75 \rfloor = 4\text{ safe misses}$.  
If 4 classes missed: $18 / 24 = 75.0\% \ge 75\%$.

---

### 3. Consecutive Recovery Requirement
When current attendance is $< T\%$, the minimum number of consecutive future classes $k$ that must be attended to cross back $\ge T\%$ satisfies:
$$\frac{A + k}{C + k} \ge \frac{T}{100} \implies 100(A + k) \ge T(C + k) \implies k(100 - T) \ge TC - 100A$$

Solving for minimum integer $k$:
$$k = \left\lceil \frac{T \cdot C - 100A}{100 - T} \right\rceil$$

*Example*: $A = 22, C = 31, T = 75\%$.  
$k = \lceil (75 \times 31 - 2200) / (100 - 75) \rceil = \lceil (2325 - 2200) / 25 \rceil = \lceil 125 / 25 \rceil = 5\text{ classes}$.  
After attending 5 classes: $(22 + 5) / (31 + 5) = 27 / 36 = 75.0\% \ge 75\%$.

---

## 🚀 Quick Launch (How to Run)

### Option 1: Direct Double Click (Windows)
Double-click `start.bat` in the project folder. It will launch the local Python server and open AttendIQ automatically in your default browser.

### Option 2: Command Line (Python 3)
```powershell
python serve.py
```
Open **`http://localhost:5173`** in your browser.

### Option 3: Direct File Opening
Double-click `index.html` or open in any web browser (`Chrome`, `Edge`, `Firefox`, `Safari`). AttendIQ is zero-dependency and runs 100% locally.

---

## ⚡ 3-Minute Judge Demonstration Walkthrough

1. **Landing Page**:
   - Notice the startup hero, value proposition, and interactive live preview card.
   - Click **"⚡ Try Demo (Pre-loaded Semester)"**.
2. **Dashboard Overview**:
   - Observe the time-aware greeting (*"Good evening, Alex Morgan 👋"*).
   - View the overall circular radial gauge (**82.6%**, Amber WARNING indicator).
   - Inspect the **Attendance Budget** card showing **21 classes to spare** with visual token blocks.
3. **Proactive Alerts & Tomorrow Planner**:
   - Check the proactive danger alerts: *Operating Systems (CRITICAL 71.0%)* and *Database Management (Borderline 76.5%)*.
   - In Tomorrow Planner, see the side-by-side risk evaluation: *Missing OS drops attendance to 68.8%*.
4. **Interactive "What If?" Simulator**:
   - Click **"WHAT IF?"** in the top action ribbon.
   - Select **Operating Systems** or **All Subjects**.
   - Drag the slider to simulate missing 2 classes or attending 5 classes.
   - Notice the live Before $\rightarrow$ After animation, status changes, and narrative explanation.
5. **Smart Recovery Plans**:
   - Navigate to **Recovery Plans** in the sidebar.
   - View the step-by-step sequential journey for Operating Systems from Class 1 up to Milestone 5.
6. **One-Click Quick Attendance Logging**:
   - Return to Dashboard and click **+ Present** on any subject card.
   - Notice instant calculation updates, sound effects, and XP reward (+20 XP).
7. **AttendIQ AI Assistant**:
   - Open **AI Assistant** in the sidebar.
   - Click the prompt chip: *"Can I miss tomorrow's OS class?"*
   - See the data-driven calculation breakdown returned in real time.
8. **Calendar & Settings**:
   - View the **Calendar** with color-coded daily dots and click any date to log classes.
   - In **Settings**, adjust the Minimum Attendance threshold from 75% to 80% and watch the entire command center re-calculate instantaneously!

---

## 📂 Project Directory Structure

```text
AttendIQ/
├── index.html              # Main application entry point & landing view
├── serve.py                # Local development HTTP server runner
├── start.bat               # One-click Windows launcher
├── README.md               # Product documentation & judge guide
├── css/
│   └── styles.css          # Design system, dark mode variables, animations, glassmorphism
└── js/
    ├── calculations.js     # Discrete attendance calculation & what-if engine
    ├── storage.js          # LocalStorage persistence, state store & demo seeder
    ├── gamification.js     # Streak, XP, level, achievements & Web Audio API synthesizer
    ├── timetable.js        # Timetable schedule analyzer & tomorrow risk evaluator
    ├── calendar.js         # Monthly calendar matrix & day log inspector
    ├── assistant.js        # Rule-based natural language data copilot
    ├── ui.js               # Reactive DOM renderer, SVG radial gauges & modal managers
    └── app.js              # Application lifecycle & routing controller
```

---

## 🛡️ Edge Cases Handled

- Zero classes conducted yet (displays 100% / "No classes yet" cleanly)
- 100% attendance (calculates safe absence buffer smoothly)
- 0 safe misses remaining (triggers urgent Borderline Warning)
- Deficit recovery when attendance is severely below threshold
- Arbitrary target thresholds (e.g., 60%, 75%, 80%, 85%, 90%)
- Offline / zero-network resilience (pure client-side architecture)
