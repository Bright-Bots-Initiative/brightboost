import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Arena from "./Arena";
import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";

export default function PlayHub() {
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
        <h1 className="text-2xl font-bold mb-4 text-slate-800">Play Hub</h1>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mb-4 max-w-md mx-auto">
                <TabsTrigger value="pvp">PvP Arena</TabsTrigger>
                <TabsTrigger value="coop">Co-op Adventure</TabsTrigger>
            </TabsList>

            <TabsContent value="pvp" className="flex-1 w-full">
                <Arena />
            </TabsContent>

            <TabsContent value="coop" className="flex-1 flex items-center justify-center bg-white rounded-xl border-2 border-dashed border-slate-200 min-h-[50vh]">
                <div className="text-center p-8">
                    <span className="text-4xl block mb-2">🤝</span>
                    <h3 className="text-xl font-bold text-slate-700">Co-op Mode</h3>
                    <p className="text-slate-500">Team up with friends! Coming soon.</p>
                </div>
            </TabsContent>
        </Tabs>
    </div>
  );
}
