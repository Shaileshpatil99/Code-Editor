"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  ChevronRight,
  Search,
  Star,
  Code,
  Server,
  Globe,
  Zap,
  Clock,
  Check,
  Plus,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type TemplateSelectionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    template:
      | "REACT"
      | "NEXTJS"
      | "EXPRESS"
      | "VUE"
      | "HONO"
      | "ANGULAR"
      | "JAVA"
      | "CPP";
    description?: string;
  }) => void;
};

interface TemplateOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  popularity: number;
  tags: string[];
  features: string[];
  category: "frontend" | "backend" | "fullstack" | "language";
}

type Category =
  | "all"
  | "frontend"
  | "backend"
  | "fullstack"
  | "language";

const templates: TemplateOption[] = [
  {
    id: "react",
    name: "React",
    description:
      "A JavaScript library for building user interfaces with component-based architecture",
    icon: "/react.svg",
    color: "#61DAFB",
    popularity: 5,
    tags: ["UI", "Frontend", "JavaScript"],
    features: ["Component-Based", "Virtual DOM", "JSX Support"],
    category: "frontend",
  },

  {
    id: "nextjs",
    name: "Next.js",
    description:
      "The React framework for production with server-side rendering and static site generation",
    icon: "/nextjs-icon.svg",
    color: "#000000",
    popularity: 4,
    tags: ["React", "SSR", "Fullstack"],
    features: ["Server Components", "API Routes", "File-based Routing"],
    category: "fullstack",
  },

  {
    id: "express",
    name: "Express",
    description:
      "Fast, unopinionated, minimalist web framework for Node.js to build APIs and web applications",
    icon: "/expressjs-icon.svg",
    color: "#000000",
    popularity: 4,
    tags: ["Node.js", "API", "Backend"],
    features: ["Middleware", "Routing", "HTTP Utilities"],
    category: "backend",
  },

  {
    id: "vue",
    name: "Vue.js",
    description:
      "Progressive JavaScript framework for building user interfaces with an approachable learning curve",
    icon: "/vuejs-icon.svg",
    color: "#4FC08D",
    popularity: 4,
    tags: ["UI", "Frontend", "JavaScript"],
    features: ["Reactive Data Binding", "Component System", "Virtual DOM"],
    category: "frontend",
  },

  {
    id: "hono",
    name: "Hono",
    description:
      "Fast, lightweight, built on Web Standards. Support for any JavaScript runtime.",
    icon: "/hono.svg",
    color: "#e36002",
    popularity: 3,
    tags: ["Node.js", "TypeScript", "Backend"],
    features: [
      "Dependency Injection",
      "TypeScript Support",
      "Modular Architecture",
    ],
    category: "backend",
  },

  {
    id: "angular",
    name: "Angular",
    description:
      "Angular is a web framework that empowers developers to build fast, reliable applications.",
    icon: "/angular-2.svg",
    color: "#DD0031",
    popularity: 3,
    tags: ["Frontend", "Fullstack", "TypeScript"],
    features: [
      "Reactive Data Binding",
      "Component System",
      "Dependency Injection",
      "TypeScript Support",
    ],
    category: "fullstack",
  },

  // Java
  {
    id: "java",
    name: "Java",
    description:
      "A powerful object-oriented programming language used for applications, backend systems, and competitive programming.",
    icon: "/java1.png",
    color: "#ED8B00",
    popularity: 5,
    tags: ["Java", "OOP", "Programming"],
    features: ["Object-Oriented", "Strongly Typed", "JVM Support"],
    category: "language",
  },

  // C++
  {
    id: "cpp",
    name: "C++",
    description:
      "A high-performance programming language widely used for system programming, games, and competitive programming.",
    icon: "/cpp.jpg",
    color: "#00599C",
    popularity: 5,
    tags: ["C++", "OOP", "Programming"],
    features: ["High Performance", "Object-Oriented", "STL Support"],
    category: "language",
  },
];

const TemplateSelectionModal = ({
  isOpen,
  onClose,
  onSubmit,
}: TemplateSelectionModalProps) => {
  const [step, setStep] = useState<"select" | "configure">("select");

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(
    null
  );

  const [searchQuery, setSearchQuery] = useState("");

  const [category, setCategory] = useState<Category>("all");

  const [projectName, setProjectName] = useState("");

  // Select template
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
  };

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      template.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesCategory =
      category === "all" || template.category === category;

    return matchesSearch && matchesCategory;
  });

  // Continue to configuration
  const handleContinue = () => {
    if (selectedTemplate) {
      setStep("configure");
    }
  };

  // Create project
  const handleCreateProject = () => {
    if (!selectedTemplate) return;

    const templateMap: Record<
      string,
      | "REACT"
      | "NEXTJS"
      | "EXPRESS"
      | "VUE"
      | "HONO"
      | "ANGULAR"
      | "JAVA"
      | "CPP"
    > = {
      react: "REACT",
      nextjs: "NEXTJS",
      express: "EXPRESS",
      vue: "VUE",
      hono: "HONO",
      angular: "ANGULAR",
      java: "JAVA",
      cpp: "CPP",
    };

    const template = templates.find(
      (template) => template.id === selectedTemplate
    );

    onSubmit({
      title: projectName || `New ${template?.name} Project`,
      template: templateMap[selectedTemplate],
      description: template?.description,
    });

    onClose();

    // Reset state
    setStep("select");
    setSelectedTemplate(null);
    setProjectName("");
    setSearchQuery("");
    setCategory("all");
  };

  // Back to template selection
  const handleBack = () => {
    setStep("select");
  };

  // Render stars
  const renderStars = (count: number) => {
    return Array(5)
      .fill(0)
      .map((_, index) => (
        <Star
          key={index}
          size={14}
          className={
            index < count
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300"
          }
        />
      ));
  };

  const selectedTemplateData = templates.find(
    (template) => template.id === selectedTemplate
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();

          setStep("select");
          setSelectedTemplate(null);
          setProjectName("");
          setSearchQuery("");
          setCategory("all");
        }
      }}
    >
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        {step === "select" ? (
          <>
            {/* Header */}
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-[#e93f3f]">
                <Plus size={24} className="text-[#e93f3f]" />
                Select a Template
              </DialogTitle>

              <DialogDescription>
                Choose a template to create your new playground
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-6 py-4">
              {/* Search + Categories */}
              <div className="flex flex-col gap-4 lg:flex-row">
                {/* Search */}
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />

                  <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Categories */}
                <Tabs
                  value={category}
                  onValueChange={(value) =>
                    setCategory(value as Category)
                  }
                  className="w-full lg:w-[500px]"
                >
                  <TabsList className="flex h-10 w-full items-center gap-1 p-1">
                    <TabsTrigger
                      value="all"
                      className="flex-1 whitespace-nowrap"
                    >
                      All
                    </TabsTrigger>

                    <TabsTrigger
                      value="frontend"
                      className="flex-1 whitespace-nowrap"
                    >
                      Frontend
                    </TabsTrigger>

                    <TabsTrigger
                      value="backend"
                      className="flex-1 whitespace-nowrap"
                    >
                      Backend
                    </TabsTrigger>

                    <TabsTrigger
                      value="fullstack"
                      className="flex-1 whitespace-nowrap"
                    >
                      Fullstack
                    </TabsTrigger>

                    <TabsTrigger
                      value="language"
                      className="flex-1 whitespace-nowrap"
                    >
                      Language
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Template Cards */}
              <RadioGroup
                value={selectedTemplate || ""}
                onValueChange={handleSelectTemplate}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {filteredTemplates.length > 0 ? (
                    filteredTemplates.map((template) => (
                      <div
                        key={template.id}
                        className={`relative flex cursor-pointer rounded-lg border p-6 transition-all duration-300 hover:scale-[1.02] ${
                          selectedTemplate === template.id
                            ? "border-[#E93F3F] shadow-[0_0_0_1px_#E93F3F,0_8px_20px_rgba(233,63,63,0.15)]"
                            : "shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:border-[#E93F3F] hover:shadow-[0_8px_20px_rgba(0,0,0,0.1)]"
                        }`}
                        onClick={() =>
                          handleSelectTemplate(template.id)
                        }
                      >
                        {/* Stars */}
                        <div className="absolute right-4 top-4 flex gap-1">
                          {renderStars(template.popularity)}
                        </div>

                        {/* Selected check */}
                        {selectedTemplate === template.id && (
                          <div className="absolute left-2 top-2 rounded-full bg-[#E93F3F] p-1 text-white">
                            <Check size={14} />
                          </div>
                        )}

                        <div className="flex gap-4">
                          {/* Icon */}
                          <div
                            className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full"
                            style={{
                              backgroundColor: `${template.color}15`,
                            }}
                          >
                            <Image
                              src={template.icon || "/placeholder.svg"}
                              alt={`${template.name} icon`}
                              width={40}
                              height={40}
                              className="object-contain"
                            />
                          </div>

                          {/* Content */}
                          <div className="flex min-w-0 flex-1 flex-col">
                            <div className="mb-1 flex items-center gap-2">
                              <h3 className="text-lg font-semibold">
                                {template.name}
                              </h3>

                              {/* Category icon */}
                              <div className="flex items-center gap-1">
                                {template.category === "frontend" && (
                                  <Code
                                    size={14}
                                    className="text-blue-500"
                                  />
                                )}

                                {template.category === "backend" && (
                                  <Server
                                    size={14}
                                    className="text-green-500"
                                  />
                                )}

                                {template.category === "fullstack" && (
                                  <Globe
                                    size={14}
                                    className="text-purple-500"
                                  />
                                )}

                                {template.category === "language" && (
                                  <Code
                                    size={14}
                                    className="text-orange-500"
                                  />
                                )}
                              </div>
                            </div>

                            {/* Description */}
                            <p className="mb-3 text-sm text-muted-foreground">
                              {template.description}
                            </p>

                            {/* Tags */}
                            <div className="mt-auto flex flex-wrap gap-2">
                              {template.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-2xl border px-2 py-1 text-xs"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Radio */}
                        <RadioGroupItem
                          value={template.id}
                          id={template.id}
                          className="sr-only"
                        />
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 flex flex-col items-center justify-center p-8 text-center">
                      <Search
                        size={48}
                        className="mb-4 text-gray-300"
                      />

                      <h3 className="text-lg font-medium">
                        No templates found
                      </h3>

                      <p className="text-sm text-muted-foreground">
                        Try adjusting your search or filters
                      </p>
                    </div>
                  )}
                </div>
              </RadioGroup>
            </div>

            {/* Footer */}
            <div className="mt-4 flex justify-between gap-3 border-t pt-4">
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock size={14} className="mr-1" />

                <span>
                  Estimated setup time:{" "}
                  {selectedTemplate
                    ? "2-5 minutes"
                    : "Select a template"}
                </span>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>

                <Button
                  className="bg-[#E93F3F] hover:bg-[#d03636]"
                  disabled={!selectedTemplate}
                  onClick={handleContinue}
                >
                  Continue
                  <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Configure Header */}
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-[#e93f3f]">
                Configure Your Project
              </DialogTitle>

              <DialogDescription>
                {selectedTemplateData?.name} Project configuration
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-6 py-4">
              {/* Project Name */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="project-name">
                  Project Name
                </Label>

                <Input
                  id="project-name"
                  placeholder="my-awesome-project"
                  value={projectName}
                  onChange={(e) =>
                    setProjectName(e.target.value)
                  }
                />
              </div>

              {/* Selected Template Features */}
              <div className="rounded-lg border p-4 shadow-[0_0_0_1px_#E93F3F,0_8px_20px_rgba(233,63,63,0.15)]">
                <h3 className="mb-2 font-medium">
                  Selected Template Features
                </h3>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {selectedTemplateData?.features.map(
                    (feature) => (
                      <div
                        key={feature}
                        className="flex items-center gap-2"
                      >
                        <Zap
                          size={14}
                          className="text-[#E93F3F]"
                        />

                        <span className="text-sm">
                          {feature}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Configure Footer */}
            <div className="mt-4 flex justify-between gap-3 border-t pt-4">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>

              <Button
                className="bg-[#E93F3F] hover:bg-[#d03636]"
                onClick={handleCreateProject}
              >
                Create Project
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TemplateSelectionModal;