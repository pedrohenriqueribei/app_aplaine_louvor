import React from "react";
import { cn } from "@/lib/utils";

export interface BallerinaIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  strokeWidth?: number | string;
}

/**
 * Ícone de Bailarina Clássica (Pose en pointe com perna em passé)
 */
export function BallerinaIcon({
  size = 24,
  className = "",
  strokeWidth = 2,
  ...props
}: BallerinaIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Coque / Ballet Bun */}
      <circle cx="12" cy="2.8" r="1" fill="currentColor" />

      {/* Head */}
      <circle cx="12" cy="5.4" r="1.6" />

      {/* Graceful Arms (5th position en couronne) */}
      <path d="M 8.5 8.2 C 6.8 5 9 1.8 12 1.8 C 15 1.8 17.2 5 15.5 8.2" />

      {/* Bodice / Slender Torso */}
      <path d="M 10.3 8.5 C 10.8 10 10.8 11.2 11 12" />
      <path d="M 13.7 8.5 C 13.2 10 13.2 11.2 13 12" />

      {/* Flared Tutu Skirt */}
      <path d="M 4.5 12.8 C 7 11.4 17 11.4 19.5 12.8 C 17.5 15.2 6.5 15.2 4.5 12.8 Z" />
      
      {/* Tutu Folds / Pleats */}
      <path d="M 8.5 12.4 L 8 14.6" />
      <path d="M 12 11.8 L 12 14.9" />
      <path d="M 15.5 12.4 L 16 14.6" />

      {/* Supporting Leg En Pointe */}
      <path d="M 11.5 14.8 L 11.5 22.4" />
      {/* Pointe Shoe Toe Box */}
      <path d="M 10.7 22.4 L 12.3 22.4" />

      {/* Working Leg in Passé / Retiré Pose */}
      <path d="M 12.5 14.8 L 16.2 17.4 L 12.2 18.5" />
    </svg>
  );
}

/**
 * Segundo Ícone de Bailarina (Pose Arabesque Elegante / Salto em Voo)
 */
export function BallerinaIcon2({
  size = 24,
  className = "",
  strokeWidth = 2,
  ...props
}: BallerinaIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Coque / Ballet Bun com laço sutil */}
      <circle cx="9.5" cy="3" r="1" fill="currentColor" />

      {/* Head com postura inclinada elegante */}
      <circle cx="9.5" cy="5.5" r="1.6" />

      {/* Front Graceful Arm (alongado em arabesque na direção do salto) */}
      <path d="M 11 8 C 13.8 7.2 17.2 6.5 20.8 7.5" />

      {/* Back Graceful Arm (estendido suavemente para trás) */}
      <path d="M 8 8.5 C 5.5 9 3.5 10.5 2 12" />

      {/* Bodice / Slender Torso flexionado em arabesque */}
      <path d="M 8.8 8.5 C 9.4 10.2 9.5 11.2 9.8 12" />
      <path d="M 11.4 8.5 C 11.2 10 11 11.2 10.8 12" />

      {/* Flared Tutu Skirt inclinado em movimento de voo */}
      <path d="M 4.5 12.8 C 7.5 11.2 14.5 11 17.5 13 C 15 15.4 6.5 15.2 4.5 12.8 Z" />
      
      {/* Tutu Folds */}
      <path d="M 8.5 12.3 L 8.2 14.5" />
      <path d="M 12 12 L 12.3 14.5" />

      {/* Supporting Leg En Pointe vertical */}
      <path d="M 10.2 14.8 L 10.2 22.4" />
      {/* Pointe Shoe Toe Box */}
      <path d="M 9.4 22.4 L 11 22.4" />

      {/* Back Working Leg in Arabesque Derrière elevado graciosamente */}
      <path d="M 10.8 14.8 C 13.8 15.8 17.5 15 21.5 13.8" />
      <path d="M 21.5 13.8 L 22.5 13.5" />
    </svg>
  );
}

export const BallerinaArabesqueIcon = BallerinaIcon2;

/**
 * Ícone Dueto de Bailarinas (Duas bailarinas dançando em harmonia)
 */
export function BallerinaDuetIcon({
  size = 24,
  className = "",
  strokeWidth = 2,
  ...props
}: BallerinaIconProps) {
  const numSize = typeof size === "number" ? size : 24;
  return (
    <div className={cn("inline-flex items-center justify-center -space-x-2.5", className)}>
      <BallerinaIcon size={numSize * 0.9} strokeWidth={strokeWidth} {...props} />
      <BallerinaIcon2 size={numSize * 0.88} strokeWidth={strokeWidth} {...props} />
    </div>
  );
}

export default BallerinaIcon;
