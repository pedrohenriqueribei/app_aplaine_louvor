"use client";

import React, { useState } from "react";
import { Camera, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

interface UserAvatarProps {
  photoURL?: string | null;
  name?: string;
  size?: AvatarSize;
  className?: string;
  imageClassName?: string;
  editable?: boolean;
  onEditClick?: () => void;
  onClick?: () => void;
  alt?: string;
  title?: string;
}

const sizeConfig: Record<
  AvatarSize,
  {
    container: string;
    text: string;
    icon: string;
    cameraButton: string;
    cameraIcon: string;
    radius: string;
  }
> = {
  xs: {
    container: "w-6 h-6",
    text: "text-[10px]",
    icon: "w-3 h-3",
    cameraButton: "w-4 h-4 -bottom-1 -right-1",
    cameraIcon: "w-2.5 h-2.5",
    radius: "rounded-lg",
  },
  sm: {
    container: "w-8 h-8",
    text: "text-xs",
    icon: "w-4 h-4",
    cameraButton: "w-5 h-5 -bottom-1 -right-1",
    cameraIcon: "w-3 h-3",
    radius: "rounded-xl",
  },
  md: {
    container: "w-10 h-10",
    text: "text-sm",
    icon: "w-5 h-5",
    cameraButton: "w-6 h-6 -bottom-1.5 -right-1.5",
    cameraIcon: "w-3.5 h-3.5",
    radius: "rounded-xl",
  },
  lg: {
    container: "w-12 h-12",
    text: "text-base",
    icon: "w-6 h-6",
    cameraButton: "w-7 h-7 -bottom-1.5 -right-1.5",
    cameraIcon: "w-4 h-4",
    radius: "rounded-2xl",
  },
  xl: {
    container: "w-16 h-16",
    text: "text-xl",
    icon: "w-8 h-8",
    cameraButton: "w-8 h-8 -bottom-2 -right-2",
    cameraIcon: "w-4 h-4",
    radius: "rounded-[1.25rem]",
  },
  "2xl": {
    container: "w-28 h-28 sm:w-32 sm:h-32",
    text: "text-3xl sm:text-4xl",
    icon: "w-14 h-14",
    cameraButton: "w-10 h-10 -bottom-2 -right-2 sm:w-11 sm:h-11 sm:-bottom-2.5 sm:-right-2.5",
    cameraIcon: "w-5 h-5 sm:w-5.5 sm:h-5.5",
    radius: "rounded-[2rem]",
  },
};

export function UserAvatar({
  photoURL,
  name,
  size = "md",
  className,
  imageClassName,
  editable = false,
  onEditClick,
  onClick,
  alt,
  title,
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const cfg = sizeConfig[size] || sizeConfig.md;

  const initial = name?.trim() ? name.trim().charAt(0).toUpperCase() : "";
  const hasPhoto = Boolean(photoURL && !imgError);

  const content = (
    <div
      onClick={onClick}
      className={cn(
        "relative shrink-0 select-none overflow-hidden flex items-center justify-center transition-all",
        cfg.container,
        cfg.radius,
        hasPhoto
          ? "bg-slate-100 dark:bg-slate-800"
          : "bg-gradient-to-br from-blue-50 to-indigo-100/90 dark:from-blue-950/70 dark:to-indigo-900/50 text-blue-800 dark:text-blue-300 font-black border border-blue-200/60 dark:border-blue-800/50 shadow-xs",
        onClick && "cursor-pointer hover:opacity-90 active:scale-95",
        className
      )}
      title={title || name || "Foto de perfil"}
    >
      {hasPhoto ? (
        <img
          src={photoURL!}
          alt={alt || name || "Foto de perfil"}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={cn(
            "w-full h-full object-cover select-none",
            imageClassName
          )}
        />
      ) : initial ? (
        <span className={cn("font-display tracking-tight font-black", cfg.text)}>
          {initial}
        </span>
      ) : (
        <UserIcon className={cn("text-blue-600/70 dark:text-blue-400/70", cfg.icon)} />
      )}

      {editable && onEditClick && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEditClick();
          }}
          aria-label="Alterar foto de perfil"
          className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity text-white backdrop-blur-[1px] cursor-pointer"
        >
          <Camera className={cfg.cameraIcon} />
        </button>
      )}
    </div>
  );

  if (editable && onEditClick) {
    return (
      <div className="relative inline-block shrink-0">
        {content}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEditClick();
          }}
          className={cn(
            "absolute z-10 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 active:scale-90 text-white shadow-lg shadow-blue-600/30 border-2 border-white dark:border-slate-900 transition-all cursor-pointer",
            cfg.cameraButton
          )}
          title="Alterar foto de perfil"
          aria-label="Alterar foto de perfil"
        >
          <Camera className={cfg.cameraIcon} />
        </button>
      </div>
    );
  }

  return content;
}
