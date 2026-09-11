import  {Footer}  from "@/features/Home/component/footer";
import  {Header}  from "@/features/Home/component/header";
import { cn } from "@/lib/utils";
import { icons } from "lucide-react";
import type { Metadata } from "next";


export const metadata: Metadata = {
    title: {
        template: "Code - Editor ",
        default: "CodeEditor",
    },
    icons: {
        icon: "/logo.svg"
    }
};

export default function HomeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <Header />
            <div
        className={cn(
          "absolute inset-0",
          "[background-size:40px_40px]",
          "[background-image:linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)]",
          "dark:[background-image:linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)]",
        )}
      />
       <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] dark:bg-black"/>
      
            <main className="z-20 relative w-full pt-0 md:pt-0  ">
          
                {children}
            </main>
            <Footer />
        </>
    );
}