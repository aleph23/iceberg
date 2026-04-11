import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { hasSeenTooltip, setTooltipSeen } from "../../core/storage/appState";

type TourStep = {
  id: string;
  targetAttr: string;
  title: string;
  body: string;
};

const STEPS: TourStep[] = [
  {
    id: "chats",
    targetAttr: "nav-chats",
    title: "This is where your chats live",
    body: "All your one-on-one conversations with characters hang out here. Jump back in anytime and we'll keep your place.",
  },
  {
    id: "groups",
    targetAttr: "nav-groups",
    title: "Hang out in group chats",
    body: "Bring multiple characters into the same room and watch them talk to each other, or jump in yourself whenever you feel like it.",
  },
  {
    id: "discover",
    targetAttr: "nav-discover",
    title: "Find new characters to meet",
    body: "Browse what the community has shared and pull in any character that catches your eye. New favorites are one tap away.",
  },
  {
    id: "library",
    targetAttr: "nav-library",
    title: "Your personal library",
    body: "Everything you've made or saved lives here: characters, personas, prompts, the works. Think of it as your stash.",
  },
  {
    id: "settings",
    targetAttr: "top-settings",
    title: "Make it yours",
    body: "Swap providers, pick different models, tweak how the app looks. Pretty much everything is adjustable from settings.",
  },
  {
    id: "search",
    targetAttr: "top-search",
    title: "Find anything, fast",
    body: "Looking for a specific chat or character? Search across everything from right here. No digging required.",
  },
  {
    id: "create",
    targetAttr: "nav-create",
    title: "And finally, create!",
    body: "Tap the plus whenever inspiration strikes. Spin up a new character, persona, or start something from scratch.",
  },
];

const TOUR_STORAGE_KEY = "app_tour_v1";
const LEGACY_TOOLTIP_KEY = "create_button";

const SPOTLIGHT_PAD = 8;
const CARD_GAP = 16;
const EDGE_PAD = 16;

type Rect = { left: number; top: number; width: number; height: number };

function getViewport() {
  if (typeof window === "undefined") return { w: 0, h: 0 };
  return { w: window.innerWidth, h: window.innerHeight };
}

/**
 * First-run guided tour that walks the user through the bottom nav, the top
 * nav actions, and finally the create button. Uses `data-tour-id` attributes on
 * target elements so the tour stays decoupled from the nav components.
 */
export function GuidedTour({ onDismiss }: { onDismiss: () => void }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState(getViewport);
  const [cardSize, setCardSize] = useState({ width: 320, height: 0 });
  const [cardMeasured, setCardMeasured] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const step = STEPS[stepIdx];
  const isLastStep = stepIdx === STEPS.length - 1;

  const finish = useCallback(() => {
    void setTooltipSeen(TOUR_STORAGE_KEY, true);
    onDismiss();
  }, [onDismiss]);

  const next = useCallback(() => {
    if (isLastStep) {
      finish();
    } else {
      setStepIdx((i) => i + 1);
    }
  }, [isLastStep, finish]);

  useLayoutEffect(() => {
    if (!step) return;

    let raf = 0;
    const measure = () => {
      const el = document.querySelector<HTMLElement>(
        `[data-tour-id="${step.targetAttr}"]`,
      );
      if (!el) {
        if (stepIdx >= STEPS.length - 1) {
          finish();
        } else {
          setStepIdx((i) => i + 1);
        }
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ left: r.left, top: r.top, width: r.width, height: r.height });
      setViewport(getViewport());
    };

    raf = requestAnimationFrame(measure);

    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(() => measure());
    ro.observe(document.documentElement);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, [stepIdx, step, finish]);

  const hasRect = rect != null;
  useLayoutEffect(() => {
    if (!cardRef.current) return;
    const el = cardRef.current;
    const update = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w > 0 && h > 0) {
        setCardSize({ width: w, height: h });
        setCardMeasured(true);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [stepIdx, hasRect]);

  if (!step || !rect) return null;

  const hole = {
    x: Math.max(0, rect.left - SPOTLIGHT_PAD),
    y: Math.max(0, rect.top - SPOTLIGHT_PAD),
    w: rect.width + SPOTLIGHT_PAD * 2,
    h: rect.height + SPOTLIGHT_PAD * 2,
  };

  const targetCenterY = rect.top + rect.height / 2;
  const placeAbove = targetCenterY > viewport.h / 2;

  const desiredCenterX = rect.left + rect.width / 2;
  const halfW = cardSize.width / 2;
  const minCenterX = EDGE_PAD + halfW;
  const maxCenterX = Math.max(minCenterX, viewport.w - EDGE_PAD - halfW);
  const clampedCenterX = Math.min(maxCenterX, Math.max(minCenterX, desiredCenterX));
  const cardLeft = clampedCenterX - halfW;

  const cardTop = placeAbove
    ? Math.max(EDGE_PAD, hole.y - CARD_GAP - cardSize.height)
    : Math.min(
        viewport.h - EDGE_PAD - cardSize.height,
        hole.y + hole.h + CARD_GAP,
      );

  const spring = { type: "spring", damping: 26, stiffness: 220 } as const;

  return (
    <AnimatePresence>
      <motion.div
        key="guided-tour"
        className="fixed inset-0 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        {/* Spotlight overlay */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden
        >
          <defs>
            <mask id="guided-tour-mask">
              <rect width="100%" height="100%" fill="white" />
              <motion.rect
                initial={false}
                animate={{ x: hole.x, y: hole.y, width: hole.w, height: hole.h }}
                transition={spring}
                rx={14}
                ry={14}
                fill="black"
              />
            </mask>
            <filter id="guided-tour-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.74)"
            mask="url(#guided-tour-mask)"
          />
          {/* Outer blurred halo */}
          <motion.rect
            initial={false}
            animate={{ x: hole.x, y: hole.y, width: hole.w, height: hole.h }}
            transition={spring}
            rx={14}
            ry={14}
            fill="none"
            stroke="#34d399"
            strokeOpacity={0.55}
            strokeWidth={4}
            filter="url(#guided-tour-glow)"
          />
          {/* Sharp inner ring */}
          <motion.rect
            initial={false}
            animate={{ x: hole.x, y: hole.y, width: hole.w, height: hole.h }}
            transition={spring}
            rx={14}
            ry={14}
            fill="none"
            stroke="#34d399"
            strokeOpacity={0.9}
            strokeWidth={1.5}
          />
        </svg>

        {/* Click blocker — absorbs clicks outside the card so the user can't
            accidentally interact with the app mid-tour. */}
        <div className="absolute inset-0" />

        {/* Floating coach-mark card. Kept invisible on first paint until we
            have a real measurement of its size, so the position isn't based
            on a wrong default. */}
        <motion.div
          className="absolute"
          style={{ top: 0, left: 0 }}
          initial={false}
          animate={{
            x: cardLeft,
            y: cardTop,
            opacity: cardMeasured ? 1 : 0,
          }}
          transition={{
            x: spring,
            y: spring,
            opacity: { duration: 0.2 },
          }}
        >
          <div
            ref={cardRef}
            className="w-[calc(100vw-32px)] max-w-xs overflow-hidden rounded-2xl border border-fg/12 bg-nav/95 backdrop-blur-xl shadow-[0_24px_56px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.04)_inset]"
          >
            <div className="px-5 pt-4 pb-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-fg/40">
                  Step {stepIdx + 1} of {STEPS.length}
                </span>
                <StepDots total={STEPS.length} current={stepIdx} />
              </div>

              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: 0.04 }}
                className="mt-3"
              >
                <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-fg">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-fg/60">
                  {step.body}
                </p>
              </motion.div>

              <div className="mt-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={finish}
                  className="text-[11px] font-medium text-fg/40 transition-all duration-150 hover:text-fg/75"
                >
                  Skip tour
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="rounded-full border border-accent/40 bg-accent/15 px-4 py-1.5 text-[12px] font-semibold text-accent transition-all duration-150 hover:bg-accent/25 active:scale-[0.98]"
                >
                  {isLastStep ? "Got it" : "Next"}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <span className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-1 rounded-full transition-all duration-200 ${
            i === current ? "w-4 bg-accent" : "w-1 bg-fg/20"
          }`}
        />
      ))}
    </span>
  );
}

/**
 * Checks whether the guided tour should be shown, and whether the legacy
 * `create_button` tooltip key should be cleared.
 */
export function useGuidedTour() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await setTooltipSeen(LEGACY_TOOLTIP_KEY, false);

      const seen = await hasSeenTooltip(TOUR_STORAGE_KEY);
      if (!cancelled && !seen) {
        setShouldShow(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(() => {
    setShouldShow(false);
    void setTooltipSeen(TOUR_STORAGE_KEY, true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const globalWindow = window as unknown as {
      __debug?: Record<string, unknown>;
    };
    const debug = (globalWindow.__debug = globalWindow.__debug ?? {});
    debug.resetFirstRunTour = async () => {
      await setTooltipSeen(TOUR_STORAGE_KEY, false);
      setShouldShow(false); 
      await Promise.resolve();
      setShouldShow(true);
      // eslint-disable-next-line no-console
      console.info(
        "[GuidedTour] reset. Navigate to /chat to see it (bottom nav must be visible).",
      );
    };
    return () => {
      if (debug.resetFirstRunTour) {
        delete debug.resetFirstRunTour;
      }
    };
  }, []);

  return { shouldShow, dismiss };
}
