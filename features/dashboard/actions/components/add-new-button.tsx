"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import TemplateSelectionModal from "./template-selection-modal";
import { createPlayground } from "..";

import { Templates } from "@/lib/generated/prisma";

type TemplateData = {
  title: string;
  template: Templates;
  description?: string;
};

const AddNewButton = () => {
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = async (data: TemplateData) => {
    try {
      const res = await createPlayground(data);

      toast.success("Playground created successfully");

      setIsModalOpen(false);

      if (res?.id) {
        router.push(`/playground/${res.id}`);
      }
    } catch (error) {
      console.error("Failed to create playground:", error);
      toast.error("Failed to create playground");
    }
  };

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className="group flex cursor-pointer flex-row items-center justify-between rounded-lg border bg-muted px-6 py-6
        shadow-[0_2px_10px_rgba(0,0,0,0.08)]
        transition-all duration-300 ease-in-out
        hover:scale-[1.02] hover:border-[#E93F3F] hover:bg-background
        hover:shadow-[0_10px_30px_rgba(233,63,63,0.15)]"
      >
        {/* Left side */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            className="flex items-center justify-center bg-white
            transition-colors duration-300
            group-hover:border-[#E93F3F]
            group-hover:bg-[#fff8f8]
            group-hover:text-[#E93F3F]"
            size="icon"
          >
            <Plus
              size={30}
              className="transition-transform duration-300 group-hover:rotate-90"
            />
          </Button>

          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-[#e93f3f]">
              Add New
            </h1>

            <p className="max-w-[220px] text-sm text-muted-foreground">
              Create a new playground
            </p>
          </div>
        </div>

        {/* Right side image */}
        <div className="relative overflow-hidden">
          <Image
            src="/add-new.svg"
            alt="Create new playground"
            width={150}
            height={150}
            className="transition-transform duration-300 group-hover:scale-110"
          />
        </div>
      </div>

      <TemplateSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
};

export default AddNewButton;