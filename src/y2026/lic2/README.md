# LIC Surrender Value Calculator (React)

A React-based calculator and analytics dashboard for **LIC Policy Surrender Value**, developed strictly within `src/y2026/lic2`.

Calculations and data reference:
`src/y2026/lic2/resources/surrender_value_sheet-117130147-v5(2).xlsx`

---

## Features

1. **Main Dashboard**:
   - **Policy Summary Card**: Policy Number (`117130147`), Plan Name (`Plan 815: New Jeevan Anand`), Term (21 Years), Sum Assured (₹5,00,000), Commencement Date (08/07/2014), Premium Frequency (Yearly), and Basic Premium (₹25,602).
   - **4 Key KPI Cards**: Total Basic Premium Paid, Total Vested Bonus Accrued, Current Guaranteed Surrender Value (GSV), and Current Special Surrender Value (SSV).
   - **Payable Surrender Value Badge**: Dynamic indicator displaying whether GSV or SSV applies (LIC pays $\max(\text{GSV}, \text{SSV})$).

2. **All-Year Progression Table**:
   - Interactive table showing all 13 years of policy data from 2014 to 2026.
   - Financial year (India: April–March) and Calendar year (USA: Jan–Dec).
   - Premium paid date, basic premium, cumulative basic premium, cumulative vested bonus, Premium SVF%, Bonus SVF%, GSV, SSV, and Payable SV.
   - Clickable row and quick action buttons.

3. **Year Detail Modal (3 Core Actions)**:
   - **Action 1: Premium Detail**:
     - Basic premium, Accidental Rider, Late fee, GST/taxes, Total annual premium paid, and Cumulative basic premium.
   - **Action 2: Calculate GSV**:
     - $\text{GSV}_1 = \text{Cumulative Basic Premium} \times \text{Premium SVF\%}$
     - $\text{GSV}_2 = \text{Total Vested Bonus} \times \text{Bonus SVF\%}$
     - $\text{Total GSV} = \text{GSV}_1 + \text{GSV}_2$
     - Interactive factor simulator to test custom SVF percentages.
   - **Action 3: Calculate SSV**:
     - $\text{Component 1 (Endowment): } \text{SSV}_1 = (\text{PUSA} + \text{Vested Bonus}) \times \frac{F_1}{100}$
     - $\text{Component 2 (Whole Life): } \text{SSV}_2 = \text{PUSA} \times (1.08)^{-(n-d)} \times \frac{F_2}{100}$
     - $\text{Total SSV} = \text{SSV}_1 + \text{SSV}_2$
     - Factor-1 ($F_1$) from Table 1A and Factor-2 ($F_2$) from Table 2A inputs with live recalculation.
     - Side-by-side comparison with GSV showing higher payable amount.

4. **PDF Statement & Download Option**:
   - Branded official LIC Surrender Statement with company letterhead, policy header, full year breakdown, and signature section.
   - Accessible from the main navbar or inside any year's detail modal.

---

## How to Run

From the project root:

```bash
# Start development server
npm run dev:lic2

# Or build for production
npm run build:lic2
```

Or from inside `src/y2026/lic2`:

```bash
cd src/y2026/lic2
npm run dev
```

