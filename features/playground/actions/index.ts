"use server";
import { currentUser } from "@/features/auth/action";
import { db } from "@/lib/db";
import { TemplateFolder } from "../lib/path-to-json";
import { revalidatePath } from "next/cache";

export const getPlaygroundById = async (id:string)=>{
    try {
        const playground = await db.playground.findUnique({
            where:{id},
            select:{
                title:true,
                description:true,
                template:true,
                templateFiles:{
                    select:{
                        content:true
                    }
                }
            }
        });
        return playground;
    } catch (error) {
        console.error(error);
    }
}

export const SaveUpdatedCode = async(playgroundId:string, data:TemplateFolder)=>{
    const user = await currentUser();
    if(!user) return null;
     
    try {
        const updatePlayground = await db.templateFiles.upsert({
            where:{
                playgroundId
            },
            update:{
                content:JSON.stringify(data)
            },
            create:{
                playgroundId,
                content:JSON.stringify(data)
            }
        });
    } catch (error) {
        console.error("Error in SaveUpdatedCode:", error);
    }
};

export const updatePlaygroundTemplate = async (
  playgroundId: string,
  newTemplate: import("@/lib/generated/prisma").Templates
) => {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    await db.playground.update({
      where: { id: playgroundId },
      data: { template: newTemplate },
    });
    revalidatePath(`/playground/${playgroundId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update playground template:", error);
    return { success: false, error: error?.message || "Failed to update template" };
  }
};
