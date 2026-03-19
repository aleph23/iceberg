import { BrowserRouter, Route, Routes, useLocation, Navigate } from "react-router-dom";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import { motion } from "framer-motion";
import { Toaster } from "sonner";

import { ThemeProvider } from "./core/theme/ThemeContext";
import { toast } from "./ui/components/toast";
import { DownloadQueueProvider } from "./core/downloads/DownloadQueueContext";

import { CreateMenu, Tooltip, useFirstTimeTooltip } from "./ui/components";
import { V1UpgradeToast } from "./ui/components/V1UpgradeToast";
import { V2UpgradeToast } from "./ui/components/V2UpgradeToast";
import { ConfirmBottomMenuHost } from "./ui/components/ConfirmBottomMenu";
import { isOnboardingCompleted } from "./core/storage/appState";
import { TopNav, BottomNav } from "./ui/components/App";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen, UnlistenFn } from "@tauri-apps/api/event";
import { useAndroidBackHandler } from "./ui/hooks/useAndroidBackHandler";
import { logManager, isLoggingEnabled } from "./core/utils/logger";
import { getPlatform } from "./core/utils/platform";
import { I18nProvider } from "./core/i18n/context";

const chatLog = logManager({ component: "Chat" });

function lazyNamed<TModule extends Record<string, unknown>, TKey extends keyof TModule>(
  loader: () => Promise<TModule>,
  key: TKey,
) {
  return lazy(async () => {
    const module = await loader();
    return { default: module[key] as ComponentType };
  });
}

const WelcomePage = lazyNamed(() => import("./ui/pages/onboarding/Welcome"), "WelcomePage");
const OnboardingPage = lazyNamed(
  () => import("./ui/pages/onboarding/OnboardingPage"),
  "OnboardingPage",
);
const WhereToFindPage = lazyNamed(
  () => import("./ui/pages/onboarding/WhereToFind"),
  "WhereToFindPage",
);
const SearchPage = lazyNamed(() => import("./ui/pages/search/SearchPage"), "SearchPage");
const DiscoveryPage = lazyNamed(
  () => import("./ui/pages/discovery/DiscoveryPage"),
  "DiscoveryPage",
);
const DiscoverySearchPage = lazyNamed(
  () => import("./ui/pages/discovery/DiscoverySearchPage"),
  "DiscoverySearchPage",
);
const DiscoveryBrowsePage = lazyNamed(
  () => import("./ui/pages/discovery/DiscoveryBrowsePage"),
  "DiscoveryBrowsePage",
);
const DiscoveryCardDetailPage = lazyNamed(
  () => import("./ui/pages/discovery/DiscoveryCardDetailPage"),
  "DiscoveryCardDetailPage",
);
const LibraryPage = lazyNamed(() => import("./ui/pages/library/LibraryPage"), "LibraryPage");
const StandaloneLorebookEditor = lazyNamed(
  () => import("./ui/pages/library/StandaloneLorebookEditor"),
  "StandaloneLorebookEditor",
);
const SettingsPage = lazyNamed(() => import("./ui/pages/settings/Settings"), "SettingsPage");
const ProvidersPage = lazyNamed(() => import("./ui/pages/settings/ProvidersPage"), "ProvidersPage");
const ModelsPage = lazyNamed(() => import("./ui/pages/settings/ModelsPage"), "ModelsPage");
const EditModelPage = lazyNamed(() => import("./ui/pages/settings/EditModelPage"), "EditModelPage");
const HuggingFaceBrowserPage = lazyNamed(
  () => import("./ui/pages/settings/HuggingFaceBrowserPage"),
  "HuggingFaceBrowserPage",
);
const VoicesPage = lazyNamed(() => import("./ui/pages/settings/VoicesPage"), "VoicesPage");
const ImageGenerationPage = lazyNamed(
  () => import("./ui/pages/settings/ImageGenerationPage"),
  "ImageGenerationPage",
);
const SystemPromptsPage = lazyNamed(
  () => import("./ui/pages/settings/SystemPromptsPage"),
  "SystemPromptsPage",
);
const EditPromptTemplate = lazyNamed(
  () => import("./ui/pages/settings/EditPromptTemplate"),
  "EditPromptTemplate",
);
const SecurityPage = lazyNamed(() => import("./ui/pages/settings/SecurityPage"), "SecurityPage");
const UsagePage = lazyNamed(() => import("./ui/pages/settings/UsagePage"), "UsagePage");
const UsageActivityPage = lazyNamed(
  () => import("./ui/pages/settings/UsageActivityPage"),
  "UsageActivityPage",
);
const AccessibilityPage = lazyNamed(
  () => import("./ui/pages/settings/AccessibilityPage"),
  "AccessibilityPage",
);
const ColorCustomizationPage = lazyNamed(
  () => import("./ui/pages/settings/ColorCustomizationPage"),
  "ColorCustomizationPage",
);
const ChatAppearancePage = lazyNamed(
  () => import("./ui/pages/settings/ChatAppearancePage"),
  "ChatAppearancePage",
);
const LogsPage = lazyNamed(() => import("./ui/pages/settings/LogsPage"), "LogsPage");
const AdvancedPage = lazyNamed(() => import("./ui/pages/settings/AdvancedPage"), "AdvancedPage");
const DynamicMemoryPage = lazyNamed(
  () => import("./ui/pages/settings/DynamicMemoryPage"),
  "DynamicMemoryPage",
);
const AICreationHelperPage = lazyNamed(
  () => import("./ui/pages/settings/CreationHelperPage"),
  "CreationHelperPage",
);
const HelpMeReplyPage = lazyNamed(
  () => import("./ui/pages/settings/HelpMeReplyPage"),
  "HelpMeReplyPage",
);
const EmbeddingDownloadPage = lazyNamed(
  () => import("./ui/pages/settings/EmbeddingDownloadPage"),
  "EmbeddingDownloadPage",
);
const EmbeddingTestPage = lazyNamed(
  () => import("./ui/pages/settings/EmbeddingTestPage"),
  "EmbeddingTestPage",
);
const ChangelogPage = lazyNamed(() => import("./ui/pages/settings/ChangelogPage"), "ChangelogPage");
const DeveloperPage = lazyNamed(() => import("./ui/pages/settings/DeveloperPage"), "DeveloperPage");
const ResetPage = lazyNamed(() => import("./ui/pages/settings/ResetPage"), "ResetPage");
const BackupRestorePage = lazyNamed(
  () => import("./ui/pages/settings/BackupRestorePage"),
  "BackupRestorePage",
);
const ConvertPage = lazyNamed(() => import("./ui/pages/settings/ConvertPage"), "ConvertPage");
const SyncPage = lazyNamed(() => import("./ui/pages/sync/SyncPage"), "SyncPage");
const EngineHomePage = lazyNamed(
  () => import("./ui/pages/engine/EngineHomePage"),
  "EngineHomePage",
);
const EngineSetupWizard = lazyNamed(
  () => import("./ui/pages/engine/EngineSetupWizard"),
  "EngineSetupWizard",
);
const EngineProvidersConfigPage = lazyNamed(
  () => import("./ui/pages/engine/EngineProvidersConfigPage"),
  "EngineProvidersConfigPage",
);
const EngineSettingsConfigPage = lazyNamed(
  () => import("./ui/pages/engine/EngineSettingsConfigPage"),
  "EngineSettingsConfigPage",
);
const EngineCharacterCreate = lazyNamed(
  () => import("./ui/pages/engine/EngineCharacterCreate"),
  "EngineCharacterCreate",
);
const EngineChatPage = lazyNamed(
  () => import("./ui/pages/engine/EngineChatPage"),
  "EngineChatPage",
);
const ChatPage = lazyNamed(() => import("./ui/pages/chats/Chats"), "ChatPage");
const ChatLayout = lazyNamed(() => import("./ui/pages/chats/ChatLayout"), "ChatLayout");
const ChatConversationPage = lazyNamed(
  () => import("./ui/pages/chats/Chat"),
  "ChatConversationPage",
);
const ChatSettingsPage = lazyNamed(
  () => import("./ui/pages/chats/ChatSettings"),
  "ChatSettingsPage",
);
const SearchMessagesPage = lazyNamed(
  () => import("./ui/pages/chats/SearchMessagesPage"),
  "SearchMessagesPage",
);
const ChatHistoryPage = lazyNamed(() => import("./ui/pages/chats/ChatHistory"), "ChatHistoryPage");
const ChatMemoriesPage = lazyNamed(
  () => import("./ui/pages/chats/ChatMemories"),
  "ChatMemoriesPage",
);
const CreateCharacterPage = lazyNamed(
  () => import("./ui/pages/characters/CreateCharacter"),
  "CreateCharacterPage",
);
const CreationHelperPage = lazyNamed(
  () => import("./ui/pages/characters/CreationHelperPage"),
  "CreationHelperPage",
);
const CharactersPage = lazyNamed(
  () => import("./ui/pages/settings/CharactersPage"),
  "CharactersPage",
);
const EditCharacterPage = lazyNamed(
  () => import("./ui/pages/characters/EditCharacter"),
  "EditCharacterPage",
);
const LorebookEditor = lazyNamed(
  () => import("./ui/pages/characters/LorebookEditor"),
  "LorebookEditor",
);
const ChatTemplateListPage = lazy(() => import("./ui/pages/characters/ChatTemplateListPage"));
const ChatTemplateEditorPage = lazy(() => import("./ui/pages/characters/ChatTemplateEditorPage"));
const CreatePersonaPage = lazyNamed(
  () => import("./ui/pages/personas/CreatePersona"),
  "CreatePersonaPage",
);
const PersonasPage = lazyNamed(() => import("./ui/pages/settings/PersonasPage"), "PersonasPage");
const EditPersonaPage = lazyNamed(
  () => import("./ui/pages/personas/EditPersona"),
  "EditPersonaPage",
);
const GroupChatsListPage = lazyNamed(
  () => import("./ui/pages/group-chats/GroupChatsListPage"),
  "GroupChatsListPage",
);
const GroupChatHistoryPage = lazyNamed(
  () => import("./ui/pages/group-chats/GroupChatHistoryPage"),
  "GroupChatHistoryPage",
);
const GroupChatCreatePage = lazyNamed(
  () => import("./ui/pages/group-chats/GroupChatCreatePage"),
  "GroupChatCreatePage",
);
const GroupSettingsPage = lazyNamed(
  () => import("./ui/pages/group-chats/GroupSettingsPage"),
  "GroupSettingsPage",
);
const GroupChatLayout = lazyNamed(
  () => import("./ui/pages/group-chats/GroupChatLayout"),
  "GroupChatLayout",
);
const GroupChatPage = lazyNamed(
  () => import("./ui/pages/group-chats/GroupChatPage"),
  "GroupChatPage",
);
const GroupChatSettingsPage = lazyNamed(
  () => import("./ui/pages/group-chats/GroupChatSettingsPage"),
  "GroupChatSettingsPage",
);
const GroupChatMemoriesPage = lazyNamed(
  () => import("./ui/pages/group-chats/GroupChatMemoriesPage"),
  "GroupChatMemoriesPage",
);

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 text-sm text-fg/55">
      Loading...
    </div>
  );
}

function App() {
  const platform = useMemo(() => getPlatform(), []);

  useEffect(() => {
    if (typeof document === "undefined" || platform.os !== "linux") return;

    const styleId = "linux-color-scheme-dark";
    let style = document.getElementById(styleId) as HTMLStyleElement | null;

    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      style.textContent = ":root { color-scheme: dark; }";
      document.head.appendChild(style);
    }

    return () => {
      style?.remove();
    };
  }, [platform.os]);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;
    (async () => {
      try {
        unlisten = await listen("chat://debug", (event) => {
          if (
            typeof event.payload === "object" &&
            event.payload !== null &&
            "state" in event.payload
          ) {
            const { state, level, payload, message } = event.payload as {
              state: string;
              level?: string;
              payload?: unknown;
              message?: string;
            };

            // Backend logs come pre-formatted with timestamp
            if (message !== undefined) {
              if (isLoggingEnabled()) {
                const method = level?.toLowerCase() || "log";
                if (method in console) {
                  (console as any)[method](message);
                } else {
                  console.log(message);
                }
              }
            } else if (payload !== undefined) {
              chatLog.with({ fn: state }).log(payload);
            } else {
              chatLog.with({ fn: state }).log(event.payload);
            }
          } else {
            chatLog.warn("unknown event payload", event.payload);
          }
        });
      } catch (err) {
        console.error("Failed to attach debug listener:", err);
      }
    })();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;
    (async () => {
      try {
        unlisten = await listen("app://gpu-fallback-prompt", () => {
          toast.warning(
            "GPU memory insufficient",
            "This model doesn't fit in GPU memory. Switch to CPU (slower) or abort?",
            {
              actionLabel: "Switch to CPU",
              onAction: () => emit("app://gpu-fallback-response", "switch"),
              secondaryLabel: "Abort",
              onSecondary: () => emit("app://gpu-fallback-response", "abort"),
              id: "gpu-fallback",
              duration: Infinity,
            },
          );
        });
      } catch (err) {
        console.error("Failed to attach gpu-fallback listener:", err);
      }
    })();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;
    (async () => {
      try {
        unlisten = await listen("app://toast", (event) => {
          const payload = event.payload as Record<string, unknown> | null;
          if (!payload || typeof payload !== "object") {
            return;
          }
          const variant = payload.variant;
          const title = payload.title;
          const description = payload.description;
          if (typeof title !== "string") {
            return;
          }
          const detail = typeof description === "string" ? description : undefined;
          switch (variant) {
            case "success":
              toast.success(title, detail);
              break;
            case "warning":
              toast.warning(title, detail);
              break;
            case "error":
              toast.error(title, detail);
              break;
            default:
              toast.info(title, detail);
          }
        });
      } catch (err) {
        console.error("Failed to attach toast listener:", err);
      }
    })();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  return (
    <I18nProvider>
      <ThemeProvider>
        <BrowserRouter>
          <div id="app-root" className="min-h-screen bg-surface text-fg antialiased">
            <Toaster
              position={"top-center"}
              offset={{ top: 16 }}
              mobileOffset={{
                top: "calc(env(safe-area-inset-top) + 80px)",
                left: 8,
                right: 8,
              }}
              toastOptions={{
                unstyled: true,
                className: "pointer-events-auto w-full max-w-md",
                descriptionClassName: "text-xs text-fg/70",
              }}
            />
            <ConfirmBottomMenuHost />
            <DownloadQueueProvider>
              <AppContent />
            </DownloadQueueProvider>
          </div>
        </BrowserRouter>
      </ThemeProvider>
    </I18nProvider>
  );
}

function AppContent() {
  const location = useLocation();
  console.log("AppContent render:", location.pathname, location.key);
  const mainRef = useRef<HTMLDivElement | null>(null);
  const platform = useMemo(() => getPlatform(), []);
  const isChatRoute = location.pathname === "/chat" || location.pathname === "/";
  // Group chat detail: /group-chats/:id, /group-chats/:id/settings, /group-chats/new (NOT /group-chats list)
  const isGroupChatDetailRoute = location.pathname.startsWith("/group-chats/");
  const isEngineChatRoute = location.pathname.startsWith("/engine-chat/");
  const isChatDetailRoute =
    location.pathname.startsWith("/chat/") || isGroupChatDetailRoute || isEngineChatRoute;
  const isSearchRoute = location.pathname === "/search";
  const isOnboardingRoute = useMemo(
    () =>
      location.pathname.startsWith("/welcome") ||
      location.pathname.startsWith("/onboarding") ||
      location.pathname.startsWith("/wheretofind"),
    [location.pathname],
  );
  const isDiscoveryRoute = useMemo(
    () => location.pathname.startsWith("/discover"),
    [location.pathname],
  );
  const isCreateRoute = useMemo(
    () => location.pathname.startsWith("/create/"),
    [location.pathname],
  );

  const isSettingRoute = useMemo(
    () => location.pathname.startsWith("/settings"),
    [location.pathname],
  );
  const shouldAnimatePage = !location.pathname.startsWith("/settings/providers");

  const isLorebookEditorRoute = useMemo(
    () => location.pathname.startsWith("/library/lorebooks/"),
    [location.pathname],
  );
  const isTemplateEditorRoute = useMemo(
    () => /^\/settings\/characters\/[^/]+\/templates\/[^/]+$/.test(location.pathname),
    [location.pathname],
  );

  const showTopNav =
    !isOnboardingRoute &&
    !isChatDetailRoute &&
    !isCreateRoute &&
    !isSearchRoute &&
    !isLorebookEditorRoute &&
    !isDiscoveryRoute;
  const showBottomNav =
    !isSettingRoute &&
    !isOnboardingRoute &&
    !isChatDetailRoute &&
    !isCreateRoute &&
    !isSearchRoute &&
    !isLorebookEditorRoute &&
    !isDiscoveryRoute;

  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const { isVisible: showCreateTooltip, dismissTooltip: dismissCreateTooltip } =
    useFirstTimeTooltip("create_button");
  const [showDelayedTooltip, setShowDelayedTooltip] = useState(false);

  const handleAndroidBack = useCallback(() => {
    const globalWindow = window as any;
    if (globalWindow.__unsavedChanges) {
      toast.warningSticky(
        "Unsaved changes",
        "Save or discard your changes before leaving.",
        "Discard",
        () => {
          window.dispatchEvent(new CustomEvent("unsaved:discard"));
        },
        "unsaved-changes",
      );
      return false;
    }
    return true;
  }, []);

  useAndroidBackHandler({ canLeave: handleAndroidBack });

  useEffect(() => {
    if (isOnboardingRoute || isCreateRoute) {
      setShowCreateMenu(false);
    }
  }, [isOnboardingRoute, isCreateRoute]);

  useEffect(() => {
    if (platform.os !== "android") return;
    invoke("android_monitor_set_route", {
      route: location.pathname + location.search,
    }).catch(() => {
      // Ignore monitor update failures; Android monitor is best-effort metadata.
    });
  }, [location.pathname, location.search, platform.os]);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const firstTime = urlParams.get("firstTime");

    if (firstTime === "true" && isChatRoute) {
      window.history.replaceState({}, document.title, location.pathname);

      const timer = window.setTimeout(() => {
        setShowDelayedTooltip(true);
      }, 2000);

      return () => {
        window.clearTimeout(timer);
        setShowDelayedTooltip(false);
      };
    } else {
      setShowDelayedTooltip(false);
    }
  }, [location.search, location.pathname, isChatRoute]);

  useEffect(() => {
    if (!location.pathname.startsWith("/settings")) return;

    const id = window.setTimeout(() => {
      const main = mainRef.current;
      if (main) {
        main.scrollTop = 0;

        const inner = main.querySelector(
          "[data-settings-scroll], .settings-scroll",
        ) as HTMLElement | null;
        if (inner) {
          inner.scrollTop = 0;
        }
      }

      window.scrollTo(0, 0);
    }, 0);

    return () => window.clearTimeout(id);
  }, [location.pathname]);

  const isDesktop = useMemo(() => {
    const platform = getPlatform();
    return platform.type === "desktop";
  }, []);

  const [glitchStage, setGlitchStage] = useState<0 | 1 | 2 | 3>(0);
  const glitchStageRef = useRef<0 | 1 | 2 | 3>(0);
  const shakeCooldownRef = useRef(0);
  const lastShakeRef = useRef(0);
  const glitchTimeoutRef = useRef<number | null>(null);
  const [glitchEnabled, setGlitchEnabled] = useState(true);
  const [voidActive, setVoidActive] = useState(false);
  const [voidTextIndex, setVoidTextIndex] = useState(0);
  const [showRestore, setShowRestore] = useState(false);
  const [voidStartAt, setVoidStartAt] = useState(0);
  const [voidReady, setVoidReady] = useState(false);
  const voidMessage = "congrats, you destablised the app. enjoy emptiness";

  useEffect(() => {
    glitchStageRef.current = glitchStage;
  }, [glitchStage]);

  useEffect(() => {
    const key = "lettuce.easterEggs.glitch";
    const applyStored = (value: string | null | undefined) => {
      if (value === null || value === undefined) return;
      setGlitchEnabled(value === "true");
    };
    const syncFromStorage = () => {
      try {
        applyStored(localStorage.getItem(key));
      } catch {
        setGlitchEnabled(true);
      }
    };
    syncFromStorage();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === key) {
        applyStored(event.newValue);
      }
    };
    const handleToggleEvent = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail;
      if (typeof detail === "boolean") {
        setGlitchEnabled(detail);
      } else {
        syncFromStorage();
      }
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("lettuce:easterEggs:glitch", handleToggleEvent);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("lettuce:easterEggs:glitch", handleToggleEvent);
    };
  }, []);

  useEffect(() => {
    const platform = getPlatform();
    if (platform.type !== "mobile" || !glitchEnabled) return;

    let mounted = true;
    const threshold = 18;
    const cooldownMs = 4000;
    const stageCooldownMs = 1000;

    const handleMotion = (event: DeviceMotionEvent) => {
      if (!mounted) return;
      const accel = event.accelerationIncludingGravity;
      if (!accel) return;
      const x = accel.x ?? 0;
      const y = accel.y ?? 0;
      const z = accel.z ?? 0;
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();

      if (magnitude > threshold) {
        const canTrigger = now - shakeCooldownRef.current > cooldownMs;
        if (!canTrigger && glitchStageRef.current === 3) return;

        if (now - lastShakeRef.current < stageCooldownMs) {
          return;
        }
        lastShakeRef.current = now;

        const currentStage = glitchStageRef.current;
        const nextStage = currentStage === 0 ? 2 : ((currentStage + 1) as 1 | 2 | 3);

        setGlitchStage(nextStage);
        glitchStageRef.current = nextStage;

        if (glitchTimeoutRef.current) {
          window.clearTimeout(glitchTimeoutRef.current);
          glitchTimeoutRef.current = null;
        }

        const durationMs = nextStage === 1 ? 1200 : nextStage === 2 ? 1500 : 1800;
        if (nextStage !== 3) {
          glitchTimeoutRef.current = window.setTimeout(() => {
            setGlitchStage(0);
          }, durationMs);
        }

        if (nextStage === 2) {
          toast.warning("Reality fracture detected.");
        } else if (nextStage === 3) {
          shakeCooldownRef.current = now;
          toast.info("Reality resynced.");
          setVoidActive(true);
          setVoidTextIndex(0);
          setShowRestore(false);
          setVoidStartAt(Date.now());
          setVoidReady(false);
        }
      }
    };

    window.addEventListener("devicemotion", handleMotion);
    return () => {
      mounted = false;
      window.removeEventListener("devicemotion", handleMotion);
      if (glitchTimeoutRef.current) {
        window.clearTimeout(glitchTimeoutRef.current);
        glitchTimeoutRef.current = null;
      }
    };
  }, [glitchEnabled]);

  useEffect(() => {
    if (glitchEnabled) return;
    setGlitchStage(0);
    glitchStageRef.current = 0;
    setVoidActive(false);
    setShowRestore(false);
  }, [glitchEnabled]);

  useEffect(() => {
    if (!voidActive) return;
    const now = Date.now();
    const delayMs = 3000;
    if (now - voidStartAt < delayMs) {
      const timer = window.setTimeout(
        () => {
          setVoidReady(true);
        },
        delayMs - (now - voidStartAt),
      );
      return () => window.clearTimeout(timer);
    }
    if (!voidReady) {
      setVoidReady(true);
      return;
    }
    if (voidTextIndex >= voidMessage.length) {
      const timer = window.setTimeout(() => setShowRestore(true), 1200);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      setVoidTextIndex((prev) => Math.min(voidMessage.length, prev + 1));
    }, 45);
    return () => window.clearTimeout(timer);
  }, [voidActive, voidStartAt, voidReady, voidTextIndex, voidMessage.length]);

  return (
    <div
      className={`relative min-h-screen overflow-hidden ${
        glitchStage ? `app-glitch app-glitch-${glitchStage}` : ""
      }`}
    >
      <div
        className={`relative z-10 mx-auto flex min-h-screen w-full ${
          isChatDetailRoute ? "max-w-full" : "max-w-md lg:max-w-none"
        } flex-col ${showBottomNav ? "pb-[calc(72px+env(safe-area-inset-bottom))]" : "pb-0"}`}
      >
        {showTopNav && <TopNav currentPath={location.pathname + location.search} />}

        <main
          ref={mainRef}
          className={`app-fall-target flex-1 ${showTopNav ? "pt-[calc(72px+env(safe-area-inset-top))]" : ""} ${
            isOnboardingRoute
              ? `overflow-y-auto ${isDesktop ? "" : "px-0 pt-5 pb-5"}`
              : isChatDetailRoute
                ? "overflow-hidden px-0 pt-0 pb-0"
                : isCreateRoute
                  ? "overflow-hidden px-0 pt-0 pb-0"
                  : isSearchRoute
                    ? "overflow-hidden px-0 pt-0 pb-0"
                    : isLorebookEditorRoute
                      ? "overflow-hidden px-0 pt-0 pb-0"
                      : isTemplateEditorRoute
                        ? "overflow-hidden px-0 pt-0 pb-0"
                        : isDiscoveryRoute
                          ? "overflow-hidden px-0 pt-0 pb-0"
                          : `overflow-y-auto px-4 pt-4 ${showBottomNav ? "pb-[calc(96px+env(safe-area-inset-bottom))]" : "pb-6"}`
          }`}
        >
          {voidActive && (
            <div className="void-overlay pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <div className="pointer-events-auto max-w-xs px-6 py-5 text-center">
                <p className="text-sm text-fg/70">
                  {voidMessage.slice(0, voidTextIndex)}
                  <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-fg/40 align-middle" />
                </p>
                {showRestore && (
                  <button
                    onClick={() => {
                      setVoidActive(false);
                      setShowRestore(false);
                      setGlitchStage(0);
                      glitchStageRef.current = 0;
                      if (glitchTimeoutRef.current) {
                        window.clearTimeout(glitchTimeoutRef.current);
                        glitchTimeoutRef.current = null;
                      }
                    }}
                    className="mt-4 rounded-full border border-fg/20 bg-fg/10 px-4 py-2 text-xs font-semibold text-fg hover:border-fg/40 hover:bg-fg/15"
                  >
                    Restore
                  </button>
                )}
              </div>
            </div>
          )}
          <motion.div
            key={(() => {
              if (location.pathname.startsWith("/settings")) return location.pathname;
              const chatMatch = location.pathname.match(/^\/chat\/([^/]+)/);
              if (chatMatch) return `/chat/${chatMatch[1]}`;
              const groupMatch = location.pathname.match(/^\/group-chats\/([^/]+)/);
              if (groupMatch) return `/group-chats/${groupMatch[1]}`;
              return location.key;
            })()}
            initial={shouldAnimatePage ? { opacity: 0, y: 16 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldAnimatePage ? { opacity: 0, y: -16 } : { opacity: 1, y: 0 }}
            transition={shouldAnimatePage ? { duration: 0.2, ease: "easeOut" } : { duration: 0 }}
            className={
              location.pathname.startsWith("/settings")
                ? "h-full app-text-scope settings-theme-scope"
                : "h-full app-text-scope"
            }
          >
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                <Route path="/" element={<OnboardingCheck />} />
                <Route path="/welcome" element={<WelcomePage />} />
                <Route path="/onboarding/provider" element={<OnboardingPage />} />
                <Route path="/onboarding/models" element={<OnboardingPage />} />
                <Route path="/onboarding/memory" element={<OnboardingPage />} />
                <Route path="/wheretofind" element={<WhereToFindPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/discover" element={<DiscoveryPage />} />
                <Route path="/discover/search" element={<DiscoverySearchPage />} />
                <Route path="/discover/browse" element={<DiscoveryBrowsePage />} />
                <Route path="/discover/card/:path" element={<DiscoveryCardDetailPage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route
                  path="/library/lorebooks/:lorebookId"
                  element={<StandaloneLorebookEditor />}
                />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/settings/providers" element={<ProvidersPage />} />
                <Route path="/settings/models" element={<ModelsPage />} />
                <Route path="/settings/models/new" element={<EditModelPage />} />
                <Route path="/settings/models/browse" element={<HuggingFaceBrowserPage />} />
                <Route path="/settings/models/:modelId" element={<EditModelPage />} />
                <Route path="/settings/voices" element={<VoicesPage />} />
                <Route path="/settings/image-generation" element={<ImageGenerationPage />} />
                <Route path="/settings/prompts" element={<SystemPromptsPage />} />
                <Route path="/settings/prompts/new" element={<EditPromptTemplate />} />
                <Route path="/settings/prompts/:id" element={<EditPromptTemplate />} />
                <Route path="/settings/security" element={<SecurityPage />} />
                <Route path="/settings/usage" element={<UsagePage />} />
                <Route path="/settings/usage/activity" element={<UsageActivityPage />} />
                <Route path="/settings/accessibility" element={<AccessibilityPage />} />
                <Route path="/settings/accessibility/colors" element={<ColorCustomizationPage />} />
                <Route path="/settings/accessibility/chat" element={<ChatAppearancePage />} />
                <Route path="/settings/logs" element={<LogsPage />} />
                <Route path="/settings/advanced" element={<AdvancedPage />} />
                <Route path="/settings/advanced/memory" element={<DynamicMemoryPage />} />
                <Route
                  path="/settings/advanced/creation-helper"
                  element={<AICreationHelperPage />}
                />
                <Route path="/settings/advanced/help-me-reply" element={<HelpMeReplyPage />} />
                <Route path="/settings/embedding-download" element={<EmbeddingDownloadPage />} />
                <Route path="/settings/embedding-test" element={<EmbeddingTestPage />} />
                <Route path="/settings/changelog" element={<ChangelogPage />} />
                <Route path="/settings/developer" element={<DeveloperPage />} />
                <Route path="/settings/reset" element={<ResetPage />} />
                <Route path="/settings/backup" element={<BackupRestorePage />} />
                <Route path="/settings/convert" element={<ConvertPage />} />
                <Route path="/settings/sync" element={<SyncPage />} />
                <Route path="/settings/engine/:credentialId" element={<EngineHomePage />} />
                <Route
                  path="/settings/engine/:credentialId/setup"
                  element={<EngineSetupWizard />}
                />
                <Route
                  path="/settings/engine/:credentialId/providers"
                  element={<EngineProvidersConfigPage />}
                />
                <Route
                  path="/settings/engine/:credentialId/settings"
                  element={<EngineSettingsConfigPage />}
                />
                <Route
                  path="/settings/engine/:credentialId/character/new"
                  element={<EngineCharacterCreate />}
                />
                <Route path="/engine-chat/:credentialId/:slug" element={<EngineChatPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/chat/:characterId" element={<ChatLayout />}>
                  <Route index element={<ChatConversationPage />} />
                  <Route path="settings" element={<ChatSettingsPage />} />
                </Route>
                <Route path="/chat/:characterId/search" element={<SearchMessagesPage />} />
                <Route path="/chat/:characterId/history" element={<ChatHistoryPage />} />
                <Route path="/chat/:characterId/memories" element={<ChatMemoriesPage />} />
                <Route path="/create/character" element={<CreateCharacterPage />} />
                <Route path="/create/character/helper" element={<CreationHelperPage />} />
                <Route path="/settings/characters" element={<CharactersPage />} />
                <Route
                  path="/settings/characters/:characterId/edit"
                  element={<EditCharacterPage />}
                />
                <Route
                  path="/settings/characters/:characterId/lorebook"
                  element={<LorebookEditor />}
                />
                <Route path="/group-chats/groups/:groupId/lorebook" element={<LorebookEditor />} />
                <Route
                  path="/settings/characters/:characterId/templates"
                  element={<ChatTemplateListPage />}
                />
                <Route
                  path="/settings/characters/:characterId/templates/:templateId"
                  element={<ChatTemplateEditorPage />}
                />
                <Route path="/create/persona" element={<CreatePersonaPage />} />
                <Route path="/personas" element={<PersonasPage />} />
                <Route path="/settings/personas" element={<PersonasPage />} />
                <Route path="/settings/personas/:personaId/edit" element={<EditPersonaPage />} />
                <Route path="/group-chats" element={<GroupChatsListPage />} />
                <Route path="/group-chats/history" element={<GroupChatHistoryPage />} />
                <Route path="/group-chats/new" element={<GroupChatCreatePage />} />
                <Route
                  path="/group-chats/groups/:groupId/settings"
                  element={<GroupSettingsPage />}
                />
                <Route path="/group-chats/:groupSessionId" element={<GroupChatLayout />}>
                  <Route index element={<GroupChatPage />} />
                  <Route path="settings" element={<GroupChatSettingsPage />} />
                  <Route path="lorebook" element={<LorebookEditor />} />
                  <Route path="memories" element={<GroupChatMemoriesPage />} />
                </Route>
              </Routes>
            </Suspense>
          </motion.div>
        </main>

        {showBottomNav && <BottomNav onCreateClick={() => setShowCreateMenu(true)} />}
      </div>

      {showBottomNav && (
        <CreateMenu isOpen={showCreateMenu} onClose={() => setShowCreateMenu(false)} />
      )}

      {isChatRoute && showBottomNav && (showDelayedTooltip || showCreateTooltip) && (
        <Tooltip
          isVisible={true}
          message="Create custom AI characters and personas here!"
          onClose={() => {
            dismissCreateTooltip();
            setShowDelayedTooltip(false);
          }}
          position="bottom"
          className="bottom-22 right-4"
        />
      )}

      {/* V1 Embedding Model Upgrade Toast */}
      <V1UpgradeToast />
      {/* V2 Embedding Model Upgrade Toast */}
      <V2UpgradeToast />
    </div>
  );
}

function OnboardingCheck() {
  const [isChecking, setIsChecking] = useState(true);
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkOnboarding = async () => {
      const onboardingCompleted = await isOnboardingCompleted();
      if (cancelled) return;
      if (!onboardingCompleted) {
        setShouldShowOnboarding(true);
      }
      setIsChecking(false);
    };

    checkOnboarding();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isChecking) {
    return (
      <div className="flex h-full items-center justify-center rounded-3xl border border-fg/5 bg-fg/5 backdrop-blur-sm">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-fg/10 border-t-fg/60" />
      </div>
    );
  }

  if (shouldShowOnboarding) {
    return <Navigate to="/welcome" replace />;
  }

  return <ChatPage />;
}

export default App;
