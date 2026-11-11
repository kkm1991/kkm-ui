# 🚀 kkm-ui

A collection of interactive **3D and physics-based UI components** for Next.js and React, built with **Matter.js**, **Three.js / React Three Fiber**, and **Framer Motion**.

Designed with the **shadcn philosophy** — you own the code. No bloated npm package; components are copied straight into your project's `components/ui/` folder.

---

## 📦 Quick Start

### 1. View Available Components
```bash
npx github:kkm1991/kkm-ui list
```

### 2. Add Any Component
```bash
npx github:kkm1991/kkm-ui add skills-physics
npx github:kkm1991/kkm-ui add website-carousel
npx github:kkm1991/kkm-ui add comet-card
npx github:kkm1991/kkm-ui add encrypted-text
npx github:kkm1991/kkm-ui add tilt-card
npx github:kkm1991/kkm-ui add logo-3d
npx github:kkm1991/kkm-ui add tooltip
npx github:kkm1991/kkm-ui add progressive-blur
```

---

## 🧩 Included Components

### 1. `skills-physics`
Interactive **Matter.js 2D physics playground**. Logos drop with gravity, collide and bounce off boundaries and each other, and can be clicked, dragged, and tossed with momentum.

```tsx
import SkillsPhysics from "@/components/ui/SkillsPhysics";

const SKILLS = [
  { src: "/logos/react.svg", label: "React" },
  { src: "/logos/next.svg", label: "Next.js" },
  { src: "/logos/tailwind.svg", label: "Tailwind" },
];

export default function Page() {
  return <SkillsPhysics items={SKILLS} iconSize={100} minHeight={340} />;
}
```

---

### 2. `website-carousel`
**3D Coverflow momentum carousel** featuring:
- Physics flick inertia (swiping faster skips more cards proportionally)
- Infinite clone looping
- Keyboard navigation (Left, Right, Home, End)
- Smooth perspective 3D rotation & depth layering

```tsx
import WebsiteCarousel from "@/components/ui/WebsiteCarousel";

const PROJECTS = [
  { name: "My SaaS", tech: "Next.js • Prisma", url: "https://...", icon: "/logo.png", badge: "🚀 SaaS" },
];

export default function Page() {
  return <WebsiteCarousel items={PROJECTS} cardWidth={320} />;
}
```

---

### 3. `comet-card`
Realistic **3D spring tilt card** with mouse-following perspective rotation and lighting glare reflection.

```tsx
import CometCard from "@/components/ui/CometCard";

export default function Page() {
  return (
    <CometCard showGlare className="p-8 max-w-sm">
      <h3 className="text-xl font-bold">Interactive Card</h3>
      <p>Hover and move your mouse around!</p>
    </CometCard>
  );
}
```

---

### 4. `encrypted-text`
Cyberpunk **scrambled decrypt text animation** that reveals readable characters when scrolled into view.

```tsx
import EncryptedText from "@/components/ui/EncryptedText";

export default function Page() {
  return (
    <EncryptedText
      text="Welcome to the Future"
      revealDelayMs={40}
      className="text-2xl font-bold font-mono"
    />
  );
}
```

---

### 5. `logo-3d`
**Three.js / React Three Fiber interactive 3D model** component with auto-rotation, hover deceleration, and drag orbit control.

```tsx
import Logo3D from "@/components/ui/Logo3D";

export default function Page() {
  return (
    <Logo3D
      modelUrl="/models/logo.glb"
      width={80}
      height={80}
      autoRotateSpeed={0.6}
    />
  );
}
```

---

## 🛠 Publishing to NPM (Optional)

If you'd like anyone in the world to run `npx kkm-ui add <component>`:

1. Open your terminal in the `kkm-ui` folder:
   ```bash
   cd kkm-ui
   ```
2. Log in to npm (if you haven't):
   ```bash
   npm login
   ```
3. Publish:
   ```bash
   npm publish --access public
   ```

*Tip: If you prefer not publishing to npm yet, anyone can also run it directly via GitHub repo:*
```bash
npx github:your-username/kkm-ui add skills-physics
```

---

## 📄 License
MIT © Khaing Kyaw Min
