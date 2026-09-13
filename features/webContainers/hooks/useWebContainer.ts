import {useState, useEffect, useCallback} from "react";
import {WebContainer} from "@webcontainer/api";
import {TemplateFolder} from "@/features/playground/lib/path-to-json";

interface UseWebContainerProps{
        templateData:TemplateFolder;
}       
interface UseWebConatinerReturn{
    serverUrl:string | null;
    isLoading: boolean;
    error:string | null;
    instance: WebContainer | null;
    writeFileSync:(path:string, content:string)=>Promise<void>;
    destroy:()=>void;
}
