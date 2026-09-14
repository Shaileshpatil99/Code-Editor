"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format, isValid } from "date-fns";

import { Badge } from "@/components/ui/badge";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  MoreHorizontal,
  Edit3,
  Trash2,
  ExternalLink,
  Copy,
  Eye,
  Star,
} from "lucide-react";

import { toast } from "sonner";

import { Project } from "../../types";

/* ==========================================
   TYPES
========================================== */

interface EditProjectData {
  title: string;
  description: string;
}

interface ProjectTableProps {
  projects: Project[];

  onUpdateProject?: (id: string, data: EditProjectData) => Promise<unknown>;

  onDeleteProject?: (id: string) => Promise<unknown>;

  onDuplicateProject?: (id: string) => Promise<Project | unknown>;

  onMarkasFavorite?: (id: string) => Promise<unknown>;
}

/* ==========================================
   COMPONENT
========================================== */

export default function ProjectTable({
  projects,
  onDeleteProject,
  onDuplicateProject,
  onUpdateProject,
  onMarkasFavorite,
}: ProjectTableProps) {
  const router = useRouter();

  /*
   * LOCAL STATE
   *
   * This is the important part.
   * The table renders projectList instead
   * of directly rendering projects.
   */
  const [projectList, setProjectList] = useState<Project[]>(projects);

  const [editProject, setEditProject] = useState<Project | null>(null);

  const [editData, setEditData] = useState<EditProjectData>({
    title: "",
    description: "",
  });

  const [deleteProject, setDeleteProject] = useState<Project | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const [favorites, setFavorites] = useState<Record<string, boolean>>(() => {
    const initialFavs: Record<string, boolean> = {};
    projects.forEach((p: Project & { Starmark?: { isMarked: boolean }[] }) => {
      initialFavs[p.id] = p.Starmark?.[0]?.isMarked || false;
    });
    return initialFavs;
  });

  useEffect(() => {
    queueMicrotask(() => {
      setProjectList(projects);
      const initialFavs: Record<string, boolean> = {};
      projects.forEach((p: Project & { Starmark?: { isMarked: boolean }[] }) => {
        initialFavs[p.id] = p.Starmark?.[0]?.isMarked || false;
      });
      setFavorites(initialFavs);
    });
  }, [projects]);

  /* ==========================================
     EDIT CLICK
  ========================================== */

  const handleEditClick = (project: Project) => {
    setEditProject(project);

    setEditData({
      title: project.title || "",
      description: project.description || "",
    });
  };

  /* ==========================================
     DELETE CLICK
  ========================================== */

  const handleDeleteClick = (project: Project) => {
    setDeleteProject(project);
  };

  /* ==========================================
     UPDATE PROJECT
  ========================================== */

  const handleUpdateProject = async () => {
    if (!editProject || !onUpdateProject) {
      return;
    }

    setIsLoading(true);

    try {
      const updatedProject = await onUpdateProject(editProject.id, {
        title: editData.title,
        description: editData.description,
      });

      /*
       * Immediately update the
       * project in the table.
       */
      setProjectList((prev) =>
        prev.map((project) =>
          project.id === editProject.id
            ? {
                ...project,
                ...(updatedProject as Partial<Project>),
                title: editData.title,
                description: editData.description,
              }
            : project,
        ),
      );

      setEditProject(null);

      toast.success("Project updated successfully");
    } catch (error) {
      console.error("Error updating project:", error);

      toast.error("Failed to update project");
    } finally {
      setIsLoading(false);
    }
  };

  /* ==========================================
     DELETE PROJECT
  ========================================== */

  const handleDeleteProject = async () => {
    if (!deleteProject || !onDeleteProject) {
      return;
    }

    setIsLoading(true);

    try {
      await onDeleteProject(deleteProject.id);

      /*
       * Immediately remove project
       * from the table.
       */
      setProjectList((prev) =>
        prev.filter((project) => project.id !== deleteProject.id),
      );

      setDeleteProject(null);

      toast.success("Project deleted successfully");
    } catch (error) {
      console.error("Error deleting project:", error);

      toast.error("Failed to delete project");
    } finally {
      setIsLoading(false);
    }
  };

  /* ==========================================
     DUPLICATE PROJECT
  ========================================== */

  const handleDuplicateProject = async (project: Project) => {
    if (!onDuplicateProject) {
      return;
    }

    setIsLoading(true);

    try {
      /*
       * IMPORTANT:
       * Send project.id, NOT project.
       */
      const duplicatedProject = await onDuplicateProject(project.id);

      if (duplicatedProject) {
        /*
         * Immediately add duplicated
         * project to the table.
         */
        setProjectList((prev) => [duplicatedProject as Project, ...prev]);
      }

      toast.success("Project duplicated successfully");
    } catch (error) {
      console.error("Error duplicating project:", error);

      toast.error("Failed to duplicate project");
    } finally {
      setIsLoading(false);
    }
  };

  /* ==========================================
     FAVORITE
  ========================================== */

  const handleMarkasFavorite = async (project: Project) => {
    if (!onMarkasFavorite) {
      return;
    }

    const wasFavorite = favorites[project.id] || false;

    setIsLoading(true);

    try {
      await onMarkasFavorite(project.id);

      setFavorites((prev) => ({
        ...prev,
        [project.id]: !wasFavorite,
      }));

      toast.success(
        wasFavorite
          ? "Project removed from favorites"
          : "Project marked as favorite",
      );
    } catch (error) {
      console.error("Error marking project as favorite:", error);

      toast.error("Failed to update favorite");
    } finally {
      setIsLoading(false);
    }
  };

  /* ==========================================
     COPY URL
  ========================================== */

  const copyProjectUrl = async (projectId: string) => {
    const url = `${window.location.origin}/playground/${projectId}`;

    try {
      await navigator.clipboard.writeText(url);

      toast.success("Project URL copied to clipboard");
    } catch (error) {
      console.error("Error copying project URL:", error);

      toast.error("Failed to copy project URL");
    }
  };

  /* ==========================================
     UI
  ========================================== */

  return (
    <>
      <div className="w-full flex justify-center">
        <div className="w-full max-w-3xl overflow-hidden rounded-lg border">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Project</TableHead>

                <TableHead className="w-[14%]">Template</TableHead>

                <TableHead className="w-[16%]">Created</TableHead>

                <TableHead className="w-[20%]">User</TableHead>

                <TableHead className="w-[10%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {projectList.map((project) => {
                const projectDate = project.createdAt ? new Date(project.createdAt) : null;

                const isFavorite = favorites[project.id] || false;

                const userImage = project.user?.image;

                return (
                  <TableRow key={project.id} className="hover:bg-muted/50">
                    {/* PROJECT */}

                    <TableCell className="max-w-0 py-3">
                      <div className="min-w-0 flex flex-col">
                        <Link
                          href={`/playground/${project.id}`}
                          className="hover:underline truncate"
                        >
                          <span className="font-semibold text-sm">
                            {project.title}
                          </span>
                        </Link>

                        {project.description && (
                          <span className="text-xs text-muted-foreground truncate">
                            {project.description}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* TEMPLATE */}

                    <TableCell className="py-3">
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-2 py-0.5"
                      >
                        {project.template}
                      </Badge>
                    </TableCell>

                    {/* CREATED */}

                    <TableCell className="py-3 whitespace-nowrap">
                      {projectDate && isValid(projectDate)
                        ? format(projectDate, "MMM d, yyyy")
                        : "—"}
                    </TableCell>

                    {/* USER */}

                    <TableCell className="py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {userImage && userImage.startsWith("/") ? (
                          <Image
                            src={userImage}
                            alt={project.user?.name || "User"}
                            width={28}
                            height={28}
                            className="h-7 w-7 shrink-0 rounded-full object-cover"
                          />
                        ) : userImage ? (
                          <img
                            src={userImage}
                            alt={project.user?.name || "User"}
                            width={28}
                            height={28}
                            className="h-7 w-7 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-7 w-7 shrink-0 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-semibold">
                            {(project.user?.name || "U")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}

                        <span className="text-xs truncate">
                          {project.user?.name || "User"}
                        </span>
                      </div>
                    </TableCell>

                    {/* ACTIONS */}

                    <TableCell className="py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={isLoading}
                            >
                              <MoreHorizontal className="h-4 w-4" />

                              <span className="sr-only">Open menu</span>
                            </Button>
                          }
                        />

                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/playground/${project.id}`)
                            }
                            disabled={isLoading}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Open Project
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() =>
                              window.open(`/playground/${project.id}`, "_blank")
                            }
                            disabled={isLoading}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open in New Tab
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => handleEditClick(project)}
                            disabled={isLoading}
                          >
                            <Edit3 className="mr-2 h-4 w-4" />
                            Edit Project
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => handleDuplicateProject(project)}
                            disabled={isLoading}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => copyProjectUrl(project.id)}
                            disabled={isLoading}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy URL
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => handleMarkasFavorite(project)}
                            disabled={isLoading || !onMarkasFavorite}
                          >
                            <Star
                              className={`mr-2 h-4 w-4 ${
                                isFavorite ? "fill-current" : ""
                              }`}
                            />

                            {isFavorite
                              ? "Remove Favorite"
                              : "Mark as Favorite"}
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(project)}
                            disabled={isLoading}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ==========================================
          EDIT DIALOG
      ========================================== */}

      <Dialog
        open={!!editProject}
        onOpenChange={(open) => {
          if (!open && !isLoading) {
            setEditProject(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>

            <DialogDescription>
              Update your project information.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Project Title</Label>

              <Input
                id="title"
                value={editData.title}
                onChange={(e) =>
                  setEditData((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder="Enter project title"
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>

              <Textarea
                id="description"
                value={editData.description}
                onChange={(e) =>
                  setEditData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Enter project description"
                rows={3}
                disabled={isLoading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditProject(null)}
              disabled={isLoading}
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleUpdateProject}
              disabled={isLoading || !editData.title.trim()}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==========================================
          DELETE DIALOG
      ========================================== */}

      <AlertDialog
        open={!!deleteProject}
        onOpenChange={(open) => {
          if (!open && !isLoading) {
            setDeleteProject(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>

            <AlertDialogDescription>
              Are you sure you want to delete. This will permanently delete{" "}
              <span className="text-semibold text-red-500">
                &quot;{deleteProject?.title}&quot;
              </span>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>

            <AlertDialogAction
              onClick={handleDeleteProject}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Deleting..." : "Delete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
