# design style

- use theme color in index.css to avoid weird color design
- use cursor-pointer for clickable elements, like buttons and links

# components
- use functional components instead of class components
- use hooks for state management and side effects
- break down large components into smaller, reusable components
- use modern syntax and good components practices

# ui
- use components/ui
- dark mode is included in index.css, so you do not need to care about it
- DO NOT use dark: prefix in className

# directory structure
- Page entry: frontend/src/pages/Hogehoge
- Components in each page: frontend/src/components/page/{xxx}Page/Hogehoge

# raw data location
- in inspix-hailstorm/cache/plain
- follow the actual data system, do not trust source code