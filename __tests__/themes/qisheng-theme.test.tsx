import { describe, expect, it } from "vitest";
import {
  AVAILABLE_COLOR_THEMES,
  COLOR_THEMES,
  DEFAULT_COLOR_THEME,
  applyColorTheme,
} from "#/themes/color-themes";

/** WCAG 2.1 relative luminance for "#RRGGBB". */
function luminance(hex: string): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const digits = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: string, b: string): number {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe("启声 color theme", () => {
  const qisheng = COLOR_THEMES.qisheng;
  const base = qisheng.scale["--cool-grey-950"];
  const card = qisheng.scale["--cool-grey-925"];

  it("is the default theme and is offered in the picker as 启声", () => {
    expect(DEFAULT_COLOR_THEME).toBe("qisheng");
    expect(
      AVAILABLE_COLOR_THEMES.find((theme) => theme.key === "qisheng")?.label,
    ).toBe("启声");
  });

  it("defines the full cool-grey ladder the app derives tokens from", () => {
    expect(Object.keys(qisheng.scale).sort()).toEqual(
      Object.keys(COLOR_THEMES["openhands-neutral"].scale).sort(),
    );
  });

  it("covers the same HeroUI stops as the neutral theme", () => {
    // A missing stop would leave HeroUI components rendering the previously
    // applied theme's value, which is how theme switches leak.
    expect(Object.keys(qisheng.heroui).sort()).toEqual(
      Object.keys(COLOR_THEMES["openhands-neutral"].heroui).sort(),
    );
  });

  it("paints the base with the dark stop of the brand gradient", () => {
    expect(base).toBe("#0F172A");
  });

  it("uses the brand blue for accent and primary, keeping warning distinct", () => {
    expect(qisheng.tokens?.["--oh-accent"]).toBe("#3B82F6");
    expect(qisheng.tokens?.["--oh-color-primary"]).toBe("#3B82F6");
    // Warning shares the accent slot in the stock themes; keep them separable
    // so a warning never reads as brand emphasis.
    expect(qisheng.tokens?.["--oh-warning"]).not.toBe("#3B82F6");
  });

  it("keeps the upstream alternate themes on their own brand tokens", () => {
    // The static :root baseline in tailwind.css is now 启声 navy, so a theme
    // that leaves the brand tokens unset would inherit blue buttons.
    for (const key of ["openhands-deepsea", "openhands-neutral"] as const) {
      expect(COLOR_THEMES[key].tokens?.["--oh-color-primary"]).toBe("#c9b974");
      expect(COLOR_THEMES[key].tokens?.["--oh-accent"]).toBe("#c9b974");
    }
  });

  it("keeps the accent usable as body text and as a button surface", () => {
    const accent = qisheng.tokens?.["--oh-accent"] as string;
    // --oh-accent is consumed as text (links) and as a fill (drop indicators,
    // --oh-color-primary button surfaces) with --oh-accent-foreground on top.
    expect(contrast(accent, base)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(accent, card)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(base, accent)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the text ladder at or above the 4.5:1 body-text floor", () => {
    // 600 (--oh-text-subtle) is intentionally excluded: it labels de-emphasised
    // chrome, matching how the stock themes use it.
    for (const step of [
      "--cool-grey-100",
      "--cool-grey-300",
      "--cool-grey-400",
      "--cool-grey-500",
    ]) {
      expect(contrast(qisheng.scale[step], base)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("injects both the brand tokens and the navy scale when applied", () => {
    document.body.setAttribute("data-agent-server-ui", "");

    applyColorTheme("qisheng");

    const styleEl = document.getElementById("oh-color-theme-override");
    expect(styleEl?.textContent).toContain("--oh-accent: #3B82F6;");
    expect(styleEl?.textContent).toContain("--oh-color-primary: #3B82F6;");
    // Without the scale the navy would never reach the chrome.
    expect(styleEl?.textContent).toContain("--cool-grey-950: #0F172A;");

    styleEl?.remove();
    document.body.removeAttribute("data-agent-server-ui");
    for (const property of [
      "--oh-color-primary",
      "--oh-accent",
      "--oh-warning",
    ]) {
      document.body.style.removeProperty(property);
    }
  });
});
