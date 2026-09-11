"use server";

import { currentUser } from "@/features/auth/action";
import { db } from "@/lib/db";
import { Templates } from "@/lib/generated/prisma";
import { revalidatePath } from "next/cache";

export const createPlayground = async (data: {
  title: string;
  template: Templates;
  description?: string;
}) => {
  const { template, title, description } = data;

  const user = await currentUser();

  try {
    const playground = await db.playground.create({
      data: {
        title,
        description,
        template,
        userId: user?.id!,
      },
    });

    revalidatePath("/dashboard");

    return playground;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getPlaygroundForUser = async () => {
  const user = await currentUser();

  try {
    const playground = await db.playground.findMany({
      where: {
        userId: user?.id,
      },
      include: {
        user: true,
        Starmark: {
          where: {
            userId: user?.id,
          },
          select: {
            isMarked: true,
          },
        },
      },
    });

    return playground;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const deleteProjectById = async (id: string) => {
  try {
    await db.playground.delete({
      where: {
        id,
      },
    });

    revalidatePath("/dashboard");

    return true;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to delete project");
  }
};

export const editProjectById = async (
  id: string,
  data: {
    title: string;
    description: string;
  }
) => {
  try {
    const updatedProject = await db.playground.update({
      where: {
        id,
      },
      data: {
        title: data.title,
        description: data.description,
      },
    });

    // Update Next.js cached/server data
    revalidatePath("/dashboard");

    return updatedProject;
  } catch (error) {
    console.error("Error updating project:", error);
    throw new Error("Failed to update project");
  }
};

export const duplicateProjectById = async (id: string) => {
  try {
    const originalPlayground =
      await db.playground.findUnique({
        where: {
          id,
        },
      });

    if (!originalPlayground) {
      throw new Error("Playground not found");
    }

    const duplicatedPlayground =
      await db.playground.create({
        data: {
          title: `${originalPlayground.title} (Copy)`,
          description: originalPlayground.description,
          template: originalPlayground.template,
          userId: originalPlayground.userId,
        },
      });

    revalidatePath("/dashboard");

    return duplicatedPlayground;
  } catch (error) {
    console.error(
      "DUPLICATE PROJECT ERROR:",
      error
    );

    throw error;
  }
};

export const toggleProjectFavorite = async (playgroundId: string) => {
  const user = await currentUser();

  if (!user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const existingStar = await db.starmark.findFirst({
      where: {
        userId: user.id,
        playgroundId,
      },
    });

    if (existingStar) {
      const updatedStar = await db.starmark.update({
        where: {
          id: existingStar.id,
        },
        data: {
          isMarked: !existingStar.isMarked,
        },
      });

      revalidatePath("/dashboard");

      return updatedStar;
    }

    const newStar = await db.starmark.create({
      data: {
        userId: user.id,
        playgroundId,
        isMarked: true,
      },
    });

    revalidatePath("/dashboard");

    return newStar;
  } catch (error) {
    console.error(
      "TOGGLE FAVORITE ERROR:",
      error
    );

    throw new Error(
      "Failed to update favorite"
    );
  }
};