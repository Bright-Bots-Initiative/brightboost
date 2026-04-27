import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SpacewarArena from "./SpacewarArena";
import BrightRallyCoopQuest from "./BrightRallyCoopQuest";
import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function PlayHub() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "pvp";
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  // Sync state if URL changes externally (e.g. navigation)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab]);

  return (
    <div className="h-full flex flex-col w-full max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-slate-800">{t("playHub.title")}</h1>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full flex-1 flex flex-col"
      >
        <TabsList className="grid w-full grid-cols-2 mb-4 max-w-md mx-auto">
          <TabsTrigger value="pvp">{t("playHub.spacewar")}</TabsTrigger>
          <TabsTrigger value="coop">{t("playHub.coopAdventure")}</TabsTrigger>
        </TabsList>

        <TabsContent value="pvp" className="flex-1 w-full">
          <SpacewarArena />
        </TabsContent>

        <TabsContent value="coop" className="flex-1 w-full">
          <BrightRallyCoopQuest />
        </TabsContent>
      </Tabs>
    </div>
  );
}
