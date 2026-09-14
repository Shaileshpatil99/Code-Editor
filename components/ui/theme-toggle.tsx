"use client";
import {useTheme} from "next-themes";
import { useEffect,useState } from "react";
import {Moon,Sun} from "lucide-react";

import { Button } from "@/components/ui/button";

export function ThemeToggle(){
    const { resolvedTheme, setTheme } = useTheme();

    const [mounted, setMounted] = useState(false);

    useEffect(()=> { queueMicrotask(() => setMounted(true)); } , []);

    if (!mounted) return <Button variant="ghost" size="icon" disabled><Sun className="h-5 w-5" /></Button>;

    return(
        <div className="cursor-pointer" onClick={() => setTheme(resolvedTheme === "dark" ? "light" :"dark")}>
{
    resolvedTheme === "light" ? (<Moon className="size-5 text-black"/>) : (<Sun className="size-5 text-white"/>)
}
        </div>
    )
}