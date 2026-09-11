import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import LogoutButton from "./logout-button";
import { auth } from "@/auth";

const UserButton = async () => {
  const session = await auth();
  const user = session?.user;

  return (
    <div className={cn("relative rounded-full")}>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Avatar className="cursor-pointer">
            <AvatarImage src={user?.image ?? ""} />
            <AvatarFallback>
              {user?.name?.charAt(0) ?? "U"}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="mr-4 w-60">
          <DropdownMenuItem>
            <span className="cursor-pointer">{user?.email}</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <LogoutButton>
            <DropdownMenuItem className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4 " />
              LogOut
            </DropdownMenuItem>
          </LogoutButton>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default UserButton;