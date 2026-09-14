"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Code2,
  Compass,
  FolderPlus,
  History,
  Home,
  LayoutDashboard,
  Lightbulb,
  type LucideIcon,
  Plus,
  Settings,
  Star,
  Terminal,
  Zap,
  Database,
  FlameIcon,
  Coffee,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

import Image from "next/image"

interface PlaygroundDataProps {
  id: string
  name: string
  icon: string
  starred: boolean
}

const lucideIconMap: Record<string, LucideIcon> = {
  Zap: Zap,
  Lightbulb: Lightbulb,
  Database: Database,
  Compass: Compass,
  FlameIcon: FlameIcon,
  Terminal: Terminal,
  Code2: Code2,
  Coffee: Coffee,
}

export function DashboardSidebar({
  initialPlaygroundData,
}: {
  initialPlaygroundData: PlaygroundDataProps[]
}) {
  const pathname = usePathname()

  const starredPlaygrounds = initialPlaygroundData.filter((p) => p.starred);
  const recentPlaygrounds = initialPlaygroundData;

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-3 justify-center">
          <Image src={"/logo.svg"} alt="logo" height={60} width={60} />
        </div>
      </SidebarHeader>

      <SidebarContent>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarMenu>

            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/" />}
                isActive={pathname === "/"}
                tooltip="Home"
              >
                <Home className="h-4 w-4" />
                <span>Home</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/dashboard" />}
                isActive={pathname === "/dashboard"}
                tooltip="Dashboard"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

          </SidebarMenu>
        </SidebarGroup>

        {/* Starred */}
        <SidebarGroup>
          <SidebarGroupLabel>
            <Star className="mr-2 h-4 w-4" />
            Starred
          </SidebarGroupLabel>

          <SidebarGroupAction title="Add starred playground">
            <Plus className="h-4 w-4" />
          </SidebarGroupAction>

          <SidebarGroupContent>
            <SidebarMenu>

              {starredPlaygrounds.length === 0 &&
              recentPlaygrounds.length === 0 ? (
                <div className="w-full py-4 text-center text-muted-foreground">
                  Create your playground
                </div>
              ) : (
                starredPlaygrounds.map((playground) => {
                  const IconComponent =
                    lucideIconMap[playground.icon] || Code2

                  return (
                    <SidebarMenuItem key={playground.id}>
                      <SidebarMenuButton
                        render={
                          <Link
                            href={`/playground/${playground.id}`}
                          />
                        }
                        isActive={
                          pathname ===
                          `/playground/${playground.id}`
                        }
                        tooltip={playground.name}
                      >
                        <IconComponent className="h-4 w-4" />
                        <span>{playground.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })
              )}

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Recent */}
        <SidebarGroup>
          <SidebarGroupLabel>
            <History className="mr-2 h-4 w-4" />
            Recent
          </SidebarGroupLabel>

          <SidebarGroupAction title="Create new playground">
            <FolderPlus className="h-4 w-4" />
          </SidebarGroupAction>

          <SidebarGroupContent>
            <SidebarMenu>

              {recentPlaygrounds.map((playground) => {
                const IconComponent =
                  lucideIconMap[playground.icon] || Code2

                return (
                  <SidebarMenuItem key={playground.id}>
                    <SidebarMenuButton
                      render={
                        <Link
                          href={`/playground/${playground.id}`}
                        />
                      }
                      isActive={
                        pathname ===
                        `/playground/${playground.id}`
                      }
                      tooltip={playground.name}
                    >
                      <IconComponent className="h-4 w-4" />
                      <span>{playground.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}



            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      {/* Footer */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/settings" />}
              isActive={pathname === "/settings"}
              tooltip="Settings"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}