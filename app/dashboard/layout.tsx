import { SidebarProvider } from "@/components/ui/sidebar";
import {DashboardSidebar} from "@/features/dashboard/actions/components/dashboard-sidebar";
import React from "react";
import {getPlaygroundForUser} from "@/features/dashboard/actions";

export default async function DashboardLayout({
        children,
}:{
        children:React.ReactNode;
}){
    const playgroundData = await getPlaygroundForUser();

    const  technologyIconMap:Record<string , string>={
        REACT: "Zap",
        NEXTJS: "Lightbulb",
        EXPRESS: "Database",
        VUE: "Compass",
        HONO: "FlameIcon",
        ANGULAR: "Terminal",
        JAVA:"Coffee",
        CPP:"Code2"
    }

    const formattedPlaygroundData = playgroundData?.map((playground) => ({
      id: playground.id,
      name: playground.title ?? "utitled",
      starred: playground.Starmark?.[0]?.isMarked || false,
      icon: technologyIconMap[playground.template] || "Code2", 
    })) || []

    return(
        <SidebarProvider>
        <div className="flex min-h-screen w-full overflow-x-hidden">
            <DashboardSidebar initialPlaygroundData={formattedPlaygroundData}/>
            <main className="flex-1">{children}</main>
        </div>
        </SidebarProvider>
);
}
